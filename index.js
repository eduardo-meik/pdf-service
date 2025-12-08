const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
    browser = await puppeteer.launch({
      headless: 'new',
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`PDF service listening on port ${PORT}`);
});
