/**
 * Order each route's stops so the walk covers them in as close to one pass as the street network
 * allows. The old orders were written by hand and doubled back over the same lanes repeatedly.
 *
 * Metric that matters here is not just total distance but REPEAT: how many metres of street get
 * walked more than once. That is what reads as a scribble on the map.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DIR = process.argv[2] ?? path.join(HERE, 'osm-cache');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const ways = read('roads-poly.json').elements;

const kx = Math.cos((13.91 * Math.PI) / 180);
const M_PER_LAT = 110574, M_PER_LON = 111320 * kx;
const metres = (aLon, aLat, bLon, bLat) => Math.hypot((bLon - aLon) * M_PER_LON, (bLat - aLat) * M_PER_LAT);

const key = (lon, lat) => `${lon.toFixed(6)},${lat.toFixed(6)}`;
const nodes = new Map();
const addNode = (lon, lat) => {
  const k = key(lon, lat);
  if (!nodes.has(k)) nodes.set(k, { lon, lat, edges: [] });
  return k;
};
const link = (a, b, w) => {
  nodes.get(a).edges.push({ to: b, w });
  nodes.get(b).edges.push({ to: a, w });
};
for (const w of ways) {
  const g = w.geometry || [];
  for (let i = 1; i < g.length; i++) {
    const a = addNode(g[i - 1].lon, g[i - 1].lat);
    const b = addNode(g[i].lon, g[i].lat);
    if (a !== b) link(a, b, metres(g[i - 1].lon, g[i - 1].lat, g[i].lon, g[i].lat));
  }
}
{
  const list = [...nodes.entries()];
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const [ka, a] = list[i], [kb, b] = list[j];
      const d = metres(a.lon, a.lat, b.lon, b.lat);
      if (d > 0 && d <= 2) link(ka, kb, d);
    }
}

// Places come straight from lib/places.ts — the one file a human edits. Node strips the TypeScript
// natively, so there is no second copy of this list to drift out of sync.
const { PLACES: SRC_PLACES, ROUTES: SRC_ROUTES } = await import(
  pathToFileURL(path.join(HERE, '..', 'lib', 'places.ts')).href
);
const PLACES = Object.fromEntries(SRC_PLACES.map((p) => [p.id, [p.lat, p.lng]]));

const snapped = new Map();
for (const [id, [lat, lon]] of Object.entries(PLACES)) {
  let best = null, bestD = Infinity;
  for (const [k, n] of nodes) {
    const d = metres(lon, lat, n.lon, n.lat);
    if (d < bestD) { bestD = d; best = k; }
  }
  snapped.set(id, best);
}

/** Dijkstra from one node to all others, returning both cost and the predecessor tree. */
function dijkstra(from) {
  const dist = new Map([[from, 0]]);
  const prev = new Map();
  const seen = new Set();
  for (;;) {
    let cur = null, curD = Infinity;
    for (const [k, d] of dist) if (!seen.has(k) && d < curD) { curD = d; cur = k; }
    if (cur === null) break;
    seen.add(cur);
    for (const e of nodes.get(cur).edges) {
      const nd = curD + e.w;
      if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, cur); }
    }
  }
  return { dist, prev };
}
const trees = new Map();
for (const id of Object.keys(PLACES)) trees.set(id, dijkstra(snapped.get(id)));
const cost = (a, b) => trees.get(a).dist.get(snapped.get(b)) ?? Infinity;
function legNodes(a, b) {
  const { prev } = trees.get(a);
  const target = snapped.get(b);
  const out = [target];
  let c = target;
  const start = snapped.get(a);
  while (c !== start) {
    const p = prev.get(c);
    if (p === undefined) return null;
    out.push(p);
    c = p;
  }
  return out.reverse();
}

/** Total distance plus metres of street walked more than once — the "scribble" measure. */
function score(order, loop) {
  const seq = loop ? [...order, order[0]] : order;
  let total = 0;
  const used = new Map();
  for (let i = 0; i < seq.length - 1; i++) {
    const p = legNodes(seq[i], seq[i + 1]);
    if (!p) return null;
    for (let j = 1; j < p.length; j++) {
      const a = nodes.get(p[j - 1]), b = nodes.get(p[j]);
      const w = metres(a.lon, a.lat, b.lon, b.lat);
      total += w;
      const ek = [p[j - 1], p[j]].sort().join('|');
      used.set(ek, (used.get(ek) || 0) + w * 1);
      // count each undirected segment; anything beyond the first pass is repeat
    }
  }
  let repeat = 0;
  const counts = new Map();
  for (let i = 0; i < seq.length - 1; i++) {
    const p = legNodes(seq[i], seq[i + 1]);
    for (let j = 1; j < p.length; j++) {
      const ek = [p[j - 1], p[j]].sort().join('|');
      const a = nodes.get(p[j - 1]), b = nodes.get(p[j]);
      const w = metres(a.lon, a.lat, b.lon, b.lat);
      const c = (counts.get(ek) || 0) + 1;
      counts.set(ek, c);
      if (c > 1) repeat += w;
    }
  }
  return { total, repeat };
}

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

/** Best order. Loop routes keep their fixed start; open routes may start anywhere. */
function optimise(stops, { loop = false, fixedStart = null } = {}) {
  const uniq = [...new Set(stops)];
  let candidates;
  if (fixedStart) {
    const rest = uniq.filter((s) => s !== fixedStart);
    candidates = permutations(rest).map((p) => [fixedStart, ...p]);
  } else {
    candidates = permutations(uniq);
  }
  let best = null;
  for (const order of candidates) {
    const s = score(order, loop);
    if (!s) continue;
    // Repeat is the thing being minimised; distance breaks ties.
    const v = s.repeat * 2 + s.total;
    if (!best || v < best.v) best = { v, order, ...s };
  }
  return best;
}

// Route membership also comes from lib/places.ts; only the loop/fixed-start hints live here, because
// they describe how to SOLVE a route rather than what is in it.
const SOLVE_HINTS = { 'full-day': { loop: true, fixedStart: 'tha-wat-poramaiyikawat' } };
const ROUTES = Object.fromEntries(
  SRC_ROUTES.map((r) => [
    r.id,
    { stops: [...new Set(r.stops.map((s) => s.placeId))], ...(SOLVE_HINTS[r.id] ?? {}) },
  ])
);

// Reversing a cycle costs nothing and lets the day read sensibly; verify that claim rather than assume it.
const CHECK_REVERSALS = {
  'full-day': ['tha-wat-poramaiyikawat','wat-poramaiyikawat','wat-pai-lom','wat-sao-thong-thong','pa-tum-pottery','wat-sala-kun','wat-chimphli-sutthawat','raan-me-rak','baan-rim-nam'],
  boat: ['wat-poramaiyikawat','tha-wat-poramaiyikawat','tha-pa-fai','baanya-homestay'],
};
for (const [id, order] of Object.entries(CHECK_REVERSALS)) {
  const loop = id === 'full-day';
  const s = score(order, loop);
  console.log(`reversed ${id}: ${(s.total/1000).toFixed(2)} km, repeat ${Math.round(s.repeat)} m`);
}

const result = {};
for (const [id, cfg] of Object.entries(ROUTES)) {
  const before = score(cfg.loop ? cfg.stops : cfg.stops, cfg.loop);
  const best = optimise(cfg.stops, cfg);
  result[id] = { order: best.order, loop: !!cfg.loop, metres: Math.round(best.total), repeat: Math.round(best.repeat) };
  const pct = (v) => ((v / best.total) * 100).toFixed(0);
  console.log(`\n${id}`);
  console.log(`  before: ${(before.total / 1000).toFixed(2)} km, repeated ${Math.round(before.repeat)} m (${((before.repeat / before.total) * 100).toFixed(0)}% of the walk)`);
  console.log(`  after : ${(best.total / 1000).toFixed(2)} km, repeated ${Math.round(best.repeat)} m (${pct(best.repeat)}%)`);
  console.log(`  order : ${best.order.join(' -> ')}${cfg.loop ? ' -> (back to start)' : ''}`);
}
fs.writeFileSync(path.join(DIR, 'route-order.json'), JSON.stringify(result, null, 1));
console.log('\nwrote route-order.json');
