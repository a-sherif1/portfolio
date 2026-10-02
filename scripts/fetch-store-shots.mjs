// Downloads App Store screenshots via the public iTunes Lookup API and
// writes them as optimized WebP to assets/shots/<project>/<project>-N.webp.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const apps = [
  { name: 'hessaty', id: '6760269880', country: 'ie', count: 5 },
  { name: 'tasesse', id: '6477544252', country: 'eg', count: 4 },
  { name: 'medking', id: '6664068510', country: 'us', count: 4 },
  { name: 'mideo', id: '6749076532', country: 'us', count: 4 },
];

const TARGET_HEIGHT = 1080;
const MAX_BYTES = 150 * 1024;

async function encode(buffer) {
  for (const quality of [80, 72, 64, 56]) {
    const out = await sharp(buffer)
      .resize({ height: TARGET_HEIGHT, withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toBuffer({ resolveWithObject: true });
    if (out.data.length <= MAX_BYTES) return out;
  }
  return sharp(buffer)
    .resize({ height: TARGET_HEIGHT })
    .webp({ quality: 50, effort: 6 })
    .toBuffer({ resolveWithObject: true });
}

const failures = [];

for (const app of apps) {
  try {
    const res = await fetch(
      `https://itunes.apple.com/lookup?id=${app.id}&country=${app.country}`,
    );
    const [result] = (await res.json()).results;
    const urls = (result?.screenshotUrls ?? []).slice(0, app.count);
    if (!urls.length) throw new Error('no screenshots in lookup result');

    const dir = join(root, 'assets', 'shots', app.name);
    await mkdir(dir, { recursive: true });

    for (const [i, url] of urls.entries()) {
      const full = url.replace(/\/[^/]+$/, '/2000x2000bb.png');
      const img = await fetch(full);
      if (!img.ok) throw new Error(`HTTP ${img.status} for ${full}`);
      const { data, info } = await encode(Buffer.from(await img.arrayBuffer()));
      const file = join(dir, `${app.name}-${i + 1}.webp`);
      await writeFile(file, data);
      console.log(`${app.name}-${i + 1}.webp ${info.width}x${info.height} ${Math.round(data.length / 1024)}KB`);
    }
  } catch (error) {
    failures.push(`${app.name}: ${error.message}`);
  }
}

if (failures.length) {
  console.error('Failed:\n' + failures.join('\n'));
  process.exitCode = 1;
}
