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
   The reference poster this design came from prints 12/18/15/8/16/5; those are illustration. Ours are 6/4/5/1/2/4.
3. **Pins never move off their coordinates.** Places metres apart genuinely overlap. That is solved
   with a `+N` badge and a sibling list in the popup, never by nudging a marker somewhere prettier.
   `lib/pin-stack.ts`'s `frontPlaces` is what makes that true on screen: only the frontmost pin of a
   cluster renders, so the badge's siblings do not draw a second circle on top of it — MapCanvas used
   to render every clustered place as its own full pin, which is what a 76 m gap (well under a pin's
   own footprint at the default zoom) looked like: two markers stacked almost exactly on each other.
   Two places carry `mainland: true` — the ferry landings on the Pak Kret bank, which are how you get
   to the island and so belong on the map even though they are not on it. Anything checking that a
   place sits inside the coastline has to skip them; `tests/data.test.mjs` checks the flag is not being
   used to smuggle in a bad coordinate.

   A pin also carries a contact glow at its tip (`.map-pin::after`, coloured via `currentColor` set on
   the pin element itself). A place with nothing else nearby — no road, no coastline — used to read as
   floating: correctly positioned (proven with the debug-circle technique below, 0px delta), but with
   nothing under it to say "this touches the map here". A black drop-shadow does not fix that on navy;
   its own hue does.
4. **Contrast is measured, not judged by eye.** Body text targets ≥7:1, stricter than WCAG AA, because
   this gets read outdoors in Thai daylight. Run `node scripts/check-contrast.mjs` after touching any
   colour — it checks all 50 pairings, reports each one again under veiling glare, and exits non-zero
   on a failure. It reads the tokens out of `globals.css`, so it cannot drift from the real palette.
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
precisely so re-framing the map never means hand-editing a coordinate pair per place.

Both scripts `import` `lib/places.ts` directly (Node strips the TypeScript natively), so the place list
and the route stop order exist once. Adding a stop to a route means editing `lib/places.ts` and re-running
— there is no second copy to keep in step.

---

## Verifying your work

```bash
npm test          # 64 assertions over the data, routes, map frame, QR, both brand marks and the build
npm run typecheck # next typegen && tsc --noEmit
npm run shoot     # real full-resolution screenshots of eight states, into screenshots/
```

Use `npm run typecheck`, not bare `tsc --noEmit`. `app/layout.tsx` uses Next 16's generated
`LayoutProps<"/">`, which lives in `.next/types` — on a clone that has never built, bare `tsc` fails
with "Cannot find name 'LayoutProps'". The script runs `next typegen` first, which produces those
types without a full build.

`npm test` is `node --test` against `tests/`, no framework and no dependency. It imports the TypeScript
directly — Node strips the types. Every assertion in there exists because something was actually wrong:
the food route advertising a walking distance past two restaurants it never reached, the map sliding
sideways on every wheel tick past the zoom limit, generated files naming a rebuild script that never
shipped, a QR whose declared module count did not match the code.

`npm run typecheck` and `npm run build` are necessary but nowhere near sufficient — most defects found in
this project were visual or behavioural and passed all three. Drive the running app and measure.

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
styles. When a screenshot does come back from the pane, do not infer proportions from it.

`npm run shoot` is the way around all of the above. It drives a real headless Chrome over the DevTools
protocol — actual 1:1 PNGs, animations finished before capture, and states that need interaction (a
route chosen, a popup open, the map zoomed) reachable because it can click. Add a state by appending to
`SHOTS` in `scripts/shoot.mjs`. It needs a server running: `npm run build && npm start -- -p 3100`.

Two cautions with it. Chrome is launched with `--hide-scrollbars`, so a horizontal scroller looks like
a hard crop in the image when the real affordance is its scrollbar — `.scroll-x` on the itinerary is the
one that keeps a visible bar deliberately. And an element clipped by the map's SVG viewBox reports a
`getBoundingClientRect()` past the viewport edge without the page overflowing; check
`document.documentElement.scrollWidth` before believing an overflow.

---

## Type and marks

Two Google Fonts, both self-hosted at build time via `next/font/google` (no runtime request, no CSP
concern): **K2D** for Thai body copy (`--font-th`, the `.font-th` class, applied to `<body>` — this is
the default), **Baloo 2** for English wordmarks and section labels (`--font-en`, the `.font-en` class,
applied per-element to "KOH KRET", "CATEGORIES", "HIGHLIGHT ROUTES", and similar). Not Kanit, Poppins,
Montserrat or Inter — the geometric-grotesk default most AI-generated pages reach for. K2D's letterforms
are soft and rounded at the terminals; Baloo 2 shares that same rounded-geometric construction, so the
two read as one typographic family rather than a Thai face with an unrelated Latin face bolted on. A
Thai string inside an English-classed element (the strapline's inline Thai clause) gets `.font-th` back
explicitly — `font-family` inherits, so nesting without it would set Baloo 2 under Thai text.

`lib/icons.tsx` gained `zoom-in`/`zoom-out`/`expand` — the map's zoom controls used literal `+`/`−`/`⤢`
characters before, at the mercy of whatever font the OS substituted. `homestay`'s roofline kicks up at
both eaves (a chofah gable, not a plain triangle) so it reads Thai-vernacular alongside `temple`'s
tiered chedi.

**Neither brand mark is in that icon set.** Both are supplied artwork — the KOH KRET header lockup and
the อบต.เกาะเกร็ด seal — painted through as CSS masks:

```
public/brand-lockup.png   components/BrandLockup.tsx   .brand-lockup   1.301:1
public/org-seal.png       components/SiteFooter.tsx    .org-seal       1.422:1
```

`scripts/build-mask-asset.mjs <source> <public-name> [width]` builds them, deriving alpha from each
pixel's position between the sampled field colour and the brightest ink — not a hard threshold, so
anti-aliased letterforms and fine detail survive rather than turning to jaggies. Masks, not `<img>`
tags, so each takes `background-color: currentColor` from its call site and follows the theme token
like every SVG icon here; a plain `<img>` would be permanently white and would sit wrong the moment a
colour moved.

The seal went through an SVG version first (rings, arced `<textPath>`, a generated lotus). It was
legible, but an approximation — the real rosette and flourishes carry detail not worth chasing in
paths. The lockup replaced a hand-drawn leaning-chedi icon for the same reason.

Three things to know before touching either:
- **The container must carry the artwork's aspect.** A square box letterboxes the mark and shrinks it;
  that is exactly what the seal's first attempt shipped, with the arced Thai reduced to texture.
- **They fail silently.** Both components render an empty `<span>`, so a missing PNG or a renamed rule
  gives no broken-image icon and no console error — just a blank box where the logo was.
- **`build-mask-asset.mjs` never upscales.** The lockup's source is a 210x162 screengrab, so its asset
  is 186px wide and the header box is deliberately modest; a bigger box would go soft rather than sharp.

`tests/build.test.mjs` covers all of it for both marks — asset present, real alpha channel, the CSS
still masks the right file and still uses `currentColor`, and every sizing pair the call site declares
(base and each breakpoint) matches the artwork's ratio.

Regenerating needs the source artwork supplied again (both are supplied, not something this repo
can synthesise), so only the derived assets are committed and the exact commands live in the script header.

## Two layering rules the map depends on

`MapCanvas`'s root carries `relative z-0`, and that `z-0` is load-bearing: it makes the map a stacking
context so the pins' z-indexes (up to 150 for a selected pin, 200 for the zoom controls) stay contained.
Without it they competed directly with `PlacePopup`'s `z-30` in the page's own stacking context, and a
selected pin painted straight over the card describing it.

`PlacePopup` is a **sibling** of the map, not a child, so the map's `overflow-hidden` does not clip it.
Anchored to the bottom, a tall card (description + cuisine + phone + sibling place + dataNote) grows
upward — unbounded it ran 90px past the map's top edge and over the site header. It is capped to the
frame with `max-h-[calc(100%-…)]` and scrolls its own overflow instead.

## Where things live

```
components/MapCanvas.tsx   the heart: projection, frame/zoom, pin rendering, clustering
components/PlacePopup.tsx  detail card, Google Maps deep links, co-located place list
components/BrandLockup.tsx header identity — masked artwork + sr-only <h1>
components/OrgSeal.tsx     footer seal — masked artwork
lib/places.ts              ★ places, categories, routes — the file to edit
lib/frame.ts               the two map crops + zoom arithmetic; pure, no React, so tests can hold it
lib/pin-stack.ts           which pin of an overlapping cluster actually renders
lib/icons.tsx              hand-drawn line icons (Mon chedi, kiln jar, jetty, stilt house)
lib/maps-links.ts          Google Maps URLs — no API key, no billing, no script tag
app/layout.tsx             the two fonts, self-hosted as CSS variables
app/globals.css            design tokens, map layer styling, motion, page grid, mask rules
scripts/osm-cache/         raw Overpass responses + the .overpassql that produced them
scripts/build-mask-asset.mjs  supplied artwork -> white-on-transparent mask in public/
scripts/shoot.mjs          headless-Chrome screenshots of eight states (npm run shoot)
tests/                     node:test — data, routes, frame, QR, brand marks, build guarantees
```

Layering in the map, since two bugs came out of it: pins take `z-index: 10 + round(y)` so southern pins
overlap northern ones the way a paper map stacks markers, a selected pin takes 150 to clear all of them,
and the zoom controls take 200 to clear everything. Before that the controls had no z-index at all and a
pin near the bottom-right corner ate the zoom-in click on the phone crop.

The map has two crops of one projection: a wide desktop letterbox and a narrower phone crop, chosen by
the container's measured width. Both live in `lib/frame.ts` with the zoom arithmetic — pure functions,
no React, so `tests/frame.test.mjs` can hold them without a browser. Zoom narrows the **viewBox**, never
a CSS transform, which is what keeps pins welded to their coordinates while staying a constant size.

`lib/route-paths.ts` also carries `arrows` (one chevron per walked leg, at its midpoint) and
`stopOffsets` (how far along the drawn line, 0..1, each walkable stop falls — real walking distance,
not stop count). Both are generated in `build-map-data.mjs` from the same leg geometry that draws the
line, so neither can drift from it. `road--major` (the round-island cycleway) was toned down from
0.55/0.9 to 0.4/0.75 — at the old weight it visually rivalled the coastline stroke (0.6 width, a
nearly identical blue) and read as a second ring around the island rather than a path on it.

**Walking a route one stop at a time.** `MapCanvas` no longer draws the whole route line the instant
one is picked. It draws the full line faint (`.route-line--ghost`) and reveals the bold core/glow up
to `progress`, a 0..1 fraction taken from `stopOffsets`. Tapping a stop — on the map or in the
itinerary strip, both already call `onSelectPlace` — moves `progress` to that stop's offset, and only
the arrows on already-revealed legs render. `stopOffsets` keys by placeId but keeps every occurrence in
walk order, because a loop route revisits its first stop at the end: `progressState` resolves a tap on
a repeated stop to whichever occurrence sits ahead of where you already are, so finishing the loop and
re-tapping the start pin reveals the return leg instead of snapping the line back to zero.

The reveal is a CSS `transition` on `strokeDashoffset` (via `pathLength={1}`, so `1` always means "the
whole line" regardless of real length), not a mount keyframe — each tap animates from wherever the
line already was. Progress lives in one state object updated during render, the same pattern `base`
uses above: an effect would paint one frame at the old progress first, and the lint rules here forbid
both a synchronous `setState` inside an effect and a ref read during render.

Two things that module now guarantees, both of which were bugs:
- `zoomFrame` clamps the width **before** deriving the new origin from it. Deriving x from an unclamped
  width meant that past the zoom limit the width snapped back while the offset kept its full shift, so
  every further wheel tick slid the map 4 viewBox units sideways until it hit the edge.
- Every place fits inside **both** crops with room for its pin body. The phone crop is 132 units wide
  rather than the 125 it started at, because the Pak Kret ferry landings sit just off the east bank and
  were clipped by the frame edge.

---

## Known gaps, and why

- **360° tour** does not exist; the QR resolves to the real อบต.เกาะเกร็ด site rather than promising one.
- **AI guide** was cut by the user (needs a backend and ongoing API cost).
- **กาแฟบ้านเลขที่ ๑** and similar are absent because their only published address is "1 หมู่ 1", which
  will not geocode. Adding them with an estimated position would break rule 1.
- **6 of 22 places have no description** — no sourceable text found. The empty state is deliberate.
- **6 routes, not the poster's 8.** The missing two need place types the island does not have enough of.
- **The day trip still retraces 20% of its walk.** That is the island — a spine with dead-end lanes down
  to each temple — not the solver. It was 35% before the order was optimised.
- **Two stops on the food route are not walkable.** ร.ศ.๑๒๗ and RIVA sit ~250 m from any mapped way at
  the island's west tip; ร.ศ.๑๒๗ publishes "reached by boat" as its own directions. The generator lists
  them in `ROUTE_GEOMETRY.food.unreachable`, the drawn line and the walking distance leave them out, and
  the itinerary says so. If OSM ever gains a lane out there, a rebuild picks it up on its own.
- **The dark theme has still never been read on a real phone in real sun.** It has now been modelled
  instead: `scripts/check-contrast.mjs` prints every pairing under veiling glare. The finding is that no
  palette helps — the ceiling in direct tropical sun is 1.42:1 for pure white on pure black — and this
  one already reaches 91% of the physical ceiling in shade. So the honest advice is brightness and
  shade, not a light theme. A device test would confirm the model, not change the design.
- **Tests cover data, geometry and build guarantees, not the UI.** `npm test` is pure-logic only. Layout,
  zoom, pin anchoring and stacking are still verified by driving the app — `npm run shoot` plus the
  `document.elementFromPoint()` checks above. Both z-index bugs found in this project were invisible to
  every assertion in `tests/`.

## One environment note

The `qwen-mm-plugins-core` media MCP was patched locally: it ran `ffprobe` with `text=True` and no
encoding, so on Windows any file whose metadata contains non-ASCII (Thai, an em dash) failed with
`the JSON object must be str, bytes or bytearray, not NoneType`. Two call sites in `shared/video.py` now
decode as UTF-8. A plugin update or a `uv` cache purge drops that patch; the durable fix is upstream.

## gstack

For all web browsing, use the `/browse` skill from gstack. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`, `/retro`, `/investigate`, `/document-release`, `/document-generate`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`.
