const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Browser singleton ---
// Reusing a single browser instance avoids the ~300MB+ overhead of launching
// Chromium on every request, which is the #1 cause of timeouts on low-resource hosts.
let browserInstance = null;

const CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-sync',
  '--disable-translate',
  '--metrics-recording-only',
  '--no-first-run',
  '--mute-audio',
  '--hide-scrollbars',
  '--single-process',          // critical for low-CPU environments
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--font-render-hinting=none',
  '--js-flags=--max-old-space-size=256',
];

async function getBrowser() {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  browserInstance = await puppeteer.launch({
    headless: true,
    args: CHROME_ARGS,
    protocolTimeout: 120_000,
  });
  browserInstance.on('disconnected', () => {
    browserInstance = null;
  });
  return browserInstance;
}

// --- Express setup ---
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.get('origin')}`);
  next();
});

app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('PDF Service is running');
});

app.get('/health', async (req, res) => {
  try {
    const browser = await getBrowser();
    res.status(200).json({ status: 'ok', browserConnected: browser.connected });
  } catch {
    res.status(503).json({ status: 'degraded' });
  }
});

app.post('/api/render-pdf', async (req, res) => {
  const {
    html,
    format = 'Letter',
    orientation = 'portrait',
    margin = { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    metadata = {},
  } = req.body || {};

  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'html is required and must be a string' });
  }

  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Block external resources — the HTML should be self-contained
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const type = request.resourceType();
      if (['image', 'media', 'font', 'stylesheet', 'script'].includes(type) && request.url().startsWith('http')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    if (metadata && metadata.title) {
      await page.evaluateOnNewDocument((title) => {
        document.title = title;
      }, metadata.title);
    }

    // 'domcontentloaded' is much faster than 'networkidle0' —
    // since we're rendering self-contained HTML, we don't need to wait for network.
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    const pdfBuffer = await page.pdf({
      format,
      landscape: orientation === 'landscape',
      printBackground: true,
      margin,
      timeout: 60_000,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="documento.pdf"');
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    return res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  } finally {
    // Close the PAGE, not the browser
    if (page) {
      await page.close().catch(() => {});
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (browserInstance) await browserInstance.close().catch(() => {});
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`PDF service listening on port ${PORT}`);
});
