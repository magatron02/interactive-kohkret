/**
 * Rebuild lib/geo.ts and lib/route-paths.ts, now framing the island inside its real surroundings:
 * the Chao Phraya wrapping around it, the Lat Kret canal that cut it loose, and the Pak Kret street
 * grid on the far bank. Everything is real OSM geometry on one shared projection.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DIR = process.argv[2] ?? path.join(HERE, 'osm-cache');
const GEO_OUT = process.argv[3] ?? path.join(HERE, '..', 'lib', 'geo.ts');
const ROUTES_OUT = process.argv[4] ?? path.join(HERE, '..', 'lib', 'route-paths.ts');
const WALK_GRAPH_OUT = process.argv[5] ?? path.join(HERE, '..', 'lib', 'walk-graph.ts');
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

// Places and route order come straight from lib/places.ts — the one file a human edits. Node
// strips the TypeScript natively, so there is no second copy of this list to drift out of sync.
const { PLACES: SRC_PLACES, ROUTES: SRC_ROUTES } = await import(
  pathToFileURL(path.join(HERE, '..', 'lib', 'places.ts')).href
);
const PLACES = SRC_PLACES.map((p) => [p.id, p.lat, p.lng]);
const ROUTES = Object.fromEntries(SRC_ROUTES.map((r) => [r.id, r.stops.map((s) => s.placeId)]));

/*
  A place is routable only if a walkable OSM way actually comes near its door. This has to match
  TOLERANCE_M in tests/routes.test.mjs — a stop the drawn line misses by more than the tolerance has
  to be declared unreachable at generation time, not left to snap onto a distant node that satisfies
  a looser limit here while the test's own proximity check catches it as a miss.
*/
const SNAP_LIMIT_M = 40;
const snapped = new Map();
const snapDistance = new Map();
for (const [id, lat, lon] of PLACES) {
  let best = null, bestD = Infinity;
  for (const [k, n] of nodes) {
    if (compOf.get(k) !== biggest) continue;
    const d = metres(lon, lat, n.lon, n.lat);
    if (d < bestD) { bestD = d; best = k; }
  }
  snapDistance.set(id, bestD);
  snapped.set(id, bestD <= SNAP_LIMIT_M ? best : null);
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
/** Midpoint and heading of a polyline leg, in viewBox units. Used to plant one direction arrow per
 *  leg so a route reads as travel from A to B, not just a coloured shape on the map. */
function legMidpoint(pts) {
  const seg = [];
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d);
    len += d;
  }
  if (len === 0) return null;
  let target = len / 2;
  for (let i = 0; i < seg.length; i++) {
    if (target > seg[i]) { target -= seg[i]; continue; }
    const t = seg[i] === 0 ? 0 : target / seg[i];
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    return {
      x: +(ax + (bx - ax) * t).toFixed(2),
      y: +(ay + (by - ay) * t).toFixed(2),
      angle: +((Math.atan2(by - ay, bx - ax) * 180) / Math.PI).toFixed(1),
    };
  }
  return null;
}

for (const [routeId, stops] of Object.entries(ROUTES)) {
  const coords = [];
  const arrowsRaw = []; // {x, y, angle, at: cumulative metres at this arrow's position}
  let total = 0;
  // Walk only between the stops the network can actually reach; the rest are named in the output so
  // the itinerary can tell the reader they need a boat instead of quietly dropping them.
  const unreachable = [...new Set(stops.filter((id) => !snapped.get(id)))];
  const walkable = stops.filter((id) => snapped.get(id));
  // Cumulative metres walked AT each walkable stop, before normalising to a 0..1 fraction of the
  // finished line. This is what lets a step-through UI say "reveal the line up to stop N" — the
  // fraction is measured on the real walking distance, not on point count or stop index.
  const stopMetres = [[walkable[0], 0]];
  for (let i = 0; i < walkable.length - 1; i++) {
    const nodePath = shortestPath(snapped.get(walkable[i]), snapped.get(walkable[i + 1]));
    if (!nodePath) { fallbacks++; continue; }
    for (let j = 1; j < nodePath.length; j++) {
      const a = nodes.get(nodePath[j - 1]), b = nodes.get(nodePath[j]);
      total += metres(a.lon, a.lat, b.lon, b.lat);
    }
    const legPts = [];
    for (const k of nodePath) {
      const n = nodes.get(k);
      const pt = [+X(n.lon).toFixed(2), +Y(n.lat).toFixed(2)];
      legPts.push(pt);
      const last = coords[coords.length - 1];
      if (!last || last[0] !== pt[0] || last[1] !== pt[1]) coords.push(pt);
    }
    const mid = legMidpoint(legPts);
    if (mid) arrowsRaw.push({ ...mid, at: total });
    stopMetres.push([walkable[i + 1], total]);
  }
  const stopOffsets = total > 0 ? stopMetres.map(([id, m]) => ({ placeId: id, offset: +(m / total).toFixed(4) })) : [];
  const arrows = arrowsRaw.map(({ x, y, angle, at }) => ({ x, y, angle, offset: +(at / total).toFixed(4) }));
  routeOut[routeId] = {
    d: 'M' + coords.map(([x, y]) => `${x},${y}`).join('L'),
    metres: Math.round(total),
    ...(unreachable.length ? { unreachable } : {}),
    ...(arrows.length ? { arrows } : {}),
    ...(stopOffsets.length ? { stopOffsets } : {}),
  };
  console.log(
    `route ${routeId.padEnd(10)} ${String(coords.length).padStart(4)} pts  ${(total / 1000).toFixed(2)} km  ${arrows.length} arrows` +
      (unreachable.length ? `  NOT ON THE WALKING NETWORK: ${unreachable.join(', ')}` : '')
  );
}
console.log(`straight-line fallbacks: ${fallbacks}`);
console.log('\nsnap distance, place to nearest walkable node:');
for (const [id, d] of [...snapDistance].sort((a, b) => b[1] - a[1])) {
  console.log('  ' + id.padEnd(24) + d.toFixed(0).padStart(5) + ' m');
}

// ---- emit ----
const G = [];
G.push('// GENERATED from real OpenStreetMap data — do not hand-edit. Rebuild with scripts/build-map-data.mjs.');
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
R.push('// GENERATED — do not hand-edit. Rebuild with scripts/build-map-data.mjs.');
R.push('//');
R.push('// Route lines are real walking paths, not straight hops between pins. Every walkable OSM way on');
R.push('// the island contributes an edge per consecutive coordinate pair; ways meeting at a junction share');
R.push(`// the same coordinate, and a further ${welds} pairs within ${WELD_M} m are welded to close gaps OSM leaves`);
R.push('// where ways visually meet but were never snapped. Stops snap to their nearest node and consecutive');
R.push(`// stops are joined by Dijkstra shortest path. ${fallbacks} straight-line fallbacks across all routes.`);
R.push(`// A stop further than ${SNAP_LIMIT_M} m from any walkable way is listed in \`unreachable\` rather than routed to.`);
R.push('//');
R.push('// Data © OpenStreetMap contributors, ODbL 1.0.');
R.push('');
R.push('/** `unreachable` names stops no walkable way comes within 80 m of — a boat ride, not a walk. */');
R.push('/** One heading per walked leg, at its midpoint, plus how far along the line it sits (0..1) — */');
R.push('/** lets a step-through UI reveal only the arrows for legs already walked. */');
R.push('export type RouteArrow = { x: number; y: number; angle: number; offset: number };');
R.push('/** How far along the drawn line (0..1) each stop the network can reach falls. A place visited');
R.push(" *  twice (a loop's start/end) appears twice, in walk order, so a UI can tell which visit is");
R.push(' *  which by comparing against the current progress rather than by placeId alone. */');
R.push('export type RouteStopOffset = { placeId: string; offset: number };');
R.push('export type RouteGeometry = {');
R.push('  d: string;');
R.push('  metres: number;');
R.push('  unreachable?: string[];');
R.push('  arrows?: RouteArrow[];');
R.push('  stopOffsets?: RouteStopOffset[];');
R.push('};');
R.push('');
R.push('export const ROUTE_GEOMETRY: Record<string, RouteGeometry> = {');
for (const [id, r] of Object.entries(routeOut)) {
  const extra =
    (r.unreachable ? `, unreachable: ${JSON.stringify(r.unreachable)}` : '') +
    (r.arrows ? `, arrows: ${JSON.stringify(r.arrows)}` : '') +
    (r.stopOffsets ? `, stopOffsets: ${JSON.stringify(r.stopOffsets)}` : '');
  R.push(`  ${JSON.stringify(id)}: { d: ${JSON.stringify(r.d)}, metres: ${r.metres}${extra} },`);
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

// ---- walk graph: the largest component only, shipped to the browser for on-demand A→B routing ----
// (the fixed named ROUTES above are baked at build time; this is the same graph, kept live so any two
// places can be routed between at runtime without a server.)
const idxOf = new Map();
const graphNodes = [];
for (const [k, n] of nodes) {
  if (compOf.get(k) !== biggest) continue;
  idxOf.set(k, graphNodes.length);
  graphNodes.push([+X(n.lon).toFixed(2), +Y(n.lat).toFixed(2)]);
}
const graphEdges = [];
const seenEdge = new Set();
for (const [k, n] of nodes) {
  if (compOf.get(k) !== biggest) continue;
  const a = idxOf.get(k);
  for (const e of n.edges) {
    const b = idxOf.get(e.to);
    if (b === undefined) continue;
    const edgeKey = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seenEdge.has(edgeKey)) continue;
    seenEdge.add(edgeKey);
    graphEdges.push([a, b, +e.w.toFixed(1)]);
  }
}
const W = [];
W.push('// GENERATED from real OpenStreetMap data — do not hand-edit. Rebuild with scripts/build-map-data.mjs.');
W.push('//');
W.push('// The same walkable-ways graph the fixed named routes in ROUTE_GEOMETRY are solved over, kept');
W.push('// here as plain node/edge data (in the shared MAP_VIEWBOX projection) so lib/walk-routing.ts can');
W.push('// run Dijkstra client-side between any two places, not just the six itineraries baked at build');
W.push('// time. Only the largest connected component ships — a node nothing on the island can walk to');
W.push('// from anywhere else is not routable and would only bloat the bundle.');
W.push('//');
W.push('// Data © OpenStreetMap contributors, ODbL 1.0.');
W.push('');
W.push('/** [x, y] in MAP_VIEWBOX units. */');
W.push('export const WALK_NODES: [number, number][] = [');
for (const [x, y] of graphNodes) W.push(`  [${x},${y}],`);
W.push('];');
W.push('');
W.push('/** [fromIndex, toIndex, metres] — undirected, each pair listed once. */');
W.push('export const WALK_EDGES: [number, number, number][] = [');
for (const [a, b, w] of graphEdges) W.push(`  [${a},${b},${w}],`);
W.push('];');
W.push('');
fs.writeFileSync(WALK_GRAPH_OUT, W.join('\n'));
console.log(`wrote ${WALK_GRAPH_OUT} (${(fs.statSync(WALK_GRAPH_OUT).size / 1024).toFixed(1)} KB) — ${graphNodes.length} nodes, ${graphEdges.length} edges`);
