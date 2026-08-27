/**
 * lib/walk-routing.ts runs the same Dijkstra as scripts/build-map-data.mjs, but at runtime over any
 * two places instead of only the six itineraries baked into ROUTE_GEOMETRY. These tests are the same
 * shape as tests/routes.test.mjs's checks on the build-time routes — a runtime router earns no less
 * scrutiny than a build-time one.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { findRoutes, estimateMinutes } from '../lib/walk-routing.ts';
import { getPlace } from '../lib/places.ts';
import { project, PROJECTION } from '../lib/geo.ts';
import { WALK_NODES, WALK_EDGES } from '../lib/walk-graph.ts';

const UNITS_PER_METRE = PROJECTION.sy / 111_320;
const routesBetween = (aId, bId) => {
  const a = project(getPlace(aId).lat, getPlace(aId).lng);
  const b = project(getPlace(bId).lat, getPlace(bId).lng);
  return findRoutes([a.x, a.y], [b.x, b.y], WALK_NODES, WALK_EDGES, UNITS_PER_METRE);
};

test('two nearby island places resolve to a real, non-trivial walking route', () => {
  const routes = routesBetween('wat-poramaiyikawat', 'wat-pai-lom');
  assert.ok(routes.length >= 1, 'expected at least one route between two on-network temples');
  const primary = routes[0];
  assert.ok(primary.metres > 0, 'route between two distinct places should not be zero metres');
  assert.ok(primary.path.length >= 2, 'route should have at least a start and end point');
});

test('an alternate route, when one exists, is a genuinely different path and never shorter', () => {
  const routes = routesBetween('wat-sao-thong-thong', 'tha-pa-fai');
  if (routes.length < 2) return; // some pairs on a small island network only have one way through
  const [primary, alternate] = routes;
  assert.ok(alternate.metres >= primary.metres, 'the alternate should not be shorter than the primary — it would just be the real shortest path');
  assert.notEqual(JSON.stringify(primary.path), JSON.stringify(alternate.path), 'alternate route must not be identical to the primary');
});

test('a place off the walkable network (a mainland pier) never resolves to a fabricated straight line', () => {
  const routes = routesBetween('wat-pai-lom', 'tha-wat-sanam-nuea');
  assert.deepEqual(routes, [], 'a mainland landing is not on the island walking graph — routing to it must return nothing, not a straight hop');
});

test('estimateMinutes scales with distance and is never zero for a real walk', () => {
  assert.equal(estimateMinutes(0), 1, 'even a same-spot route reports at least a minute, not 0');
  assert.ok(estimateMinutes(1500) > estimateMinutes(150), 'a longer walk must estimate more time than a shorter one');
});
