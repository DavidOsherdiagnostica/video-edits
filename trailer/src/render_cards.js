// Renders the static overlays (title cards and logo) as transparent PNGs.
// Usage: node render_cards.js <outDir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const out = process.argv[2];
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const layer of ['c1', 'c2', 'c3', 'c5', 'logo']) {
    await page.goto('file://' + path.resolve(__dirname, 'overlays.html') + '?l=' + layer);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, `${layer}.png`), omitBackground: true });
  }
  await browser.close();
})();
