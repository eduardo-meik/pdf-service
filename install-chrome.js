const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

async function main() {
  try {
    console.log('Installing Chrome for Puppeteer...');
    // Force install chrome to the configured cache directory
    execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
    
    // This will resolve the Chrome executable
    const executablePath = puppeteer.executablePath();
    console.log('Chrome executable path for Puppeteer:', executablePath);
    console.log('Chrome installed or already available for Puppeteer.');
  } catch (err) {
    console.error('Failed to install Chrome for Puppeteer:', err);
    process.exit(1);
  }
}

main();
