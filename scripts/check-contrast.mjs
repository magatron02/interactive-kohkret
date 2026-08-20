/**
 * Contrast gate. Reads the real design tokens out of app/globals.css rather than keeping a second
 * copy of every hex here, because a stale copy is a checker that reports on colours the app no
 * longer uses. Exits non-zero on any failure so it can gate a build or a test run.
 *
 *   node scripts/check-contrast.mjs
 *
 * Two tables:
 *   INDOOR   the WCAG ratio everyone quotes. Its +0.05 flare term assumes an office.
 *   SUNLIGHT the same pairings under veiling glare, which is where this map is actually read.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');

/** Every `--color-*: #hex;` declaration in :root, keyed without the `--color-` prefix. */
export const TOKENS = Object.fromEntries(
  [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, k, v]) => [k, v])
);

const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Contrast ratio with an explicit flare term.
 *
 * Ambient light reflecting off the glass adds the same luminance to every pixel, which lifts blacks
 * and crushes contrast. Expressed against screen peak luminance that is a single constant `k`:
 *
 *     ratio = (y_light + k) / (y_dark + k),   k = E · R / (π · L_peak)
 *
 * E = ambient illuminance (lux), R = screen reflectance, L_peak = panel peak luminance (nits).
 * WCAG's familiar 0.05 is exactly this term for indoor viewing, so the formula below is the normal
 * one — only the constant changes.
 */
export const contrast = (a, b, k = 0.05) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + k) / (lo + k);
};

/**
 * A modern phone at full brightness: L_peak 600 nits, R 4.5% (glossy glass with an AR coating).
 * Illuminance figures are the standard daylight references; Koh Kret is walked at midday.
 */
const flare = (lux, peakNits = 600, reflectance = 0.045) => (lux * reflectance) / (Math.PI * peakNits);
const SCENARIOS = [
  { id: 'indoor', label: 'indoor / WCAG baseline', k: 0.05 },
  { id: 'shade', label: 'shade under a tree  ~10k lux', k: flare(10_000) },
  { id: 'overcast', label: 'open sky, overcast  ~25k lux', k: flare(25_000) },
  { id: 'sun', label: 'direct tropical sun ~100k lux', k: flare(100_000) },
];

const t = (name) => {
  const hex = TOKENS[name];
  if (!hex) throw new Error(`no --color-${name} in app/globals.css`);
  return hex;
};

const CATS = ['temple', 'cafe', 'restaurant', 'homestay', 'craft', 'pier'];
const ROUTES = [1, 2, 3, 4, 5, 6];

/** [label, foreground, background, required ratio] — the bar each pairing has to clear indoors. */
const PAIRS = [
  ['ink on bg-deep', t('ink'), t('bg-deep'), 7],
  ['ink on bg-panel', t('ink'), t('bg-panel'), 7],
  ['ink on bg-map', t('ink'), t('bg-map'), 7],
  ['ink on bg-elevated', t('ink'), t('bg-elevated'), 7],
  ['ink-muted on bg-deep', t('ink-muted'), t('bg-deep'), 7],
  ['ink-muted on bg-panel', t('ink-muted'), t('bg-panel'), 7],
  ['ink-muted on bg-elevated', t('ink-muted'), t('bg-elevated'), 7],
  ['ink-faint on bg-deep', t('ink-faint'), t('bg-deep'), 4.5],
  ['ink-faint on bg-panel', t('ink-faint'), t('bg-panel'), 4.5],
  ['ink-faint on bg-elevated', t('ink-faint'), t('bg-elevated'), 4.5],
  ['primary on bg-deep', t('primary'), t('bg-deep'), 4.5],
  ['primary on bg-panel', t('primary'), t('bg-panel'), 4.5],
  ['primary on bg-map', t('primary'), t('bg-map'), 4.5],

  ...CATS.map((c) => [`ink-on-${c}`, t(`cat-${c}-ink`), t(`cat-${c}`), 4.5]),
  ...CATS.map((c) => [`${c} vs panel`, t(`cat-${c}`), t('bg-panel'), 3]),
  ...CATS.map((c) => [`${c} vs map`, t(`cat-${c}`), t('bg-map'), 3]),

  ...ROUTES.flatMap((n) => [
    [`ink-on-route-${n}`, t('bg-deep'), t(`route-${n}`), 4.5],
    [`route-${n} vs map`, t(`route-${n}`), t('bg-map'), 3],
  ]),

  // The map field. globals.css claims these separations by number; nothing verified them until now.
  // 1.45 is the bar that comment sets: below it a shape stops reading as its own object.
  ['island vs water', t('land'), t('water'), 1.45],
  ['island vs mainland', t('land'), t('mainland'), 1.45],
  ['coastline vs water', t('land-edge'), t('water'), 1.45],
  ['coastline vs island', t('land-edge'), t('land'), 1.45],
  ['major road vs island', t('road-major'), t('land'), 1.45],
  ['minor road vs island', t('road-minor'), t('land'), 1.45],
  ['context road vs mainland', t('context-road'), t('mainland'), 1.45],
];

const r2 = (n) => +n.toFixed(2);
const rows = PAIRS.map(([label, fg, bg, bar]) => ({
  label,
  fg,
  bg,
  bar,
  ratio: r2(contrast(fg, bg)),
  sun: Object.fromEntries(SCENARIOS.map((s) => [s.id, r2(contrast(fg, bg, s.k))])),
}));

export const failures = () => rows.filter((r) => r.ratio < r.bar);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('--- INDOOR (WCAG) ---');
  for (const r of rows) {
    const ok = r.ratio >= r.bar;
    console.log(`${ok ? 'ok' : 'XX'}  ${r.label.padEnd(26)} ${String(r.ratio).padStart(6)} : 1   (need ${r.bar})`);
  }
  const bad = failures();
  console.log(`\nTOTAL ${rows.length} | FAILURES ${bad.length}`);
  for (const f of bad) console.log(`  ${f.label}  ${f.fg} on ${f.bg} = ${f.ratio}, need ${f.bar}`);

  console.log('\n--- UNDER VEILING GLARE ---');
  console.log('600-nit phone, 4.5% reflectance. k is the flare term that replaces WCAG\'s 0.05.\n');
  for (const s of SCENARIOS) console.log(`  ${s.label.padEnd(30)} k = ${s.k.toFixed(3)}`);
  console.log('');
  const cols = SCENARIOS.map((s) => s.id);
  console.log('    ' + 'pairing'.padEnd(26) + cols.map((c) => c.padStart(9)).join(''));
  for (const r of rows) {
    console.log('    ' + r.label.padEnd(26) + cols.map((c) => String(r.sun[c]).padStart(9)).join(''));
  }

  // The ceiling: white on black, the best any palette can do under each condition.
  console.log('\n  ceiling (pure white on pure black):');
  for (const s of SCENARIOS) console.log(`    ${s.label.padEnd(30)} ${r2(contrast('#ffffff', '#000000', s.k))} : 1`);

  if (bad.length) process.exitCode = 1;
}
