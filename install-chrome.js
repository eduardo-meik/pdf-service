const puppeteer = require('puppeteer');

async function main() {
  try {
    // This will resolve (and download if needed) the Chrome executable
    const executablePath = await puppeteer.executablePath();
    console.log('Chrome executable path for Puppeteer:', executablePath);
    console.log('Chrome installed or already available for Puppeteer.');
  } catch (err) {
    console.error('Failed to install Chrome for Puppeteer:', err);
    process.exit(1);
  }
}

main();
