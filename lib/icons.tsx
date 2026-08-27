/**
 * Line-art icon set drawn for this project. Stroke-based on a 24x24 grid, tuned to stay readable down
 * to 16px. The two brand marks are not here — the KOH KRET lockup and the อบต. seal are supplied
 * artwork painted as CSS masks; see scripts/build-mask-asset.mjs. No icon library, no emoji: the category marks are cultural
 * symbols specific to Koh Kret (a Mon chedi, an unglazed earthenware jar, a river ferry, a stilt house)
 * and a generic pack would flatten exactly the detail that matters. The generic UI marks (search,
 * close, chevron, route, globe, compass, zoom, expand) are drawn in the minimal single-stroke style
 * common to open line-icon sets — Tabler, Feather, Lucide and the like, the kind catalogued at
 * allsvgicons.com — adapted to this file's own 24x24 grid and stroke weight rather than imported as
 * files, so every icon in the app shares one hand, not two.
 */

export type IconName =
  | "temple"
  | "craft"
  | "restaurant"
  | "cafe"
  | "homestay"
  | "pier"
  | "compass"
  | "search"
  | "close"
  | "chevron-right"
  | "route"
  | "globe"
  | "zoom-in"
  | "zoom-out"
  | "expand"
  | "tour-360";

type IconDef = { viewBox: string; paths: string[] };

const ICONS: Record<IconName, IconDef> = {
  // Tiered flared base, bell dome, spire with a parasol ring — a Thai/Mon chedi, not a generic triangle.
  temple: {
    viewBox: "0 0 24 24",
    paths: [
      "M12 2 V6.2",
      "M10.9 4 H13.1",
      "M8.4 13.6 C8.4 9.3 9.9 6.6 12 6.2 C14.1 6.6 15.6 9.3 15.6 13.6",
      "M7.2 13.6 H16.8",
      "M8 13.6 L6.2 18.6 M16 13.6 L17.8 18.6",
      "M4.6 18.6 H19.4",
    ],
  },
  // Unglazed earthenware jar with an incised band — Koh Kret's signature craft. The flared rim and short
  // neck are load-bearing: without them the silhouette is just a rounded vessel and collides with `pier`.
  craft: {
    viewBox: "0 0 24 24",
    paths: [
      "M8.4 4.4 H15.6",
      "M10 4.4 V6.6 M14 4.4 V6.6",
      "M10 6.6 C6.5 8.6 5 11.1 5 13.6 C5 17.5 8.1 20.4 12 20.4 C15.9 20.4 19 17.5 19 13.6 C19 11.1 17.5 8.6 14 6.6",
      "M6.3 11.6 C9.2 13 14.8 13 17.7 11.6",
    ],
  },
  // Fork and knife side by side; crossing them turns to mush at 16px.
  restaurant: {
    viewBox: "0 0 24 24",
    paths: [
      "M7 3 V8.4 C7 10 8.2 11.2 9.6 11.4 C11 11.2 12.2 10 12.2 8.4 V3",
      "M9.6 3 V7.4",
      "M9.6 11.4 V21",
      "M16.4 2.8 C18.2 5.4 18.9 8.2 18.6 11 C18.5 12.4 17.7 13.3 16.4 13.4 Z",
      "M15.5 13.4 H17.3 V19.8 C17.3 21.1 15.5 21.1 15.5 19.8 Z",
    ],
  },
  cafe: {
    viewBox: "0 0 24 24",
    paths: [
      "M5.5 9 H16.5 V13.5 C16.5 15.7 14.7 17.5 12.5 17.5 H9.5 C7.3 17.5 5.5 15.7 5.5 13.5 Z",
      "M16.5 10.2 H18.4 C19.8 10.2 20.8 11.2 20.8 12.6 C20.8 14 19.8 15 18.4 15 H16.5",
      "M3.8 18.4 C4.6 19.8 6 20.4 7.6 20.4 H16.4 C18 20.4 19.4 19.8 20.2 18.4",
      "M9.4 6.4 C8.5 5.5 10.3 4.5 9.4 3.4",
      "M13.4 6.4 C12.5 5.5 14.3 4.5 13.4 3.4",
    ],
  },
  // Mon riverside house: the stilts are the point, so they stay visible. The roofline kicks up at both
  // eaves — a chofah gable, not a plain triangle — to read as Thai-vernacular rather than a generic hut,
  // in the same family as the tiered chedi in `temple`.
  homestay: {
    viewBox: "0 0 24 24",
    paths: [
      "M12 4.2 V2.4",
      "M2.6 10.2 C3.1 8.5 4.4 7.9 5.3 9.3 L12 4.2 L18.7 9.3 C19.6 7.9 20.9 8.5 21.4 10.2",
      "M5.8 8.6 V15.6 M18.2 8.6 V15.6",
      "M4.4 15.6 H19.6",
      "M10.4 15.6 V11.2 H13.6 V15.6",
      "M7 15.6 V20.4 M12 15.6 V20.4 M17 15.6 V20.4",
      "M3.4 20.4 H20.6",
    ],
  },
  // The category is "จุดขึ้น-ลงเรือ", so this draws the jetty rather than a boat: deck, piles standing in
  // the water, a mooring post, and the river beneath. An earlier hull-and-canopy version read as a covered
  // bowl and was indistinguishable from `craft` at pin size.
  pier: {
    viewBox: "0 0 24 24",
    paths: [
      "M2 11.5 H22",
      "M6.5 11.5 V17.5 M15.5 11.5 V17.5",
      "M19 11.5 V6.4 M17 6.4 H21",
      "M2 20 C4.7 18.7 7.3 21.3 10 20 C12.7 18.7 15.3 21.3 18 20 C19.3 19.4 20.7 19.7 22 20.4",
    ],
  },
  compass: {
    viewBox: "0 0 24 24",
    paths: [
      "M20.6 12 A8.6 8.6 0 0 1 3.4 12 A8.6 8.6 0 0 1 20.6 12",
      "M12 2.2 L13.7 10.3 L20.1 12 L13.7 13.7 L12 19.6 L10.3 13.7 L3.9 12 L10.3 10.3 Z",
      "M16.5 7.5 L17.7 6.3 M6.3 6.3 L7.5 7.5 M16.5 16.5 L17.7 17.7 M6.3 17.7 L7.5 16.5",
    ],
  },
  search: {
    viewBox: "0 0 24 24",
    paths: ["M17.2 10.8 A6.4 6.4 0 0 1 4.4 10.8 A6.4 6.4 0 0 1 17.2 10.8", "M15.3 15.3 L20.4 20.4"],
  },
  close: {
    viewBox: "0 0 24 24",
    paths: ["M5.5 5.5 L18.5 18.5 M18.5 5.5 L5.5 18.5"],
  },
  "chevron-right": {
    viewBox: "0 0 24 24",
    paths: ["M9.5 5 L16.5 12 L9.5 19"],
  },
  route: {
    viewBox: "0 0 24 24",
    paths: [
      "M7.5 18 A2 2 0 0 1 3.5 18 A2 2 0 0 1 7.5 18",
      "M20.5 6 A2 2 0 0 1 16.5 6 A2 2 0 0 1 20.5 6",
      "M5.5 16 C5.5 12.5 9 12 12 12 C15 12 18.5 11.5 18.5 8",
    ],
  },
  globe: {
    viewBox: "0 0 24 24",
    paths: [
      "M21 12 A9 9 0 0 1 3 12 A9 9 0 0 1 21 12",
      "M3 12 H21",
      "M12 3 C14.6 5.4 16 8.6 16 12 C16 15.4 14.6 18.6 12 21 C9.4 18.6 8 15.4 8 12 C8 8.6 9.4 5.4 12 3 Z",
    ],
  },
  // Plus and minus for the zoom control — was two literal "+"/"−" characters, which meant the button
  // face came from whatever font the OS substituted rather than this icon system.
  "zoom-in": {
    viewBox: "0 0 24 24",
    paths: ["M12 5 V19", "M5 12 H19"],
  },
  "zoom-out": {
    viewBox: "0 0 24 24",
    paths: ["M5 12 H19"],
  },
  // Four corners pulling outward — "back to the full island view", not a literal ⤢ glyph.
  expand: {
    viewBox: "0 0 24 24",
    paths: [
      "M9 3 H3 V9",
      "M15 3 H21 V9",
      "M9 21 H3 V15",
      "M15 21 H21 V15",
    ],
  },
  // A flattened horizon ellipse wrapping a small globe, with spin ticks at each end — the standard
  // "360° panorama" mark, not a literal camera (which would collide with no other icon here, but reads
  // as "take a photo" rather than "look around").
  "tour-360": {
    viewBox: "0 0 24 24",
    paths: [
      "M3.4 12 C3.4 9.5 7.3 7.5 12 7.5 C16.7 7.5 20.6 9.5 20.6 12 C20.6 14.5 16.7 16.5 12 16.5 C7.3 16.5 3.4 14.5 3.4 12 Z",
      "M9.3 12 A2.7 2.7 0 0 1 14.7 12 A2.7 2.7 0 0 1 9.3 12",
      "M4.4 9.8 L3.4 12 L5.2 12.9",
      "M19.6 14.2 L20.6 12 L18.8 11.1",
    ],
  },
};

export function Icon({
  name,
  className,
  strokeWidth = 1.5,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  const icon = ICONS[name];
  return (
    <svg
      viewBox={icon.viewBox}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icon.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
