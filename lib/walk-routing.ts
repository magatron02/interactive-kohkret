/**
 * Client-side pathfinding over the walk graph in `lib/walk-graph.ts`, for routing between any two
 * places rather than only the six fixed itineraries baked into `lib/route-paths.ts` at build time.
 * Same graph, same Dijkstra — run in the browser instead of the generator, because the picker in
 * `components/RoutePicker.tsx` lets the visitor choose stops the build script never saw.
 *
 * Takes the graph and the metres-per-unit scale as parameters rather than importing `lib/geo`/
 * `lib/walk-graph` directly — kept dependency-free like `lib/pin-stack.ts` and `lib/frame.ts` so
 * `tests/*.test.mjs` (plain `node --test`, no bundler) can import it without the `.ts`-extension
 * resolution mismatch between plain Node ESM and this project's `tsc` config.
 */

export type WalkRoute = { path: [number, number][]; metres: number };

/** Matches SNAP_LIMIT_M in scripts/build-map-data.mjs — a point further than this from any walkable
 *  node is not reachable by foot from the network, and routing to it would draw a false line. */
const SNAP_LIMIT_M = 40;

function nearestNode(
  point: readonly [number, number],
  nodes: readonly (readonly [number, number])[],
  unitsPerMetre: number,
): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const [nx, ny] = nodes[i];
    const d = Math.hypot(point[0] - nx, point[1] - ny);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best !== null && bestD / unitsPerMetre <= SNAP_LIMIT_M ? best : null;
}

function buildAdjacency(
  nodeCount: number,
  edges: readonly (readonly [number, number, number])[],
): { to: number; w: number }[][] {
  const adjacency: { to: number; w: number }[][] = Array.from({ length: nodeCount }, () => []);
  for (const [a, b, w] of edges) {
    adjacency[a].push({ to: b, w });
    adjacency[b].push({ to: a, w });
  }
  return adjacency;
}

/** Plain Dijkstra, optionally with a set of edges (by "a-b" key, smaller index first) penalised —
 *  used to force a second run away from the first route's path rather than implementing full
 *  k-shortest-paths. */
function shortestPath(
  from: number,
  to: number,
  adjacency: { to: number; w: number }[][],
  penalise?: Set<string>,
): number[] | null {
  if (from === to) return [from];
  const dist = new Map<number, number>([[from, 0]]);
  const prev = new Map<number, number>();
  const seen = new Set<number>();
  for (;;) {
    let cur: number | null = null, curD = Infinity;
    for (const [k, d] of dist) if (!seen.has(k) && d < curD) { curD = d; cur = k; }
    if (cur === null) return null;
    if (cur === to) break;
    seen.add(cur);
    for (const e of adjacency[cur]) {
      const key = cur < e.to ? `${cur}-${e.to}` : `${e.to}-${cur}`;
      const w = penalise?.has(key) ? e.w * 8 : e.w;
      const nd = curD + w;
      if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, cur); }
    }
  }
  const p = [to];
  let c = to;
  while (c !== from) {
    const p2 = prev.get(c);
    if (p2 === undefined) return null;
    c = p2;
    p.push(c);
  }
  return p.reverse();
}

function toRoute(
  nodePath: number[],
  nodes: readonly (readonly [number, number])[],
  adjacency: { to: number; w: number }[][],
): WalkRoute {
  let metres = 0;
  for (let i = 1; i < nodePath.length; i++) {
    const edge = adjacency[nodePath[i - 1]].find((e) => e.to === nodePath[i]);
    if (edge) metres += edge.w;
  }
  return { path: nodePath.map((i) => [nodes[i][0], nodes[i][1]]), metres: Math.round(metres) };
}

/**
 * Up to two walking routes between two points on the shared map projection: the shortest, and — if a
 * genuinely different one exists — a second found by heavily penalising the first route's own edges.
 * Returns fewer than 2 if no alternate exists (a dead-end island lane often has only one way through),
 * and an empty array if either point is not on the walkable network at all (rather than a straight-line
 * lie).
 */
export function findRoutes(
  from: readonly [number, number],
  to: readonly [number, number],
  nodes: readonly (readonly [number, number])[],
  edges: readonly (readonly [number, number, number])[],
  unitsPerMetre: number,
): WalkRoute[] {
  const fromIdx = nearestNode(from, nodes, unitsPerMetre);
  const toIdx = nearestNode(to, nodes, unitsPerMetre);
  if (fromIdx === null || toIdx === null) return [];

  const adjacency = buildAdjacency(nodes.length, edges);
  const primary = shortestPath(fromIdx, toIdx, adjacency);
  if (!primary) return [];
  const routes = [toRoute(primary, nodes, adjacency)];

  const primaryEdges = new Set<string>();
  for (let i = 1; i < primary.length; i++) {
    const x = primary[i - 1], y = primary[i];
    primaryEdges.add(x < y ? `${x}-${y}` : `${y}-${x}`);
  }
  const alternate = shortestPath(fromIdx, toIdx, adjacency, primaryEdges);
  if (alternate) {
    const altEdges = new Set<string>();
    for (let i = 1; i < alternate.length; i++) {
      const x = alternate[i - 1], y = alternate[i];
      altEdges.add(x < y ? `${x}-${y}` : `${y}-${x}`);
    }
    const identical = [...altEdges].every((e) => primaryEdges.has(e));
    if (!identical) routes.push(toRoute(alternate, nodes, adjacency));
  }
  return routes;
}

/** One arrow roughly every `spacing` viewBox units along a route's path, so a long walk gets several
 *  direction hints and a short one gets at least a chance at one — mirrors the per-leg placement in
 *  scripts/build-map-data.mjs's `legMidpoint`, generalised to arbitrary spacing along a full path
 *  rather than one arrow per Dijkstra leg. */
export function routeArrows(
  path: readonly (readonly [number, number])[],
  spacing = 22,
): { x: number; y: number; angle: number }[] {
  if (path.length < 2) return [];
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    seg.push(d);
    total += d;
  }
  if (total === 0) return [];
  const arrows: { x: number; y: number; angle: number }[] = [];
  const count = Math.max(1, Math.floor(total / spacing));
  for (let n = 1; n <= count; n++) {
    let target = (total * n) / (count + 1);
    for (let i = 0; i < seg.length; i++) {
      if (target > seg[i]) { target -= seg[i]; continue; }
      const t = seg[i] === 0 ? 0 : target / seg[i];
      const [ax, ay] = path[i], [bx, by] = path[i + 1];
      arrows.push({
        x: ax + (bx - ax) * t,
        y: ay + (by - ay) * t,
        angle: (Math.atan2(by - ay, bx - ax) * 180) / Math.PI,
      });
      break;
    }
  }
  return arrows;
}

/** No walking-speed figure exists anywhere else in this codebase — 4.5 km/h (75 m/min) is a plain
 *  average adult walking pace, stated here once so every caller estimates the same way. This is an
 *  estimate, not a measurement, and callers should label it as one. */
const WALK_METRES_PER_MINUTE = 75;

export function estimateMinutes(metres: number): number {
  return Math.max(1, Math.round(metres / WALK_METRES_PER_MINUTE));
}
