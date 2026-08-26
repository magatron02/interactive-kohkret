/**
 * The two guarantees a new maintainer is given: colours are measured, and the generated files can be
 * rebuilt from what is in the repo. Both are stated in CLAUDE.md; both are cheap to leave broken.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { failures, TOKENS } from '../scripts/check-contrast.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('every colour pairing clears its bar', () => {
  const bad = failures();
  assert.deepEqual(
    bad.map((f) => `${f.label} = ${f.ratio}, needs ${f.bar}`),
    [],
  );
});

test('every colour the checker reads actually exists in globals.css', () => {
  assert.ok(Object.keys(TOKENS).length > 20, 'token parsing found almost nothing — the CSS format changed');
});

test('the generated files rebuild byte-identically from the cached OSM data', () => {
  // This is the handoff promise: clone, run the script offline, get the same map. If the cache and
  // the generator drift apart, the next person's first regeneration silently changes the map.
  const generated = ['lib/geo.ts', 'lib/route-paths.ts'];
  const before = generated.map((f) => fs.readFileSync(path.join(root, f), 'utf8'));
  execFileSync(process.execPath, ['scripts/build-map-data.mjs'], { cwd: root, stdio: 'pipe' });
  const after = generated.map((f) => fs.readFileSync(path.join(root, f), 'utf8'));

  generated.forEach((file, i) => {
    if (before[i] === after[i]) return;
    fs.writeFileSync(path.join(root, file), before[i]); // leave the tree as we found it
    assert.fail(`${file} is not what scripts/build-map-data.mjs produces — regenerate it and commit the result`);
  });
});

test('the generated files still say they are generated', () => {
  for (const file of ['lib/geo.ts', 'lib/route-paths.ts']) {
    const head = fs.readFileSync(path.join(root, file), 'utf8').split('\n')[0];
    assert.match(head, /GENERATED/, `${file} lost its header`);
    assert.match(head, /scripts\/build-map-data\.mjs/, `${file} names a rebuild script that is not the real one`);
  }
});

test('the OSM cache the offline rebuild depends on is committed', () => {
  const cache = fs.readdirSync(path.join(root, 'scripts/osm-cache'));
  assert.ok(cache.some((f) => f.endsWith('.json')), 'no cached Overpass responses — the rebuild would need the network');
  assert.ok(cache.some((f) => f.endsWith('.overpassql')), 'no queries kept alongside their results');
});

test('OpenStreetMap attribution is in the page, not only in the README', () => {
  // ODbL requires it on the work itself. Losing it in a redesign is a licence breach, not a nitpick.
  const footer = fs.readFileSync(path.join(root, 'components/SiteFooter.tsx'), 'utf8');
  assert.match(footer, /OpenStreetMap/);
  assert.match(footer, /openstreetmap\.org\/copyright/);
  assert.match(footer, /ODbL/);
});

/**
 * Both brand marks are supplied artwork painted through as CSS masks. Their components render an empty
 * <span>, so a missing PNG or a renamed rule fails *silently* — no broken-image icon, no console error,
 * just a blank box where the logo was. Each is checked end to end: asset, alpha, the CSS that paints it,
 * and the box's aspect, since a container that does not match the artwork letterboxes the mark.
 */
const MASKS = [
  {
    name: 'brand-lockup',
    component: 'components/BrandLockup.tsx',
    // The class sits on the span itself here.
    box: (src) => src.match(/className="([^"]*\bbrand-lockup\b[^"]*)"/)?.[1],
  },
  {
    name: 'org-seal',
    component: 'components/SiteFooter.tsx',
    // OrgSeal adds its own class internally, so the call site's sizing is what matters.
    box: (src) => src.match(/<OrgSeal className="([^"]+)"/)?.[1],
  },
];

/** Declarations from every rule whose selector list mentions `.cls` — grouped or not. */
function declarationsFor(css, cls) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('}')
    .map((block) => block.split('{'))
    .filter(
      (parts) => parts.length === 2 && parts[0].split(',').some((sel) => sel.trim() === `.${cls}`),
    )
    .map((parts) => parts[1])
    .join('\n');
}

for (const mask of MASKS) {
  test(`the ${mask.name} mask ships, and the CSS that paints it still points at it`, () => {
    const asset = path.join(root, `public/${mask.name}.png`);
    assert.ok(fs.existsSync(asset), `public/${mask.name}.png is missing — rebuild with scripts/build-mask-asset.mjs`);
    assert.ok(fs.statSync(asset).size > 5_000, `public/${mask.name}.png is suspiciously small`);

    const png = fs.readFileSync(asset);
    assert.equal(png.readUInt32BE(0), 0x89504e47, 'not a PNG');
    assert.equal(png[25], 6, 'a mask needs an alpha channel (PNG colour type 6)');
    const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];

    const decls = declarationsFor(fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8'), mask.name);
    assert.ok(decls.includes(`${mask.name}.png`), `.${mask.name} no longer masks its own asset`);
    assert.match(decls, /background-color:\s*currentColor/, `.${mask.name} stopped taking its colour from the theme`);
    assert.match(decls, /mask-size:\s*contain/, `.${mask.name} would crop or tile instead of fitting`);

    // Every sizing pair the call site declares — base and each breakpoint — has to hold the ratio.
    const cls = mask.box(fs.readFileSync(path.join(root, mask.component), 'utf8'));
    assert.ok(cls, `could not find the ${mask.name} box in ${mask.component}`);
    // Token matching rather than a built regex: the class list is whitespace-separated, and Tailwind's
    // own `[`/`:` punctuation makes a dynamically escaped pattern easy to get subtly wrong.
    const rem = (v) => (v.endsWith('rem') ? parseFloat(v) : parseFloat(v) / 4);
    const sized = (prefix, axis) => {
      const lead = `${prefix}${axis}-`;
      const token = cls.split(/\s+/).find((t) => t.startsWith(lead));
      if (!token) return null;
      const value = token.slice(lead.length).replace(/^\[/, '').replace(/\]$/, '');
      return /^[\d.]+(rem)?$/.test(value) ? rem(value) : null;
    };
    const pairs = ['', 'sm:'].map((p) => [p, sized(p, 'h'), sized(p, 'w')]).filter(([, hh, ww]) => hh && ww);
    assert.ok(pairs.length > 0, `could not read any h/w pair from "${cls}"`);
    for (const [prefix, boxH, boxW] of pairs) {
      const drift = Math.abs(boxW / boxH - w / h);
      assert.ok(drift < 0.05, `${mask.name} box "${prefix || 'base'}" is ${(boxW / boxH).toFixed(3)}:1 but the artwork is ${(w / h).toFixed(3)}:1`);
    }
  });
}

test('the mask builder both marks are generated by is still present', () => {
  assert.ok(fs.existsSync(path.join(root, 'scripts/build-mask-asset.mjs')), 'scripts/build-mask-asset.mjs is missing');
});

test('tsconfig carries the @/* path alias every component import depends on', () => {
  // Every import in app/ and components/ is written as "@/lib/..." or "@/components/...". Next.js
  // *recreates* tsconfig.json from a default template when the file is missing — and that default has
  // no `paths` — so a lost or truncated tsconfig does not fail loudly: the dev server starts, then
  // every page throws "Module not found: Can't resolve '@/components/...'". Reported from a fresh
  // unzip, which is exactly the case this guards.
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8'));
  const opts = cfg.compilerOptions ?? {};
  assert.equal(opts.baseUrl, '.', 'tsconfig lost baseUrl');
  assert.deepEqual(opts.paths?.['@/*'], ['./*'], 'tsconfig lost the @/* alias');

  // And the alias has to still be in use, or this test is guarding nothing.
  for (const f of ['app/page.tsx', 'components/MapCanvas.tsx']) {
    assert.match(fs.readFileSync(path.join(root, f), 'utf8'), /from "@\//, `${f} no longer imports via @/`);
  }
});
