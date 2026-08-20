/**
 * The map's viewBox arithmetic, kept out of the component so it can be tested without a browser.
 *
 * Zoom narrows the viewBox rather than applying a CSS transform: pin positions are computed as
 * fractions of the live frame, so they follow the geometry exactly and stay welded to their
 * coordinates at every zoom level while keeping their own on-screen size.
 */
export type Frame = { x: number; y: number; w: number; h: number };

/** How far in the map can go. 6x on a 2.6 km island puts a single lane across the screen. */
export const MAX_ZOOM = 6;

/**
 * Two crops of the same projection. The wide one is the desktop letterbox, which keeps the whole page
 * inside one screen. On a phone that shape collapses the map to a 143px sliver, so narrow screens crop
 * the river margins instead and get a usable frame.
 *
 * Both are centred on the island, and the tall one is 132 units rather than the 125 it started at:
 * the Pak Kret ferry landings sit just off the east bank, and at 125 their pins were clipped by the
 * frame edge. `tests/frame.test.mjs` holds every place inside both crops so this cannot drift back.
 */
export const FRAME_WIDE: Frame = { x: 0, y: 0, w: 240, h: 100 };
export const FRAME_TALL: Frame = { x: 120 - 66, y: 0, w: 132, h: 100 };

/** The one place the zoom range is enforced. Everything that resizes the frame goes through it. */
export const clampWidth = (base: Frame, w: number) => Math.min(base.w, Math.max(base.w / MAX_ZOOM, w));

/** Keep the frame inside the base view, so the island can never be panned off into empty space. */
export function clampFrame(base: Frame, f: Frame): Frame {
  const w = clampWidth(base, f.w);
  const h = w * (base.h / base.w);
  return {
    w,
    h,
    x: Math.min(base.x + base.w - w, Math.max(base.x, f.x)),
    y: Math.min(base.y + base.h - h, Math.max(base.y, f.y)),
  };
}

/**
 * Zoom `prev` by `factor` about a focal point given in 0..1 of the current frame, so the spot under
 * the cursor stays put.
 *
 * The width is clamped *before* the origin is derived from it. Deriving x from an unclamped width was
 * a real bug: at the zoom limit the width snapped back but the offset kept its full shift, so every
 * further wheel tick slid the map sideways instead of doing nothing.
 */
export function zoomFrame(base: Frame, prev: Frame, factor: number, fx = 0.5, fy = 0.5): Frame {
  const w = clampWidth(base, prev.w / factor);
  const h = w * (base.h / base.w);
  return clampFrame(base, {
    w,
    h,
    x: prev.x + (prev.w - w) * fx,
    y: prev.y + (prev.h - h) * fy,
  });
}
