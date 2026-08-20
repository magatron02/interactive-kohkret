/**
 * Turn supplied artwork (light line art on a solid dark field) into a white-on-transparent PNG under
 * `public/`, cropped to the art itself.
 *
 * The output is used as a CSS **mask**, not as an image — the rules in globals.css paint
 * `currentColor` through it — so each mark takes its colour from the theme token like every SVG icon
 * here, instead of being a baked-in white PNG that would sit wrong the moment a colour changed.
 *
 *   node scripts/build-mask-asset.mjs <source> <public-name> [targetWidth]
 *
 * The two marks this repo ships, and the exact commands that produced them:
 *
 *   node scripts/build-mask-asset.mjs "<the อบต. seal artwork>"   org-seal      640
 *   node scripts/build-mask-asset.mjs "<the KOH KRET lockup>"     brand-lockup  560
 *
 * Only the derived assets are committed. Both sources are supplied artwork this repo cannot
 * synthesise, so regenerating means providing them again — which is why the commands live here rather
 * than as folklore.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [src, name, widthArg] = process.argv.slice(2);
if (!src || !fs.existsSync(src) || !name) {
  console.error('usage: node scripts/build-mask-asset.mjs <source> <public-name> [targetWidth]');
  process.exit(1);
}
const TARGET_WIDTH = Number(widthArg ?? 640);
const OUT = path.join(root, 'public', `${name}.png`);

const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const lum = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

// The field colour, sampled from the corners rather than assumed — each source is a render or a
// screengrab, so its "navy" is whatever it happens to be and a hard-coded value leaves a grey halo.
const corners = [];
for (const [cx, cy] of [[2, 2], [width - 3, 2], [2, height - 3], [width - 3, height - 3]]) {
  corners.push(lum((cy * width + cx) * channels));
}
const field = corners.reduce((a, b) => a + b, 0) / corners.length;

let peak = 0;
for (let i = 0; i < data.length; i += channels) peak = Math.max(peak, lum(i));

// Alpha is where each pixel sits between the field and the brightest ink, which keeps anti-aliased
// letterforms and fine detail instead of hard-thresholding them into jaggies. The small floor drops
// the compression noise in the flat field that would otherwise haze the corners.
const FLOOR = 0.06;
const span = peak - field;
const rgba = Buffer.alloc(width * height * 4);
for (let p = 0, i = 0; i < data.length; i += channels, p += 4) {
  let a = (lum(i) - field) / span;
  a = a < FLOOR ? 0 : Math.min(1, a);
  rgba[p] = 255;
  rgba[p + 1] = 255;
  rgba[p + 2] = 255;
  rgba[p + 3] = Math.round(a * 255);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const out = await sharp(rgba, { raw: { width, height, channels: 4 } })
  .trim({ background: { r: 255, g: 255, b: 255, alpha: 0 }, threshold: 2 })
  .resize({ width: TARGET_WIDTH, fit: 'inside', withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(`source        ${width}x${height}, field luminance ${field.toFixed(1)}, ink peak ${peak.toFixed(1)}`);
console.log(`wrote         ${path.relative(root, OUT)}  ${out.width}x${out.height}  ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
console.log(`aspect        ${(out.width / out.height).toFixed(3)}  <- the container must match this`);
