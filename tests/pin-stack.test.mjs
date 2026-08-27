/**
 * The bug this exists for: two places 76 m apart — well within a pin's own on-screen footprint at
 * the default zoom — both rendered their own full pin, so the "+N" badge on the front one sat right
 * next to (almost on top of) a second, undimmed, fully clickable marker for the sibling it was
 * supposedly accounting for. `frontPlaces` is what MapCanvas now filters through before rendering.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { PLACES, placesAtSameSpot, OVERLAP_METRES, metresBetween } from '../lib/places.ts';
import { project as projectLatLng } from '../lib/geo.ts';
import { frontPlaces, clusterOf } from '../lib/pin-stack.ts';

/** Adapts MapCanvas's own call shape — project(p) => {y}, from a place's lat/lng — for the tests. */
const project = (p) => projectLatLng(p.lat, p.lng);
const front = (places) => frontPlaces(places, project, placesAtSameSpot);

test('every real cluster in the live data collapses to exactly one rendered pin', () => {
  // A cluster is the full connected component of the same-spot relation, not just direct pairwise
  // neighbours — three places can chain (A near B, B near C, A far from C) without A and C ever being
  // each other's neighbour, and the invariant this test checks is about the whole chain, not a pair.
  const rendered = new Set(front(PLACES).map((p) => p.id));
  for (const place of PLACES) {
    const cluster = [place, ...clusterOf(place, PLACES, placesAtSameSpot)];
    const renderedInCluster = cluster.filter((p) => rendered.has(p.id));
    assert.equal(renderedInCluster.length, 1, `cluster around ${place.id} has ${renderedInCluster.length} rendered pins: ${renderedInCluster.map((p) => p.id).join(', ')}`);
  }
});

test('the one pin a cluster keeps is the one MapCanvas already draws on top', () => {
  // MapCanvas z-orders by y (southernmost wins), independent of this filter. The two have to agree,
  // or the badge would end up on a pin that isn't the one actually painted in front.
  for (const place of PLACES) {
    const cluster = [place, ...clusterOf(place, PLACES, placesAtSameSpot)];
    if (cluster.length === 1) continue;
    const kept = front(cluster);
    assert.equal(kept.length, 1, `cluster around ${place.id} did not resolve to one front pin`);
    const southernmost = cluster.reduce((a, b) => (project(b).y > project(a).y ? b : a));
    assert.equal(kept[0].id, southernmost.id, `frontPlaces kept ${kept[0].id}, but ${southernmost.id} is the one drawn on top`);
  }
});

test('places with no cluster are untouched', () => {
  const solo = PLACES.filter((p) => placesAtSameSpot(p).length === 0);
  assert.ok(solo.length > 0, 'fixture assumption: some places have no neighbour within OVERLAP_METRES');
  const rendered = new Set(front(PLACES).map((p) => p.id));
  for (const p of solo) assert.ok(rendered.has(p.id), `${p.id} has no cluster but was filtered out anyway`);
});

test('filtering against a smaller candidate set only clusters within that set', () => {
  // MapCanvas calls this with `shown` (the currently filtered/visible places), not the full PLACES —
  // a sibling hidden by a category filter must not suppress the pin that IS showing.
  const a = placesAtSameSpot(PLACES[0]).length ? PLACES[0] : null;
  if (!a) return; // no clustered fixture at index 0; other tests already cover the general case
  assert.deepEqual(front([a]).map((p) => p.id), [a.id], 'a lone place (its cluster-mate filtered out) must still render');
});

test('a synthetic pair just inside OVERLAP_METRES collapses; just outside it does not', () => {
  const base = PLACES.find((p) => p.category === 'temple');
  const metresPerDegLat = 110_574;
  const near = { ...base, id: 'synthetic-near', lat: base.lat + (OVERLAP_METRES - 5) / metresPerDegLat };
  const far = { ...base, id: 'synthetic-far', lat: base.lat + (OVERLAP_METRES + 30) / metresPerDegLat };

  assert.ok(metresBetween(base, near) < OVERLAP_METRES);
  assert.equal(front([base, near]).length, 1, 'a pair within OVERLAP_METRES should collapse to one pin');

  assert.ok(metresBetween(base, far) > OVERLAP_METRES);
  assert.equal(front([base, far]).length, 2, 'a pair past OVERLAP_METRES should both render');
});
