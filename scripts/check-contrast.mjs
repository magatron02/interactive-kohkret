const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
function L(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const ratio = (a, b) => {
  const [x, y] = [L(a), L(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const r2 = (a, b) => +ratio(a, b).toFixed(2);

const BG_DEEP = '#0B1220';
const BG_PANEL = '#111C2E';
const BG_MAP = '#0E1727';
const BG_ELEV = '#16233A';
const LAND = '#152embed'; // placeholder, replaced below
const INK = '#F2F6FC';
const INK_MUTED = '#AFC0D8';
const INK_FAINT = '#8FA3C0';
const PRIMARY = '#E3714A';

const cats = {
  temple: '#F5A623',
  cafe: '#FF8A4C',
  restaurant: '#6BA5FF',
  homestay: '#35D0C0',
  craft: '#C08CFF',
  pier: '#45D07A',
};
const routes = {
  1: PRIMARY,
  2: '#F5A623',
  3: '#C08CFF',
  4: '#45D07A',
  5: '#6BA5FF',
  6: '#35D0C0',
};

const rows = [];
const check = (label, fg, bg, bar) => {
  const v = r2(fg, bg);
  rows.push({ label, fg, bg, ratio: v, bar, pass: v >= bar ? 'PASS' : 'FAIL' });
};

console.log('--- TEXT ON SURFACES (target: body 7.0, small/label 4.5) ---');
check('ink on bg-deep', INK, BG_DEEP, 7);
check('ink on bg-panel', INK, BG_PANEL, 7);
check('ink on bg-map', INK, BG_MAP, 7);
check('ink on bg-elevated', INK, BG_ELEV, 7);
check('ink-muted on bg-deep', INK_MUTED, BG_DEEP, 7);
check('ink-muted on bg-panel', INK_MUTED, BG_PANEL, 7);
check('ink-muted on bg-elevated', INK_MUTED, BG_ELEV, 7);
check('ink-faint on bg-deep', INK_FAINT, BG_DEEP, 4.5);
check('ink-faint on bg-panel', INK_FAINT, BG_PANEL, 4.5);
check('ink-faint on bg-elevated', INK_FAINT, BG_ELEV, 4.5);
check('primary on bg-deep', PRIMARY, BG_DEEP, 4.5);
check('primary on bg-panel', PRIMARY, BG_PANEL, 4.5);
check('primary on bg-map', PRIMARY, BG_MAP, 4.5);

console.log('--- CATEGORY SWATCH: dark ink ON the fill (chips/pins, target 4.5) ---');
for (const [id, hex] of Object.entries(cats)) check(`ink-on-${id}`, BG_DEEP, hex, 4.5);

console.log('--- CATEGORY SWATCH vs PANEL (non-text UI, target 3.0) ---');
for (const [id, hex] of Object.entries(cats)) check(`${id} vs panel`, hex, BG_PANEL, 3);

console.log('--- CATEGORY SWATCH vs MAP FIELD (pins on water/land, target 3.0) ---');
for (const [id, hex] of Object.entries(cats)) check(`${id} vs map`, hex, BG_MAP, 3);

console.log('--- ROUTE COLOURS: dark ink on pin (4.5) + line vs map (3.0) ---');
for (const [slot, hex] of Object.entries(routes)) {
  check(`ink-on-route-${slot}`, BG_DEEP, hex, 4.5);
  check(`route-${slot} vs map`, hex, BG_MAP, 3);
}

const fails = rows.filter((r) => r.pass === 'FAIL');
for (const r of rows) {
  console.log(
    `${r.pass === 'FAIL' ? 'XX' : 'ok'}  ${r.label.padEnd(26)} ${String(r.ratio).padStart(6)} : 1   (need ${r.bar})`
  );
}
console.log('\nTOTAL', rows.length, '| FAILURES', fails.length);
if (fails.length) {
  console.log('\nFAILING:');
  for (const f of fails) console.log(' ', f.label, f.fg, 'on', f.bg, '=', f.ratio, 'need', f.bar);
}
