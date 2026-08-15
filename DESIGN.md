---
name: Koh Kret Smart Tourism Map
description: Dark navy route-planning map of Koh Kret, drawn from real OpenStreetMap geography
colors:
  bg-deep: "#0B1220"
  bg-map: "#0E1727"
  bg-panel: "#111C2E"
  bg-elevated: "#16233A"
  hairline: "#22334F"
  land: "#16223A"
  land-edge: "#35507D"
  map-glow: "#16304F"
  road-major: "#4A6A99"
  road-minor: "#2E4569"
  ink: "#F2F6FC"
  ink-muted: "#AFC0D8"
  ink-faint: "#8FA3C0"
  primary: "#E3714A"
  cat-temple: "#F5A623"
  cat-cafe: "#FF8A4C"
  cat-restaurant: "#6BA5FF"
  cat-homestay: "#35D0C0"
  cat-craft: "#C08CFF"
  cat-pier: "#45D07A"
typography:
  display:
    fontFamily: "Noto Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Noto Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Noto Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Noto Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.2em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  category-row:
    backgroundColor: "{colors.bg-panel}"
    textColor: "{colors.ink}"
    padding: "12px 0"
  count-chip:
    backgroundColor: "{colors.cat-temple}"
    textColor: "{colors.bg-deep}"
    rounded: "{rounded.full}"
    padding: "0 6px"
  route-chip:
    backgroundColor: "{colors.bg-panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
  popup-card:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Koh Kret Smart Tourism Map

## 1. Overview

**Creative North Star: "The Night Chart"**

Koh Kret exists because a canal cut a bend of the Chao Phraya and turned a peninsula into an island. This
interface draws that island the way a river chart draws one: deep navy water, a landmass a half-step lighter,
the real street grid engraved inside the coastline, and one warm clay accent marking wherever the visitor is
right now. Nothing on screen is decorative geography — the shoreline is the OSM boundary polygon, the streets
are 70 real OSM ways, and every pin sits on a genuine geocoded coordinate.

This replaces an earlier light theme. That reversal is recorded in PRODUCT.md along with the trade-off it
carries: a dark screen fights bright sun harder than a light one, so this palette compensates rather than
pretends. Body text lands at 17.26:1 against the page, more than double the WCAG AA floor. The page is deep
navy, never pure black, because #000 turns a phone into a mirror outdoors and smears on OLED.

The system explicitly rejects the shape a dark redesign usually collapses into: neon on black, glowing wires,
a crypto-terminal or sci-fi HUD. The saturation lives in six category hues used on small marks only; every
surface is a desaturated navy, and the only glow in the system is the soft halo under an active route line.

**Key Characteristics:**
- Deep navy ground, never black; surfaces separated by hairlines rather than luminance jumps or shadows
- One typeface (Noto Sans Thai), 400 weight floor — thin white on navy blooms in sunlight
- Real geography: real coastline, real street grid, real coordinates, real counts
- Colour is reserved for identity (category) and state (active route); the map field itself is monochrome
- Motion narrates the trip and never decorates

## 2. Colors

Restrained on surface, committed on marks: five navies carry every panel and the map field, and the six
category hues appear only on chips, pins and icons.

### Primary
- **Kiln Clay** (#E3714A): the heritage terracotta of Koh Kret's unglazed pottery, lifted for navy. The
  light theme's #B5502E goes muddy at small sizes on a dark ground; this keeps the same clay identity and
  clears 6:1 on the page. Reserved for the active state, the flagship route, the focus ring, and links.

### Neutral
- **Deep Navy** (#0B1220): page ground.
- **River Field** (#0E1727): the water plane around the island, a half-step above the page so the Chao Phraya
  reads as a body of water rather than a hole in the layout.
- **Panel Navy** (#111C2E): side rail, cards, itinerary tiles.
- **Raised Navy** (#16233A): the place popup, the one surface that genuinely floats.
- **Hairline** (#22334F): every divider in the system. There is exactly one border treatment.
- **Ink** (#F2F6FC) 17.26:1, **Ink Muted** (#AFC0D8) 10.12:1, **Ink Faint** (#8FA3C0) 7.28:1 — all measured
  against the page.

### Map field
- **Land** (#16223A) and **Coastline** (#35507D): the island reads by its edge and by the grid inside it.
- **Road Major** (#4A6A99) and **Road Minor** (#2E4569): the island is largely car-free, so the footpaths and
  lanes ARE the streets. The minor grid sits deliberately low-contrast: it is texture, not information.

### Category Hues
Temple Gold (#F5A623) · Kiln Fire (#FF8A4C) · River Blue (#6BA5FF) · Boat Teal (#35D0C0) ·
Dusk Bloom (#C08CFF) · Banana Leaf (#45D07A)

### Named Rules
**The Uniform Ink Rule.** On navy, every category and route fill takes the deep-navy ink (#0B1220) at 7.5:1
or better. This inverts the light theme's per-swatch Legible-Pin Rule cleanly: there are no exceptions to
remember, because no swatch is light enough to need white text.

**The Texture-Is-Not-Data Rule.** Road Minor scores 1.9:1 on land and that is intentional. Nothing is encoded
in the fine grid; every wayfinding cue rides on pins, route lines, or labels. Any future feature that puts
meaning into a street must promote it to Road Major first.

**The One Glow Rule.** Exactly one element in the system glows: the active route line's halo. If a second glow
appears, the design has started drifting toward the HUD look this system rejects.

## 3. Typography

**Display / Body / Label Font:** Noto Sans Thai (with ui-sans-serif, system-ui)

**Character:** one family carrying Thai and Latin without a font-switch seam, with hierarchy built from weight
and size rather than a second typeface. Correct for a tool that is scanned, not read.

### Hierarchy
- **Display** (800, 2rem, 0.92 line-height, -0.02em): the "KOH KRET" wordmark only.
- **Title** (600, 13px): section names, place names, route names.
- **Body** (400, 13px, 1.6): descriptions and itinerary copy.
- **Label** (600, 11px, 0.2em tracking, uppercase): the three region headers — CATEGORIES, HIGHLIGHT ROUTES,
  and the English sublabels in the category rows.

### Named Rules
**The Three Kickers Rule.** Uppercase tracked labels exist in exactly three places, because the reference
poster uses them as region signage and this app inherits that. They are signage, not the eyebrow-above-every-
section trope: no section heading in the body of the app gets one.

**The 400 Floor Rule.** No text is set below weight 400 on navy. Thin white on a dark saturated ground blooms
in bright light, which is the failure mode this whole palette exists to avoid.

## 4. Elevation

Almost entirely flat. Regions separate by hairline, not by shadow or luminance step. Exactly two things cast
a shadow, and both genuinely float above the map: the pins and the place popup.

### Shadow Vocabulary
- **pin-rest** (`0 1px 3px rgb(0 0 0 / 0.5)`): lifts a pin off the land fill.
- **pin-selected** (`0 0 0 2px var(--color-primary), 0 4px 14px rgb(0 0 0 / 0.55)`): the selected pin wears a
  Kiln Clay ring, so selection reads as a colour event and not merely a size change.
- **popup** (`0 12px 32px rgb(0 0 0 / 0.45)`): the place card over the map.

### Named Rules
**The Floating-Only Rule.** If an element is not physically over the map, it gets a hairline instead of a
shadow. Sidebar, route strip, itinerary tiles and footer are all flat.

## 5. Components

### Chips
- **Category count chip** — full-round, filled with the category hue, deep-navy numeral. The number is the
  real count of verified places in that category, never an illustrative figure.
- **Route number chip** — full-round, filled with the route colour, deep-navy numeral, scales to 1.1 when its
  route is active.

### Rows and cards
- **Category row** — a hairline-separated list row, not a card: icon tile, Thai label with a small English
  sublabel, count chip. Selected state fills the icon tile with the category hue.
- **Itinerary tile** — 176px fixed-width tile in a horizontal scroller, hairline border, no shadow. Clicking
  one opens that stop on the map.
- **Popup card** — the only elevated surface. Anchored inside the map frame; it never becomes a modal.

### Inputs
- **Search** — 44px tall, panel-dark fill, hairline border, border shifts to Kiln Clay on focus. Carries a
  clear button once there is a query and an `aria-live` result count beneath it.

### Route line
A precomputed walking path along the real street graph, never a straight hop between pins. Every OSM
`way[highway]` on the island contributes edges; stops snap to their nearest node and consecutive stops are
joined by Dijkstra shortest path. All legs on all six routes resolve on the graph, so there are no
straight-line fallbacks. Drawn as two stacked strokes: a blurred halo at 45% and a crisp 1.1px core, both
animating their `stroke-dashoffset` from a normalised `pathLength` of 1. A pin can sit slightly off the line
because the pin marks the door and the line runs down the lane; that gap is real distance, not a bug.

### Signature Component: Map Pin
A 28px circle (36px selected). In browse mode it is category-coloured and carries that category's line icon;
with a route active the route's stops turn route-coloured and carry their stop number, while every other pin
stays on screen at 40% opacity and reduced saturation. A place visited twice on a loop route shows its first
stop number and announces both in its accessible name. A transparent `::before` expands the hit area to 44px
without inflating the visible mark. Clustered pins (four riverside places sit within metres of each other)
fan onto a small ring at render time; the underlying coordinates are never altered.

## 6. Do's and Don'ts

### Do:
- **Do** keep the page deep navy (#0B1220) and never pure black — glare and OLED smear are the reason.
- **Do** hold body text at or above 7:1 and re-measure with a real luminance calculation after any colour
  change. All 43 pairings in this system were computed, not estimated.
- **Do** reserve Kiln Clay (#E3714A) for active state, the flagship route, focus rings and links.
- **Do** separate regions with the single hairline token instead of adding borders, shadows or nested cards.
- **Do** show real counts and real place data; leave a field blank and design the empty state when a fact is
  not verifiable.
- **Do** animate route selection as information — the line draws in visiting order, stops appear in sequence,
  the street grid recedes. Every animation states its reduced-motion end state explicitly.

### Don't:
- **Don't** let this become neon-on-black: no glowing wires, no second glow, no HUD framing, no scanlines,
  no animated street grid. Texture that moves on its own reads as a rendering fault outdoors.
- **Don't** use gradient text, decorative glassmorphism, or a colored side-stripe border.
- **Don't** add a tracked uppercase eyebrow to body sections, or 01/02/03 numbering as scaffolding. The three
  region kickers are the whole budget.
- **Don't** put meaning into the fine street grid without promoting it to Road Major first.
- **Don't** invent places, opening hours, phone numbers, or QR destinations to fill space. The reference
  poster's phone number and Facebook link are absent here precisely because they could not be verified.
- **Don't** let the category or route count grow past what fits one unscrolled glance — "ไม่รกเกินไป" is a
  hard ceiling carried over from the original brief.
