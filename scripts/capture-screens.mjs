// Captures each live site's homepage at desktop and mobile viewports and
// writes optimized WebP to assets/shots/<project>/<project>-{desktop,mobile}.webp.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const sites = [
  { name: 'o-marina', url: 'https://o-marina.com/en' },
  { name: 'orange-bay', url: 'https://orangebayhurghada.com' },
  { name: 'aura', url: 'https://www.aurawearr.com/' },
  { name: 'graphite', url: 'https://graphite-web-silk.vercel.app/' },
  { name: 'you', url: 'https://you-website-navy.vercel.app/' },
];

const viewports = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
};

// Common consent banners and chat launchers that would otherwise cover the page.
const HIDE_CSS = `
  [id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
  [id*="onetrust" i], [class*="cc-window"], #CybotCookiebotDialog,
  [id*="intercom" i], [class*="intercom" i], [id*="crisp" i], [class*="crisp" i],
  [id*="tawk" i], [class*="tawk" i], [id*="hubspot-messages" i],
  [class*="whatsapp" i], [href*="wa.me"], iframe[title*="chat" i] {
    display: none !important;
  }
`;

// Promo popups (e.g. discount modals) that open after load.
const MODAL_CSS = `
  [role="dialog"], [aria-modal="true"], [data-state="open"][class*="overlay" i],
  [data-radix-portal], [class*="modal" i][class*="open" i] {
    display: none !important;
  }
  html, body { overflow: auto !important; }
`;

const SETTLE_MS = 4000;

const MAX_BYTES ={ desktop: 220 * 1024, mobile: 150 * 1024 };

async function encode(buffer, kind, width) {
  for (const quality of [80, 72, 64, 56, 48]) {
    const data = await sharp(buffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toBuffer();
    if (data.length <= MAX_BYTES[kind]) return data;
  }
  return sharp(buffer).resize({ width }).webp({ quality: 42 }).toBuffer();
}

async function scrollPass(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await page.keyboard.press('Escape');
  await page.addStyleTag({ content: MODAL_CSS });
  // Let hero intro animations and carousels settle before capturing.
  await page.waitForTimeout(SETTLE_MS);
}

const browser = await chromium.launch();
const failures = [];

const only = process.argv.slice(2);

for (const site of sites.filter((s) => !only.length || only.includes(s.name))) {
  const dir = join(root, 'assets', 'shots', site.name);
  await mkdir(dir, { recursive: true });

  for (const [kind, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
      colorScheme: 'light',
    });
    const page = await context.newPage();
    try {
      await page.goto(site.url, { waitUntil: 'networkidle', timeout: 45000 });
      await page.addStyleTag({ content: HIDE_CSS });
      await page.evaluate(() => document.fonts.ready);
      await scrollPass(page);
      const png = await page.screenshot({ type: 'png' });
      const width = kind === 'desktop' ? 1440 : 780;
      const data = await encode(png, kind, width);
      await writeFile(join(dir, `${site.name}-${kind}.webp`), data);
      // Smaller variant for the in-page frames; the full file feeds the lightbox.
      const small = await sharp(data)
        .resize({ width: kind === 'desktop' ? 760 : 360 })
        .webp({ quality: 72, effort: 6 })
        .toBuffer();
      await writeFile(join(dir, `${site.name}-${kind}-${kind === 'desktop' ? 760 : 360}.webp`), small);
      console.log(`${site.name}-${kind}.webp ${Math.round(data.length / 1024)}KB`);
    } catch (error) {
      failures.push(`${site.name} (${kind}): ${error.message.split('\n')[0]}`);
    } finally {
      await context.close();
    }
  }
}

await browser.close();

if (failures.length) {
  console.error('Failed:\n' + failures.join('\n'));
  process.exitCode = 1;
}
