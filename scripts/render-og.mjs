// Renders the 1200x630 Open Graph card (og.png) from an HTML template that
// uses the site's self-hosted fonts and the outlined monogram.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const font = async (file) =>
  `data:font/woff2;base64,${(await readFile(join(root, 'assets', 'fonts', file))).toString('base64')}`;
const monogram = await readFile(join(dirname(fileURLToPath(import.meta.url)), 'monogram.svg'), 'utf8');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: 'Playfair Display'; src: url('${await font('playfair-display-latin-400-normal.woff2')}'); }
  @font-face { font-family: 'Geist'; src: url('${await font('geist-latin-400-normal.woff2')}'); }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; padding: 72px 80px;
    display: flex; flex-direction: column; justify-content: space-between;
    background: #13241d; color: #eceae4; font-family: 'Geist', sans-serif;
  }
  .top { display: flex; justify-content: space-between; align-items: center; }
  .mark { width: 120px; color: #8cc9ab; }
  .mark svg { width: 100%; height: auto; display: block; }
  .label { font-size: 26px; font-weight: 400; color: #eceae4; }
  h1 { font-family: 'Playfair Display', serif; font-weight: 400; font-size: 120px;
    line-height: 1; letter-spacing: -0.035em; }
  p { margin-top: 28px; font-size: 32px; color: #a9b8af; }
</style></head><body>
  <div class="top"><div class="mark">${monogram}</div><span class="label">Senior Flutter Developer</span></div>
  <div><h1>Ahmed Sherif</h1><p>Architecting offline-first, modular Flutter apps.</p></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() =>
  Promise.all([
    document.fonts.load("120px 'Playfair Display'"),
    document.fonts.load('32px Geist'),
  ]),
);
await page.screenshot({ path: join(root, 'og.png') });
await browser.close();
console.log('og.png written');
