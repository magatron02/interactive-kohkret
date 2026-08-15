@AGENTS.md

# Koh Kret Smart Tourism Map — working notes

Read `README.md` for setup, `PRODUCT.md` for who this is for, `DESIGN.md` for the visual system.
This file is the part that only matters if you are the one editing it.

An interactive route-planning map of Koh Kret island, Nonthaburi. Next.js 16 (App Router) + React 19 +
Tailwind v4, no state library, no backend, no API keys. Every coordinate, the coastline, the river and
the street network are real OpenStreetMap data.

Thai is the primary UI language. Reply to the user in Thai unless they write in English; keep code,
commits and comments in English.

---

## The five rules this project holds itself to

These are not style preferences. Breaking one is a regression even if nothing errors.

1. **Real data only.** No invented places, opening hours, phone numbers or QR destinations. If a fact
   cannot be sourced, omit the field and let the UI render its empty state — `PlacePopup` already does.
   An entry resting on weaker evidence than the rest carries a `dataNote` shown to the reader; see
   `wat-chan`, which is a lone OSM building with no Wikidata and no secondary source.
2. **Displayed counts are real counts.** The Categories panel numbers come from `countByCategory()`.
   The reference poster this design came from prints 12/18/15/8/16/5; those are illustration. Ours are 6/4/5/1/1/2.
3. **Pins never move off their coordinates.** Places metres apart genuinely overlap. That is solved
   with a `+N` badge and a sibling list in the popup, never by nudging a marker somewhere prettier.
4. **Contrast is measured, not judged by eye.** Body text targets ≥7:1, stricter than WCAG AA, because
   this gets read outdoors in Thai daylight. Run `node scripts/check-contrast.mjs` after touching any
   colour — it checks all 43 pairings and must report 0 failures.
5. **Motion states something.** Every animation conveys a state change, and every one declares its
   `prefers-reduced-motion` end state explicitly. A blanket `duration: 1ms` that leaves an element at
   `opacity: 0` ships a blank screen.

---

## Generated files — do not hand-edit

```
lib/geo.ts          coastline, river, roads, projection   <- scripts/build-map-data.mjs
lib/route-paths.ts  route polylines + walking distances    <- scripts/build-map-data.mjs
```

Both carry a GENERATED header. Editing them works until the next regeneration silently reverts it.
Change the input (`lib/places.ts`, or the `ROUTES` map inside the script) and re-run:

```bash
node scripts/build-map-data.mjs        # offline, no arguments needed
node scripts/optimise-route-order.mjs  # solves stop order, reports retraced metres
```

`lib/places.ts` is the file you actually edit, and it is the only one. Places store **only** `lat`/`lng`;
screen position comes from `project()` in `geo.ts`. There is no `mapX`/`mapY` — that was removed
precisely so re-framing the map never means hand-editing nineteen pairs of numbers.

Both scripts `import` `lib/places.ts` directly (Node strips the TypeScript natively), so the place list
and the route stop order exist once. Adding a stop to a route means editing `lib/places.ts` and re-running
— there is no second copy to keep in step.

---

## Verifying your work

`npx tsc --noEmit` and `npm run build` are necessary but nowhere near sufficient — most defects found in
this project were visual or behavioural and passed both. Drive the running app and measure.

Useful assertions, all of which caught real bugs here:
- Count pins after a filter and compare to the expected count from the data.
- Compare an element's `getBoundingClientRect().top` before and after a state change to catch layout shift.
- `document.elementFromPoint()` at a pin's centre to find markers that are unreachable under others.
- Project a place's lat/lng yourself, drop a `<circle>` in the SVG at that point, and compare it to the
  pin's tip. This is how you prove the anchor holds.

---

## Traps in this environment — each of these cost real time

**The browser pane freezes rendering-driven APIs when it is not displayed.** `requestAnimationFrame`,
CSS animations, `ResizeObserver` and `resize`/`matchMedia` change events all deliver *nothing*. Verified:
resizing the viewport from 1440 to 375 produced zero callbacks of any of the three kinds.

Consequences you must plan around:
- Measuring an animated element gives you its **first keyframe**, not its resting state. Call
  `el.getAnimations().forEach(a => a.finish())` before measuring. Skipping this produced a convincing
  "pins drift 14px when zooming" bug that did not exist — the 14px was the `pin-drop` keyframe's own
  `translateY(-14px)`.
- Resize-driven behaviour cannot be exercised here at all. Test it by loading the page at each size.
- `MapCanvas`'s zoom takes its first easing step synchronously for this reason, which also means a
  throttled tab never silently swallows a zoom input.

**Thai place names collide under `.includes()`.** `ท่าวัดปรมัยยิกาวาส` (the pier) contains
`วัดปรมัยยิกาวาส` (the temple). A `.find(p => label.includes(...))` matched whichever came first in DOM
order, which changes with the active route — and produced a second phantom bug. Match on
`label.split(' — ')[0] === name`.

**React's `onWheel` is passive.** `preventDefault()` inside it is ignored and the page scrolls out from
under a zoom. Bind natively with `{ passive: false }`, as `MapCanvas` does.

**The main Overpass mirror fails often.** `https://maps.mail.ru/osm/tools/overpass/api/interpreter` has
been the reliable one. Query by the **island polygon**, never a bounding box: a bbox drags in the Pak
Kret mainland across the river, which is how 53 mainland `highway=residential` ways nearly ended up
drawn as island streets. The island itself has no residential roads at all — it is largely car-free, and
its footpaths *are* its street network.

**Screenshots often fail or render at a misleading scale here.** Prefer reading the DOM and computed
styles. When a screenshot does come back, do not infer proportions from it.

---

## Where things live

```
components/MapCanvas.tsx   the heart: projection, frame/zoom, pin rendering, clustering
components/PlacePopup.tsx  detail card, Google Maps deep links, co-located place list
lib/places.ts              ★ places, categories, routes — the file to edit
lib/icons.tsx              hand-drawn line icons (Mon chedi, kiln jar, jetty, stilt house)
lib/maps-links.ts          Google Maps URLs — no API key, no billing, no script tag
app/globals.css            design tokens, map layer styling, motion, page grid
scripts/osm-cache/         raw Overpass responses + the .overpassql that produced them
```

The map has two crops of one projection: a wide desktop letterbox and a narrower phone crop, chosen by
the container's measured width. Zoom narrows the **viewBox**, never a CSS transform — that is what keeps
pins welded to their coordinates while staying a constant size.

---

## Known gaps, and why

- **360° tour** does not exist; the QR resolves to the real อบต.เกาะเกร็ด site rather than promising one.
- **AI guide** was cut by the user (needs a backend and ongoing API cost).
- **กาแฟบ้านเลขที่ ๑** and similar are absent because their only published address is "1 หมู่ 1", which
  will not geocode. Adding them with an estimated position would break rule 1.
- **~10 of 19 places have no description** — no sourceable text found. The empty state is deliberate.
- **6 routes, not the poster's 8.** The missing two need place types the island does not have enough of.
- **The day trip still retraces 20% of its walk.** That is the island — a spine with dead-end lanes down
  to each temple — not the solver. It was 35% before the order was optimised.
- **No test suite**, and the dark theme's core premise (readable outdoors) has never been checked on a
  real device in real sunlight.

## One environment note

The `qwen-mm-plugins-core` media MCP was patched locally: it ran `ffprobe` with `text=True` and no
encoding, so on Windows any file whose metadata contains non-ASCII (Thai, an em dash) failed with
`the JSON object must be str, bytes or bytearray, not NoneType`. Two call sites in `shared/video.py` now
decode as UTF-8. A plugin update or a `uv` cache purge drops that patch; the durable fix is upstream.
