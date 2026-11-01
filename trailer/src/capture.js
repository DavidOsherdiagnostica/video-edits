// Renders a time-driven HTML page (window.render(t)) to a PNG sequence.
// Usage: node capture.js <page.html> <seconds> <fps> <outDir> [transparent] [query] [subframes]
//   subframes > 1 writes f0000_s0.png ... per frame, to be averaged into motion blur (blur.py).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const [page_, seconds, fps, outDir, transparent, query, subframes] = process.argv.slice(2);
  const subs = Number(subframes || 1);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({
    args: ['--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const url = 'file://' + path.resolve(page_) + (query ? '?' + query : '');
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !window.ready || window.ready(), null, { timeout: 30000 });
  const frames = Math.round(Number(seconds) * Number(fps));
  for (let i = 0; i < frames; i++) {
    for (let s = 0; s < subs; s++) {
      // 180-degree shutter: sub-frames spread over the first half of the frame interval
      const t = (i + (subs > 1 ? 0.5 * s / subs : 0)) / Number(fps);
      await page.evaluate(t => window.render(t), t);
      const name = subs > 1 ? `f${String(i).padStart(4, '0')}_s${s}.png` : `f${String(i).padStart(4, '0')}.png`;
      await page.screenshot({ path: path.join(outDir, name), omitBackground: transparent === '1' });
    }
  }
  await browser.close();
  console.log(`${frames} frames -> ${outDir}`);
})();
