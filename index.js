const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS to allow requests from the frontend
const corsOptions = {
  origin: [
    'https://gestion.colegiowinterhill.cl',
    'http://localhost:3000',
    'http://localhost:5173' // Common local dev port
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Explicitly handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('PDF Service is running');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
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

  let browser;
  try {
    const executablePath = puppeteer.executablePath();
    if (!fs.existsSync(executablePath)) {
      console.error('Browser executable not found at:', executablePath);
      console.error('Current directory:', process.cwd());
      try {
        // List contents of the cache directory to debug
        const cacheDir = require('path').dirname(executablePath);
        console.error(`Contents of ${cacheDir}:`, fs.readdirSync(cacheDir));
      } catch (e) {
        console.error('Could not list cache directory:', e.message);
      }
    }

    // Use puppeteer.executablePath() to dynamically find the installed Chrome
    browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    const page = await browser.newPage();

    if (metadata && metadata.title) {
      await page.evaluateOnNewDocument(title => {
        document.title = title;
      }, metadata.title);
    }

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format,
      landscape: orientation === 'landscape',
      printBackground: true,
      margin,
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="documento.pdf"');
    return res.send(pdfBuffer);
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Error generating PDF:', error);
    return res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`PDF service listening on port ${PORT}`);
});
