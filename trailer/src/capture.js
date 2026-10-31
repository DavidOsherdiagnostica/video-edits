// Renders a time-driven HTML page (window.render(t)) to a PNG sequence.
// Usage: node capture.js <page.html> <seconds> <fps> <outDir> [transparent] [query]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const [page_, seconds, fps, outDir, transparent, query] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const url = 'file://' + path.resolve(page_) + (query ? '?' + query : '');
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const frames = Math.round(Number(seconds) * Number(fps));
  for (let i = 0; i < frames; i++) {
    const t = i / Number(fps);
    await page.evaluate(t => window.render(t), t);
    await page.screenshot({
      path: path.join(outDir, `f${String(i).padStart(4, '0')}.png`),
      omitBackground: transparent === '1',
    });
  }
  await browser.close();
  console.log(`${frames} frames -> ${outDir}`);
})();
