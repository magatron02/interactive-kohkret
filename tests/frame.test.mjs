/**
 * Map zoom arithmetic. The bug this file exists for: once the map was zoomed all the way in, every
 * further wheel tick slid it sideways instead of doing nothing, because the new origin was derived
 * from a width that had not been clamped yet. It is pure arithmetic, so it is checked here rather
 * than by driving a browser.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { clampFrame, clampWidth, zoomFrame, MAX_ZOOM, FRAME_WIDE, FRAME_TALL } from '../lib/frame.ts';

const BASE = { x: 0, y: 0, w: 240, h: 100 };
const IN = 1.25;
const OUT = 1 / 1.25;
/** Wheel over the upper right of the map — off-centre, which is what exposed the drift. */
const FX = 0.8;
const FY = 0.3;

/**
 * Zoom until the width stops changing, and stop there.
 *
 * Stopping at the moment the limit is reached is the whole point. Keep going and the frame ends up
 * pinned against an edge, where clampFrame masks the drift — an earlier version of this test looped a
 * fixed 40 times, landed on the wall, and passed against the broken code.
 */
const zoomToLimit = (base, factor, fx = FX, fy = FY) => {
  let f = base;
  for (let i = 0; i < 60; i++) {
    const next = zoomFrame(base, f, factor, fx, fy);
    if (next.w === f.w) return f;
    f = next;
  }
  throw new Error('zoom never settled');
};

test('the zoom range is exactly 1x to MAX_ZOOM', () => {
  assert.equal(clampWidth(BASE, BASE.w * 10), BASE.w, 'zooming out past the base view');
  assert.equal(clampWidth(BASE, 0), BASE.w / MAX_ZOOM, 'zooming in past the limit');
  assert.equal(clampWidth(BASE, BASE.w / 2), BASE.w / 2, 'a width inside the range is left alone');
});

test('scrolling further at maximum zoom does not move the map', () => {
  const atMax = zoomToLimit(BASE, IN);
  assert.ok(Math.abs(atMax.w - BASE.w / MAX_ZOOM) < 1e-9, 'did not actually reach the limit');
  let f = atMax;
  for (let i = 0; i < 10; i++) {
    f = zoomFrame(BASE, f, IN, FX, FY);
    assert.deepEqual(f, atMax, `tick ${i + 1} moved the frame after the zoom limit`);
  }
});

test('a centred zoom stays centred instead of creeping to the edge', () => {
  // The exact reported symptom, at the focal point that shows it most plainly. Against the old code
  // this crept 4 viewBox units per tick — a tenth of the visible map — until it hit the right wall.
  const atMax = zoomToLimit(BASE, IN, 0.5, 0.5);
  const centre = atMax.x + atMax.w / 2;
  assert.ok(Math.abs(centre - (BASE.x + BASE.w / 2)) < 1e-9, `centred zoom already off-centre at ${centre}`);
  let f = atMax;
  for (let i = 0; i < 8; i++) {
    f = zoomFrame(BASE, f, IN, 0.5, 0.5);
    assert.ok(Math.abs(f.x - atMax.x) < 1e-9, `slid ${(f.x - atMax.x).toFixed(2)} units by tick ${i + 1}`);
  }
});

test('scrolling further at minimum zoom does not move the map', () => {
  const atMin = zoomToLimit(BASE, OUT);
  assert.deepEqual(atMin, BASE, 'zooming out should settle exactly on the base view');
  for (let i = 0; i < 10; i++) assert.deepEqual(zoomFrame(BASE, atMin, OUT, FX, FY), BASE);
});

test('the drift is gone at every focal point, not just the one that showed it', () => {
  for (const fx of [0, 0.25, 0.5, 0.75, 1]) {
    for (const fy of [0, 0.5, 1]) {
      const atMax = zoomToLimit(BASE, IN, fx, fy);
      assert.deepEqual(zoomFrame(BASE, atMax, IN, fx, fy), atMax, `focal point ${fx},${fy} still drifts`);
    }
  }
});

test('the point under the cursor stays put while zoom has room to move', () => {
  // What the focal point is for: the ground position at the cursor should not change as it zooms.
  const before = BASE;
  const after = zoomFrame(BASE, before, IN, FX, FY);
  assert.ok(after.w < before.w, 'this case is supposed to zoom');
  const groundBefore = before.x + before.w * FX;
  const groundAfter = after.x + after.w * FX;
  assert.ok(Math.abs(groundBefore - groundAfter) < 1e-9, 'the spot under the cursor moved');
});

test('the frame never leaves the base view', () => {
  let f = BASE;
  // Zoom into the corner, then try to pan far past the edge.
  for (let i = 0; i < 5; i++) f = zoomFrame(BASE, f, IN, 1, 1);
  for (const [x, y] of [[-500, -500], [5000, 5000], [0, 5000], [5000, 0]]) {
    const c = clampFrame(BASE, { ...f, x, y });
    assert.ok(c.x >= BASE.x - 1e-9 && c.x + c.w <= BASE.x + BASE.w + 1e-9, `x escaped: ${c.x}`);
    assert.ok(c.y >= BASE.y - 1e-9 && c.y + c.h <= BASE.y + BASE.h + 1e-9, `y escaped: ${c.y}`);
  }
});

test('aspect ratio is preserved through every zoom step', () => {
  const aspect = BASE.w / BASE.h;
  let f = BASE;
  for (let i = 0; i < 12; i++) {
    f = zoomFrame(BASE, f, IN, FX, FY);
    assert.ok(Math.abs(f.w / f.h - aspect) < 1e-9, `aspect drifted to ${f.w / f.h} at step ${i}`);
  }
});

test('the phone crop zooms by the same rules as the desktop letterbox', () => {
  const TALL = FRAME_TALL;
  const atMax = zoomToLimit(TALL, IN);
  assert.ok(Math.abs(atMax.w - TALL.w / MAX_ZOOM) < 1e-9);
  assert.deepEqual(zoomFrame(TALL, atMax, IN, FX, FY), atMax, 'the phone crop still drifts at the limit');
});

test('every place fits inside both crops, pin body included', async () => {
  // The mainland ferry landings sit just off the east bank, and at the phone crop's original 125-unit
  // width their pins were clipped by the frame edge. A pin is ~28px wide against a map ~636px wide,
  // so it needs roughly 2% of the frame either side of its anchor to draw whole.
  const { PLACES } = await import('../lib/places.ts');
  const { project } = await import('../lib/geo.ts');
  const MARGIN = 0.025;

  for (const [name, crop] of [['wide', FRAME_WIDE], ['tall', FRAME_TALL]]) {
    for (const p of PLACES) {
      const { x, y } = project(p.lat, p.lng);
      const fx = (x - crop.x) / crop.w;
      const fy = (y - crop.y) / crop.h;
      assert.ok(fx >= MARGIN && fx <= 1 - MARGIN, `${p.id} sits at ${(fx * 100).toFixed(1)}% of the ${name} crop — its pin would be clipped`);
      assert.ok(fy >= 0 && fy <= 1, `${p.id} is outside the ${name} crop vertically`);
    }
  }
});

test('both crops are centred on the island and share the projection aspect', () => {
  assert.equal(FRAME_WIDE.w / FRAME_WIDE.h, 2.4);
  const centre = (f) => f.x + f.w / 2;
  assert.equal(centre(FRAME_TALL), centre(FRAME_WIDE), 'the phone crop is not centred on the same point');
});
