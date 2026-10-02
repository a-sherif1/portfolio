// Outlines the "AS" monogram from Playfair Display 500 italic so the favicon
// and nav mark render without depending on the web font.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const FOREST = '#1E5E47';
const IVORY = '#ECEAE4';

const buffer = await readFile(join(here, 'playfair-500-italic.ttf'));
const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

function outline(size) {
  const path = font.getPath('AS', 0, 0, size, { kerning: true });
  const box = path.getBoundingBox();
  return { d: path.toPathData(2), box };
}

// Mark-only SVG, colored by currentColor, used inline in the nav.
const mark = outline(100);
const pad = 2;
const markW = mark.box.x2 - mark.box.x1 + pad * 2;
const markH = mark.box.y2 - mark.box.y1 + pad * 2;
const markSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(mark.box.x1 - pad).toFixed(1)} ${(mark.box.y1 - pad).toFixed(1)} ${markW.toFixed(1)} ${markH.toFixed(1)}" fill="currentColor"><path d="${mark.d}"/></svg>\n`;
await writeFile(join(here, 'monogram.svg'), markSvg);

// Favicon: ivory mark centered on a forest tile.
const icon = outline(40);
const iw = icon.box.x2 - icon.box.x1;
const ih = icon.box.y2 - icon.box.y1;
const tx = (64 - iw) / 2 - icon.box.x1;
const ty = (64 - ih) / 2 - icon.box.y1;
const favicon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${FOREST}"/><path transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)})" fill="${IVORY}" d="${icon.d}"/></svg>\n`;
await writeFile(join(root, 'favicon.svg'), favicon);

// Raster fallbacks for browsers that ignore SVG icons (Safari, iOS home screen, search results).
// iOS rounds the touch icon itself, so that one is a full square.
const squareSvg = Buffer.from(favicon.replace(' rx="12"', ''));
await sharp(squareSvg, { density: 600 }).resize(180, 180).png().toFile(join(root, 'apple-touch-icon.png'));

// favicon.ico holding a single 32x32 PNG image (PNG payloads are valid in ICO since Vista).
const png32 = await sharp(Buffer.from(favicon), { density: 300 }).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6);
header.writeUInt8(32, 7);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png32.length, 14);
header.writeUInt32LE(22, 18);
await writeFile(join(root, 'favicon.ico'), Buffer.concat([header, png32]));

console.log('monogram.svg, favicon.svg/.ico, apple-touch-icon.png written', markW.toFixed(1), markH.toFixed(1));
