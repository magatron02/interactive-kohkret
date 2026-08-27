/**
 * The data contract. Rules 1-3 in CLAUDE.md are claims about `lib/places.ts`; these are those claims
 * written as assertions, so breaking one fails a command instead of quietly shipping.
 *
 *   node --test tests/
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CATEGORIES,
  PLACES,
  ROUTES,
  getPlace,
  getCategory,
  countByCategory,
  metresBetween,
  OVERLAP_METRES,
  placesAtSameSpot,
} from '../lib/places.ts';
import { project, MAP_VIEWBOX, ISLAND_PATH, PROJECTION } from '../lib/geo.ts';

/**
 * Ray casting over the projected coastline. Projected space is fine — the projection is affine.
 *
 * ISLAND_PATH is a smoothed cubic Bézier (`M x,y C c1 c2 x,y ...`), so the polygon is the on-curve
 * vertices: the last coordinate pair of each command. Control points sit off the curve and would
 * pull the outline out of shape.
 */
const ISLAND = ISLAND_PATH.replace(/[Zz]\s*$/, '')
  .split(/(?=[MC])/)
  .map((segment) => segment.slice(1).trim().split(/\s+/).filter(Boolean).at(-1))
  .filter(Boolean)
  .map((pair) => pair.split(',').map(Number))
  .filter((p) => p.length === 2 && p.every(Number.isFinite));

function insideIsland(x, y) {
  let hit = false;
  for (let i = 0, j = ISLAND.length - 1; i < ISLAND.length; j = i++) {
    const [xi, yi] = ISLAND[i];
    const [xj, yj] = ISLAND[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Distance from a point to the coastline, in viewBox units — for the piers, which sit just off it. */
function distanceToCoast(x, y) {
  let best = Infinity;
  for (let i = 0, j = ISLAND.length - 1; i < ISLAND.length; j = i++) {
    const [xi, yi] = ISLAND[i];
    const [xj, yj] = ISLAND[j];
    const dx = xj - xi;
    const dy = yj - yi;
    const t = Math.max(0, Math.min(1, ((x - xi) * dx + (y - yi) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - (xi + t * dx), y - (yi + t * dy)));
  }
  return best;
}

const UNITS_PER_METRE = PROJECTION.sy / 111_320;

test('every place id is unique', () => {
  const ids = PLACES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate place id');
});

test('every place has a name, a real category and a coordinate on Koh Kret', () => {
  const known = new Set(CATEGORIES.map((c) => c.id));
  for (const p of PLACES) {
    assert.ok(p.name?.trim(), `${p.id} has no name`);
    assert.ok(known.has(p.category), `${p.id} has unknown category ${p.category}`);
    // The island sits in a tight box; anything outside it is a typo, not a place.
    assert.ok(p.lat > 13.9 && p.lat < 13.93, `${p.id} latitude ${p.lat} is not on Koh Kret`);
    assert.ok(p.lng > 100.44 && p.lng < 100.51, `${p.id} longitude ${p.lng} is not on Koh Kret`);
  }
});

test('every tourUrl, where present, is a real Matterport show link', () => {
  for (const p of PLACES) {
    if (p.tourUrl === undefined) continue;
    assert.match(p.tourUrl, /^https:\/\/my\.matterport\.com\/show\/\?m=\w+$/, `${p.id}'s tourUrl is not a Matterport show link`);
  }
});

test('every place projects inside the map frame', () => {
  for (const p of PLACES) {
    const { x, y } = project(p.lat, p.lng);
    assert.ok(x >= 0 && x <= MAP_VIEWBOX.width, `${p.id} projects to x=${x}, outside the viewBox`);
    assert.ok(y >= 0 && y <= MAP_VIEWBOX.height, `${p.id} projects to y=${y}, outside the viewBox`);
  }
});

test('every place is on the island, or inside the 60 m shoreline buffer', () => {
  // places.ts documents the buffer: piers stand over the water, and the riverside cafes sit right on
  // a bank that a 33-vertex smoothed coastline rounds past. Anything further out is a bad coordinate —
  // unless it is one of the ferry landings on the far bank, which say so with `mainland`.
  for (const p of PLACES) {
    if (p.mainland) continue;
    const { x, y } = project(p.lat, p.lng);
    if (insideIsland(x, y)) continue;
    const metresOff = distanceToCoast(x, y) / UNITS_PER_METRE;
    assert.ok(metresOff <= 60, `${p.id} is ${metresOff.toFixed(0)} m off the bank, past the 60 m buffer`);
  }
});

test('a place flagged mainland really is across the water, and is a pier', () => {
  // The flag must not become a way to smuggle in a bad coordinate. Anything wearing it has to be
  // genuinely off the island, and the only reason to map the far bank is the crossing.
  for (const p of PLACES.filter((q) => q.mainland)) {
    const { x, y } = project(p.lat, p.lng);
    assert.ok(!insideIsland(x, y), `${p.id} is flagged mainland but sits on the island`);
    assert.ok(distanceToCoast(x, y) / UNITS_PER_METRE > 60, `${p.id} is flagged mainland but is on the bank`);
    assert.equal(p.category, 'pier', `${p.id} is on the mainland but is not a crossing point`);
  }
});

test('no route walks to the far bank', () => {
  // Every route is a walking route on the island. A mainland landing as a stop would mean routing
  // someone across the river on foot.
  for (const route of ROUTES) {
    for (const stop of route.stops) {
      assert.ok(!getPlace(stop.placeId)?.mainland, `route ${route.id} walks to ${stop.placeId}, which is across the water`);
    }
  }
});

test('category counts are counts of the real data', () => {
  // Rule 2: the numbers the Categories panel prints must come from PLACES, never from the poster.
  const summed = CATEGORIES.reduce((n, c) => n + countByCategory(c.id), 0);
  assert.equal(summed, PLACES.length, 'per-category counts do not add up to the place list');
  for (const c of CATEGORIES) {
    const manual = PLACES.filter((p) => p.category === c.id).length;
    assert.equal(countByCategory(c.id), manual, `countByCategory(${c.id}) disagrees with the data`);
    assert.ok(manual > 0, `category ${c.id} is offered in the UI but has no places`);
  }
});

test('getPlace and getCategory resolve every id they are asked for', () => {
  for (const p of PLACES) assert.equal(getPlace(p.id)?.id, p.id);
  for (const c of CATEGORIES) assert.equal(getCategory(c.id).id, c.id);
  assert.equal(getPlace('no-such-place'), undefined);
});

test('optional fields are absent rather than blank when unsourced', () => {
  // Rule 1: an empty string renders as a present-but-empty field, which reads as missing data the UI
  // failed to show. Omission is what PlacePopup's empty state is written against.
  for (const p of PLACES) {
    for (const field of ['description', 'hours', 'cuisine', 'phone', 'website', 'dataNote']) {
      if (field in p) assert.ok(String(p[field]).trim().length > 0, `${p.id}.${field} is present but empty`);
    }
    if (p.website) assert.match(p.website, /^https?:\/\//, `${p.id}.website is not a URL`);
  }
});

test('metresBetween is a metric: zero to self, symmetric, and matches a known distance', () => {
  const [a, b] = PLACES;
  assert.equal(metresBetween(a, a), 0);
  assert.equal(metresBetween(a, b), metresBetween(b, a));

  // One degree of latitude is ~111.32 km. A pure north offset is the cleanest check of the scale.
  const north = { ...a, lat: a.lat + 0.001 };
  assert.ok(Math.abs(metresBetween(a, north) - 111.32) < 1, `1e-3 deg of latitude measured as ${metresBetween(a, north)} m`);
});

test('placesAtSameSpot returns the neighbours, symmetrically, within OVERLAP_METRES', () => {
  for (const p of PLACES) {
    const group = placesAtSameSpot(p);
    // It answers "who else is under this pin", so the pin's own place is deliberately not in it —
    // MapCanvas counts the result straight into the +N badge.
    assert.ok(!group.some((q) => q.id === p.id), `${p.id} counts itself as its own neighbour`);
    for (const q of group) {
      assert.ok(metresBetween(p, q) <= OVERLAP_METRES, `${p.id} and ${q.id} are clustered but ${metresBetween(p, q)} m apart`);
      assert.ok(placesAtSameSpot(q).some((r) => r.id === p.id), `${p.id}/${q.id} cluster is not symmetric`);
    }
  }
});

test('every route stop resolves to a real place', () => {
  for (const route of ROUTES) {
    assert.ok(route.stops.length > 0, `route ${route.id} has no stops`);
    for (const stop of route.stops) {
      assert.ok(getPlace(stop.placeId), `route ${route.id} visits unknown place "${stop.placeId}"`);
      assert.match(stop.time, /^\d{2}:\d{2}$/, `route ${route.id} stop ${stop.placeId} has time "${stop.time}"`);
    }
  }
});

test('route stop times run forward', () => {
  for (const route of ROUTES) {
    const mins = route.stops.map((s) => Number(s.time.slice(0, 2)) * 60 + Number(s.time.slice(3)));
    for (let i = 1; i < mins.length; i++) {
      assert.ok(mins[i] > mins[i - 1], `route ${route.id} goes backwards in time at stop ${i + 1} (${route.stops[i].time})`);
    }
  }
});

test('the stop count a route advertises is the number of stops it has', () => {
  // The legend prints durationLabel verbatim. "10 จุด" next to nine stops is the kind of drift that
  // made the reference poster's numbers illustration rather than data.
  for (const route of ROUTES) {
    const claimed = Number(route.durationLabel.match(/^(\d+)\s*จุด/)?.[1]);
    assert.ok(Number.isFinite(claimed), `route ${route.id} label "${route.durationLabel}" does not start with a stop count`);
    assert.equal(claimed, route.stops.length, `route ${route.id} advertises ${claimed} stops but has ${route.stops.length}`);
  }
});

test('route ids and colours are distinct', () => {
  const ids = ROUTES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate route id');
  const colours = ROUTES.map((r) => r.color.toLowerCase());
  assert.equal(new Set(colours).size, colours.length, 'two routes share a colour');
});
