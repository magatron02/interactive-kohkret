/**
 * Rebuild lib/geo.ts and lib/route-paths.ts, now framing the island inside its real surroundings:
 * the Chao Phraya wrapping around it, the Lat Kret canal that cut it loose, and the Pak Kret street
 * grid on the far bank. Everything is real OSM geometry on one shared projection.
 */
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DIR = process.argv[2] ?? path.join(HERE, 'osm-cache');
const GEO_OUT = process.argv[3] ?? path.join(HERE, '..', 'lib', 'geo.ts');
const ROUTES_OUT = process.argv[4] ?? path.join(HERE, '..', 'lib', 'route-paths.ts');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));

const island = read('kohkret_osm.json')[0].geojson.coordinates[0];
const islandWays = read('roads-poly.json').elements;
const water = read('water.json').elements;
const contextRoads = read('context-roads.json').elements;

// ---- extent: the island plus a margin, so the river reads as water around land ----
const lons = island.map((p) => p[0]);
const lats = island.map((p) => p[1]);
const iLonMin = Math.min(...lons), iLonMax = Math.max(...lons);
const iLatMin = Math.min(...lats), iLatMax = Math.max(...lats);
// Asymmetric on purpose. A tall frame pushed the rest of the page off screen, and the island's own
// long axis is east-west anyway: a wide letterbox spends its margin on the river reaches that wrap
// the island left and right, which is exactly the context worth showing. Vertical margin stays tight.
const TARGET_ASPECT = 2.4;
const V_MARGIN = 0.08;
const kx = Math.cos((13.91 * Math.PI) / 180);

const latPad = (iLatMax - iLatMin) * V_MARGIN;
const latMin = iLatMin - latPad, latMax = iLatMax + latPad;
const lonSpanNeeded = (TARGET_ASPECT * (latMax - latMin)) / kx;
const lonPad = (lonSpanNeeded - (iLonMax - iLonMin)) / 2;
const lonMin = iLonMin - lonPad, lonMax = iLonMax + lonPad;

const VH = 100;
const VW = Math.round(VH * (((lonMax - lonMin) * kx) / (latMax - latMin)));
const sx = VW / (lonMax - lonMin);
const sy = VH / (latMax - latMin);
const X = (lon) => (lon - lonMin) * sx;
const Y = (lat) => (latMax - lat) * sy;

const M_PER_LAT = 110574, M_PER_LON = 111320 * kx;
const metres = (aLon, aLat, bLon, bLat) => Math.hypot((bLon - aLon) * M_PER_LON, (bLat - aLat) * M_PER_LAT);

console.log(`viewBox 0 0 ${VW} ${VH}`);
console.log(`island occupies x ${X(iLonMin).toFixed(1)}–${X(iLonMax).toFixed(1)}, y ${Y(iLatMax).toFixed(1)}–${Y(iLatMin).toFixed(1)}`);

/** Drop points that land within `min` SVG units of the previous kept point. */
function thin(points, min) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= min) out.push(p);
  }
  if (out.length < 2 && points.length >= 2) return [points[0], points[points.length - 1]];
  return out;
}
const toPath = (pts, close = false) =>
  'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + (close ? 'Z' : '');

// ---- island outline ----
const simplified = island.filter((_, i) => i % 3 === 0).map(([lo, la]) => [X(lo), Y(la)]);
function smoothClosedPath(pts) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} `;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} `;
    d += `${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} `;
    d += `${p2[0].toFixed(1)},${p2[1].toFixed(1)} `;
  }
  return d.trim() + ' Z';
}
const islandPath = smoothClosedPath(simplified);

// ---- water: closed polygons only, largest first so the two river reaches paint under the rest ----
function ringAreaM2(g) {
  let a = 0;
  for (let i = 0, j = g.length - 1; i < g.length; j = i++) {
    a += g[j].lon * M_PER_LON * (g[i].lat * M_PER_LAT) - g[i].lon * M_PER_LON * (g[j].lat * M_PER_LAT);
  }
  return Math.abs(a / 2);
}
const waterPolys = water
  .filter((e) => {
    const g = e.geometry || [];
    return g.length > 3 && g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon;
  })
  .map((e) => ({ e, area: ringAreaM2(e.geometry) }))
  .filter((x) => x.area > 20000) // 0.02 km²: keeps the river and the canal, drops farm ponds
  .sort((a, b) => b.area - a.area)
  .map((x) => toPath(thin(x.e.geometry.map((pt) => [X(pt.lon), Y(pt.lat)]), 0.25), true));
console.log(`water polygons kept: ${waterPolys.length}`);

// ---- island ways ----
const major = [], minor = [], piers = [];
for (const w of islandWays) {
  const g = w.geometry || [];
  if (g.length < 2) continue;
  const t = w.tags || {};
  const pts = g.map((pt) => [X(pt.lon), Y(pt.lat)]);
  const d = toPath(pts);
  const h = t.highway;
  if (t.man_made === 'pier') piers.push(d);
  else if (h === 'cycleway' || h === 'service') major.push(d);
  else minor.push(d);
}

// ---- mainland context: the far bank, thinned hard because it is texture, not information ----
const islandWayIds = new Set(islandWays.map((w) => w.id));
const context = [];
for (const w of contextRoads) {
  if (islandWayIds.has(w.id)) continue;
  if (w.tags?.highway === 'service') continue; // driveways: pure noise at this scale
  const g = w.geometry || [];
  if (g.length < 2) continue;
  const pts = thin(g.map((pt) => [X(pt.lon), Y(pt.lat)]), 0.45);
  if (pts.length < 2) continue;
  context.push(toPath(pts));
}
console.log(`island ways: major ${major.length}, minor ${minor.length}, piers ${piers.length}`);
console.log(`context ways: ${context.length} (${JSON.stringify(context).length} bytes)`);

// ---- routing graph over the island ways (unchanged logic, new projection) ----
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
for (const w of islandWays) {
  const g = w.geometry || [];
  for (let i = 1; i < g.length; i++) {
    const a = addNode(g[i - 1].lon, g[i - 1].lat);
    const b = addNode(g[i].lon, g[i].lat);
    if (a !== b) link(a, b, metres(g[i - 1].lon, g[i - 1].lat, g[i].lon, g[i].lat));
  }
}
const WELD_M = 2;
let welds = 0;
{
  const list = [...nodes.entries()];
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const [ka, a] = list[i], [kb, b] = list[j];
      const d = metres(a.lon, a.lat, b.lon, b.lat);
      if (d > 0 && d <= WELD_M) { link(ka, kb, d); welds++; }
    }
}
const compOf = new Map();
let compCount = 0;
const compSize = [];
for (const start of nodes.keys()) {
  if (compOf.has(start)) continue;
  const id = compCount++;
  let size = 0;
  const stack = [start];
  compOf.set(start, id);
  while (stack.length) {
    const cur = stack.pop();
    size++;
    for (const e of nodes.get(cur).edges) if (!compOf.has(e.to)) { compOf.set(e.to, id); stack.push(e.to); }
  }
  compSize[id] = size;
}
const biggest = compSize.indexOf(Math.max(...compSize));
console.log(`graph: ${nodes.size} nodes, ${welds} welds -> ${compCount} component(s), largest ${compSize[biggest]}`);

const PLACES = [
  ['wat-pai-lom', 13.91268, 100.48581], ['wat-poramaiyikawat', 13.91271, 100.48999],
  ['wat-sao-thong-thong', 13.91374, 100.48297], ['wat-chan', 13.91297, 100.47367],
  ['wat-sala-kun', 13.90642, 100.48316], ['wat-chimphli-sutthawat', 13.90627, 100.48983],
  ['hom-fung-pang-nom', 13.91338, 100.4871], ['baan-rim-nam-home-cafe', 13.91135, 100.49097],
  ['raan-me-rak', 13.91101, 100.49103], ['riva-eatery-bar', 13.91162, 100.46739],
  ['baan-rim-nam', 13.91114, 100.49102], ['delicious-thai-food', 13.91049, 100.49096],
  ['baanya-homestay', 13.9027, 100.48945], ['pa-tum-pottery', 13.9131, 100.48525],
  ['tha-wat-poramaiyikawat', 13.91269, 100.49069], ['tha-pa-fai', 13.90466, 100.49031],
  ['rangnok-cafe', 13.916073, 100.4772542], ['tiao-ing-nam', 13.9132835, 100.4881363],
  ['rorsor-127', 13.9114663, 100.4674511],
];
const ROUTES = {
  'full-day': ['tha-wat-poramaiyikawat','wat-poramaiyikawat','wat-pai-lom','wat-sao-thong-thong','pa-tum-pottery','wat-sala-kun','wat-chimphli-sutthawat','raan-me-rak','baan-rim-nam','tha-wat-poramaiyikawat'],
  temple: ['wat-chan','wat-sao-thong-thong','wat-pai-lom','wat-poramaiyikawat','wat-chimphli-sutthawat','wat-sala-kun'],
  cafe: ['rangnok-cafe','hom-fung-pang-nom','baan-rim-nam-home-cafe','raan-me-rak'],
  food: ['rorsor-127','riva-eatery-bar','tiao-ing-nam','baan-rim-nam','delicious-thai-food'],
  pottery: ['wat-pai-lom','pa-tum-pottery','wat-poramaiyikawat'],
  boat: ['wat-poramaiyikawat','tha-wat-poramaiyikawat','tha-pa-fai','baanya-homestay'],
};

const snapped = new Map();
for (const [id, lat, lon] of PLACES) {
  let best = null, bestD = Infinity;
  for (const [k, n] of nodes) {
    if (compOf.get(k) !== biggest) continue;
    const d = metres(lon, lat, n.lon, n.lat);
    if (d < bestD) { bestD = d; best = k; }
  }
  snapped.set(id, best);
}

function shortestPath(from, to) {
  if (from === to) return [from];
  const dist = new Map([[from, 0]]);
  const prev = new Map();
  const seen = new Set();
  for (;;) {
    let cur = null, curD = Infinity;
    for (const [k, d] of dist) if (!seen.has(k) && d < curD) { curD = d; cur = k; }
    if (cur === null) return null;
    if (cur === to) break;
    seen.add(cur);
    for (const e of nodes.get(cur).edges) {
      const nd = curD + e.w;
      if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, cur); }
    }
  }
  const p = [to];
  let c = to;
  while (c !== from) { c = prev.get(c); p.push(c); }
  return p.reverse();
}

const routeOut = {};
let fallbacks = 0;
for (const [routeId, stops] of Object.entries(ROUTES)) {
  const coords = [];
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const nodePath = shortestPath(snapped.get(stops[i]), snapped.get(stops[i + 1]));
    if (!nodePath) { fallbacks++; continue; }
    for (let j = 1; j < nodePath.length; j++) {
      const a = nodes.get(nodePath[j - 1]), b = nodes.get(nodePath[j]);
      total += metres(a.lon, a.lat, b.lon, b.lat);
    }
    for (const k of nodePath) {
      const n = nodes.get(k);
      const pt = [+X(n.lon).toFixed(2), +Y(n.lat).toFixed(2)];
      const last = coords[coords.length - 1];
      if (!last || last[0] !== pt[0] || last[1] !== pt[1]) coords.push(pt);
    }
  }
  routeOut[routeId] = { d: 'M' + coords.map(([x, y]) => `${x},${y}`).join('L'), metres: Math.round(total) };
  console.log(`route ${routeId.padEnd(10)} ${String(coords.length).padStart(4)} pts  ${(total / 1000).toFixed(2)} km`);
}
console.log(`straight-line fallbacks: ${fallbacks}`);

// ---- emit ----
const G = [];
G.push('// GENERATED from real OpenStreetMap data — do not hand-edit. Rebuild with scratchpad/rebuild-v2.mjs.');
G.push('//');
G.push('// The frame is the island plus a 20% margin, so the Chao Phraya wrapping around it and the');
G.push('// Pak Kret bank opposite are both visible: Koh Kret only reads as an island if you can see the');
G.push('// water that made it one. Everything here shares one equirectangular projection, scaled by');
G.push('// cos(13.91°) so the island keeps its true ground aspect.');
G.push('//');
G.push('//   coastline : OSM Nominatim boundary polygon (way/881076715), smoothed with Catmull-Rom.');
G.push('//   water     : natural=water polygons over 0.02 km² — the two river reaches and the Lat Kret canal.');
G.push('//   island    : Overpass ways filtered by the coastline polygon, not a bbox.');
G.push('//   context   : mainland highways, thinned hard. Texture, never information.');
G.push('//');
G.push('// Data © OpenStreetMap contributors, ODbL 1.0 — https://www.openstreetmap.org/copyright');
G.push('');
G.push(`export const MAP_VIEWBOX = { width: ${VW}, height: ${VH} } as const;`);
G.push('');
G.push('/**');
G.push(' * The single projection everything on the map shares. Places store only their real lat/lng and');
G.push(' * are projected here, so a pin can never drift out of step with the geometry around it.');
G.push(' */');
G.push('export const PROJECTION = {');
G.push(`  lonMin: ${lonMin},`);
G.push(`  latMax: ${latMax},`);
G.push(`  sx: ${sx},`);
G.push(`  sy: ${sy},`);
G.push('} as const;');
G.push('');
G.push('export function project(lat: number, lng: number): { x: number; y: number } {');
G.push('  return {');
G.push('    x: (lng - PROJECTION.lonMin) * PROJECTION.sx,');
G.push('    y: (PROJECTION.latMax - lat) * PROJECTION.sy,');
G.push('  };');
G.push('}');
G.push('');
G.push(`export const ISLAND_PATH =\n  ${JSON.stringify(islandPath)};`);
G.push('');
G.push('/** River and canal surfaces, largest first. */');
G.push('export const WATER: string[] = [');
for (const d of waterPolys) G.push(`  ${JSON.stringify(d)},`);
G.push('];');
G.push('');
G.push('/** Lanes wide enough for a vehicle: highway=service and highway=cycleway. */');
G.push('export const ROADS_MAJOR: string[] = [');
for (const d of major) G.push(`  ${JSON.stringify(d)},`);
G.push('];');
G.push('');
G.push('/** highway=path and highway=footway — the walking network the island actually runs on. */');
G.push('export const ROADS_MINOR: string[] = [');
for (const d of minor) G.push(`  ${JSON.stringify(d)},`);
G.push('];');
G.push('');
G.push('/** man_made=pier — jetties over the water, drawn outside the coastline clip. */');
G.push('export const PIERS: string[] = [');
for (const d of piers) G.push(`  ${JSON.stringify(d)},`);
G.push('];');
G.push('');
G.push('/** Pak Kret across the water. Deliberately faint: it is context, and nothing is encoded in it. */');
G.push('export const CONTEXT_ROADS: string[] = [');
for (const d of context) G.push(`  ${JSON.stringify(d)},`);
G.push('];');
G.push('');
fs.writeFileSync(GEO_OUT, G.join('\n'));

const R = [];
R.push('// GENERATED — do not hand-edit. Rebuild with scratchpad/rebuild-v2.mjs.');
R.push('//');
R.push('// Route lines are real walking paths, not straight hops between pins. Every walkable OSM way on');
R.push('// the island contributes an edge per consecutive coordinate pair; ways meeting at a junction share');
R.push(`// the same coordinate, and a further ${welds} pairs within ${WELD_M} m are welded to close gaps OSM leaves`);
R.push('// where ways visually meet but were never snapped. Stops snap to their nearest node and consecutive');
R.push(`// stops are joined by Dijkstra shortest path. ${fallbacks} straight-line fallbacks across all routes.`);
R.push('//');
R.push('// Data © OpenStreetMap contributors, ODbL 1.0.');
R.push('');
R.push('export type RouteGeometry = { d: string; metres: number };');
R.push('');
R.push('export const ROUTE_GEOMETRY: Record<string, RouteGeometry> = {');
for (const [id, r] of Object.entries(routeOut)) {
  R.push(`  ${JSON.stringify(id)}: { d: ${JSON.stringify(r.d)}, metres: ${r.metres} },`);
}
R.push('};');
R.push('');
R.push('/** "5.7 กม." — the real walking length of a route, for display next to its duration. */');
R.push('export function formatDistance(metres: number): string {');
R.push('  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} กม.` : `${metres} ม.`;');
R.push('}');
R.push('');
fs.writeFileSync(ROUTES_OUT, R.join('\n'));

console.log(`\nwrote ${GEO_OUT} (${(fs.statSync(GEO_OUT).size / 1024).toFixed(1)} KB)`);
console.log(`wrote ${ROUTES_OUT} (${(fs.statSync(ROUTES_OUT).size / 1024).toFixed(1)} KB)`);
