/**
 * Route geometry. The defect these exist for: route lines that hopped in straight diagonals from pin
 * to pin instead of following the lanes. A straight hop still "connects the stops", so the test that
 * catches it has to compare the drawn length against the straight-line length and check that the line
 * actually passes through each stop.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { ROUTES, PLACES, getPlace, metresBetween } from '../lib/places.ts';
import { ROUTE_GEOMETRY, formatDistance } from '../lib/route-paths.ts';
import { project, PROJECTION } from '../lib/geo.ts';

/** viewBox units back to metres, using the projection's own latitude scale. */
const UNITS_PER_METRE = PROJECTION.sy / 111_320;
const toMetres = (units) => units / UNITS_PER_METRE;

const points = (d) =>
  d
    .slice(1)
    .split(/[ML]/)
    .filter(Boolean)
    .map((p) => {
      const [x, y] = p.split(',').map(Number);
      return { x, y };
    });

const nearestOnPath = (pts, x, y) => Math.min(...pts.map((p) => Math.hypot(p.x - x, p.y - y)));

test('every route has geometry', () => {
  for (const route of ROUTES) {
    assert.ok(ROUTE_GEOMETRY[route.id], `route ${route.id} has no drawn path`);
  }
});

test('no orphan geometry for routes that no longer exist', () => {
  const live = new Set(ROUTES.map((r) => r.id));
  for (const id of Object.keys(ROUTE_GEOMETRY)) {
    assert.ok(live.has(id), `ROUTE_GEOMETRY has "${id}" but no such route is offered`);
  }
});

test('every path is a well-formed polyline of at least a few points', () => {
  for (const route of ROUTES) {
    const { d } = ROUTE_GEOMETRY[route.id];
    assert.match(d, /^M[\d.]+,[\d.]+/, `route ${route.id} path does not start with a moveto`);
    assert.equal(d.match(/M/g).length, 1, `route ${route.id} path is broken into disconnected segments`);
    const pts = points(d);
    assert.ok(pts.length >= route.stops.length, `route ${route.id} has fewer path points than stops`);
    for (const p of pts) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `route ${route.id} has a NaN coordinate`);
    }
  }
});

/** The stops a route actually walks between — everything the geometry did not declare boat-only. */
const walkableStops = (route) => {
  const byBoat = new Set(ROUTE_GEOMETRY[route.id].unreachable ?? []);
  return route.stops.filter((s) => !byBoat.has(s.placeId));
};

test('the drawn line passes through every stop it claims to walk to', () => {
  // 40 m: a lane's own width plus the snap from a place's front door to the nearest OSM node.
  // A stop the line misses by more than that has to be declared unreachable, not quietly skipped —
  // that silent skip is exactly what made the food route advertise a 2.9 km walk past two
  // restaurants it never went near.
  const TOLERANCE_M = 40;
  for (const route of ROUTES) {
    const pts = points(ROUTE_GEOMETRY[route.id].d);
    for (const stop of walkableStops(route)) {
      const place = getPlace(stop.placeId);
      const { x, y } = project(place.lat, place.lng);
      const off = toMetres(nearestOnPath(pts, x, y));
      assert.ok(off <= TOLERANCE_M, `route ${route.id} never comes closer than ${off.toFixed(0)} m to ${place.name}`);
    }
  }
});

test('a stop declared unreachable really is off the walking network', () => {
  // The escape hatch must not become a way to hide a routing bug. An unreachable stop has to be
  // genuinely far from the line; anything the network could have reached should have been routed.
  for (const route of ROUTES) {
    const pts = points(ROUTE_GEOMETRY[route.id].d);
    for (const id of ROUTE_GEOMETRY[route.id].unreachable ?? []) {
      const place = getPlace(id);
      assert.ok(place, `route ${route.id} declares unknown place "${id}" unreachable`);
      assert.ok(
        route.stops.some((s) => s.placeId === id),
        `route ${route.id} declares "${id}" unreachable but never visits it`,
      );
      const { x, y } = project(place.lat, place.lng);
      assert.ok(toMetres(nearestOnPath(pts, x, y)) > 80, `${place.name} is close to the line but marked unreachable`);
    }
  }
});

test('routes follow streets rather than hopping in straight lines', () => {
  // A street-following path is always longer than the straight-line sum, because lanes bend and the
  // island has no diagonal shortcuts. Equality would mean the solver fell back to drawing hops.
  for (const route of ROUTES) {
    const stops = walkableStops(route);
    if (stops.length < 2) continue;
    const crow = stops
      .slice(1)
      .reduce((sum, stop, i) => sum + metresBetween(getPlace(stops[i].placeId), getPlace(stop.placeId)), 0);
    const walked = ROUTE_GEOMETRY[route.id].metres;
    assert.ok(walked > crow * 1.05, `route ${route.id} walks ${walked} m for ${crow.toFixed(0)} m of crow-flight — that is a straight-line fallback`);
    // Ten times the crow-flight distance would mean the shortest path is wandering the whole island.
    assert.ok(walked < crow * 10, `route ${route.id} walks ${walked} m for ${crow.toFixed(0)} m of crow-flight — implausibly long`);
  }
});

test('a route that walks nowhere does not advertise a walking distance', () => {
  for (const route of ROUTES) {
    if (walkableStops(route).length >= 2) continue;
    assert.equal(ROUTE_GEOMETRY[route.id].metres, 0, `route ${route.id} has under two walkable stops but reports a walk`);
  }
});

test('walking distances are plausible for an island 2 km across', () => {
  for (const route of ROUTES) {
    const { metres } = ROUTE_GEOMETRY[route.id];
    assert.ok(Number.isInteger(metres) && metres > 0, `route ${route.id} has distance ${metres}`);
    assert.ok(metres < 20_000, `route ${route.id} claims a ${metres} m walk on a 2 km island`);
  }
});

test('the path length matches the distance the route advertises', () => {
  for (const route of ROUTES) {
    const { d, metres } = ROUTE_GEOMETRY[route.id];
    const pts = points(d);
    let sum = 0;
    for (let i = 1; i < pts.length; i++) sum += toMetres(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    // Within 2%: the generator measures on the sphere, this measures the projected polyline.
    assert.ok(Math.abs(sum - metres) / metres < 0.02, `route ${route.id} draws ${sum.toFixed(0)} m but reports ${metres} m`);
  }
});

test('a loop route returns to where it started', () => {
  for (const route of ROUTES) {
    if (route.stops[0].placeId !== route.stops.at(-1).placeId) continue;
    const pts = points(ROUTE_GEOMETRY[route.id].d);
    const gap = toMetres(Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y));
    assert.ok(gap < 40, `route ${route.id} starts and ends at the same place but its line ends ${gap.toFixed(0)} m away`);
  }
});

test('formatDistance switches to kilometres at 1000 m', () => {
  assert.equal(formatDistance(736), '736 ม.');
  assert.equal(formatDistance(999), '999 ม.');
  assert.equal(formatDistance(1000), '1.0 กม.');
  assert.equal(formatDistance(5561), '5.6 กม.');
});

test('every place a route visits is one the map can show', () => {
  const known = new Set(PLACES.map((p) => p.id));
  for (const route of ROUTES) {
    for (const stop of route.stops) assert.ok(known.has(stop.placeId), `${route.id} visits ${stop.placeId}`);
  }
});

/** Shortest distance from a point to a polyline — the arrow sits on a segment, not necessarily on
 *  one of its vertices, so distance-to-nearest-vertex over-reports how far off the line it is. */
function distanceToPolyline(pts, x, y) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1].x, ay = pts[i - 1].y, bx = pts[i].x, by = pts[i].y;
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return best;
}

test('every route has at least one direction arrow, at a point actually on its line', () => {
  for (const route of ROUTES) {
    const geo = ROUTE_GEOMETRY[route.id];
    if (walkableStops(route).length < 2) continue; // nothing to walk, nothing to point along
    assert.ok(geo.arrows?.length > 0, `route ${route.id} has a walked line but no direction arrows`);
    const pts = points(geo.d);
    for (const a of geo.arrows) {
      assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.angle), `route ${route.id} has a malformed arrow`);
      const off = distanceToPolyline(pts, a.x, a.y);
      assert.ok(off < 0.1, `route ${route.id} has an arrow ${off.toFixed(3)} viewBox units off its own line`);
    }
  }
});

test('a route with no walked legs has no arrows', () => {
  for (const route of ROUTES) {
    if (walkableStops(route).length >= 2) continue;
    assert.ok(!ROUTE_GEOMETRY[route.id].arrows?.length, `route ${route.id} walks nowhere but has arrows`);
  }
});

test('stopOffsets exists exactly when there is a line to place it on, one entry per walkable stop', () => {
  for (const route of ROUTES) {
    const geo = ROUTE_GEOMETRY[route.id];
    const walkable = walkableStops(route);
    if (walkable.length < 2) {
      assert.ok(!geo.stopOffsets?.length, `route ${route.id} walks nowhere but has stopOffsets`);
      continue;
    }
    assert.equal(geo.stopOffsets.length, walkable.length, `route ${route.id} has ${geo.stopOffsets.length} offsets for ${walkable.length} walkable stops`);
    geo.stopOffsets.forEach((o, i) => {
      assert.equal(o.placeId, walkable[i].placeId, `route ${route.id} offset ${i} is for the wrong stop`);
    });
  }
});

test('stopOffsets runs 0 to 1 without going backwards', () => {
  for (const route of ROUTES) {
    const offsets = ROUTE_GEOMETRY[route.id].stopOffsets;
    if (!offsets?.length) continue;
    assert.equal(offsets[0].offset, 0, `route ${route.id} does not start its line at offset 0`);
    assert.equal(offsets.at(-1).offset, 1, `route ${route.id} does not end its line at offset 1`);
    for (let i = 1; i < offsets.length; i++) {
      assert.ok(offsets[i].offset >= offsets[i - 1].offset, `route ${route.id} offset goes backwards at stop ${i}`);
    }
  }
});

test('a repeated stop (a loop closing on itself) keeps both its offsets, in order', () => {
  // The day trip starts and ends at the same pier. A step-through UI has to tell those two visits
  // apart by where they fall in `stopOffsets`, since they share a placeId.
  for (const route of ROUTES) {
    const walkable = walkableStops(route);
    if (walkable[0]?.placeId !== walkable.at(-1)?.placeId || walkable.length < 2) continue;
    const offsets = ROUTE_GEOMETRY[route.id].stopOffsets;
    const first = offsets.filter((o) => o.placeId === walkable[0].placeId);
    assert.equal(first.length, 2, `route ${route.id} loops on ${walkable[0].placeId} but does not carry two offsets for it`);
    assert.equal(first[0].offset, 0);
    assert.equal(first[1].offset, 1);
  }
});

test('every arrow falls between the two stop offsets of the leg it belongs to', () => {
  for (const route of ROUTES) {
    const offsets = ROUTE_GEOMETRY[route.id].stopOffsets;
    const arrows = ROUTE_GEOMETRY[route.id].arrows;
    if (!offsets?.length || !arrows?.length) continue;
    assert.equal(arrows.length, offsets.length - 1, `route ${route.id} has ${arrows.length} arrows for ${offsets.length - 1} legs`);
    arrows.forEach((a, i) => {
      assert.ok(a.offset >= 0 && a.offset <= 1, `route ${route.id} arrow ${i} offset ${a.offset} is out of range`);
      assert.ok(a.offset >= offsets[i].offset && a.offset <= offsets[i + 1].offset, `route ${route.id} arrow ${i} sits outside its own leg`);
    });
  }
});
