/**
 * Line-art icon set drawn for this project. Stroke-based on a 24x24 grid (the brand mark uses 48x48),
 * tuned to stay readable down to 16px. No icon library, no emoji: the category marks are cultural
 * symbols specific to Koh Kret (a Mon chedi, an unglazed earthenware jar, a river ferry, a stilt house)
 * and a generic pack would flatten exactly the detail that matters.
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
  | "brand-chedi";

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
  // Mon riverside house: the stilts are the point, so they stay visible.
  homestay: {
    viewBox: "0 0 24 24",
    paths: [
      "M3.2 9.4 L12 3.8 L20.8 9.4",
      "M5.8 7.8 V15.6 M18.2 7.8 V15.6",
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
  // Logo mark: chedi with an extra tier and parasol ring, a canopied river boat, a waterline, and gulls.
  "brand-chedi": {
    viewBox: "0 0 48 48",
    paths: [
      "M17 4 V13",
      "M14.6 6.6 H19.4 M15.4 9.4 H18.6",
      "M11 25 C11 18.4 13.4 13.9 17 13 C20.6 13.9 23 18.4 23 25",
      "M9.4 25 H24.6",
      "M10.6 25 L9.2 30 M23.4 25 L24.8 30",
      "M7.6 30 H26.4",
      "M9 30 L7.6 34.8 M25 30 L26.4 34.8",
      "M5.8 34.8 H28.2",
      "M30 37 H44 C44 40 42 42.4 39.2 42.4 H34.8 C32 42.4 30 40 30 37 Z",
      "M33.6 37 V33.2 H40.4 V37",
      "M4 42.4 C6 41 8 43.8 10 42.4 C12 41 14 43.8 16 42.4 C18 41 20 43.8 22 42.4 C24 41 26 43.8 28 42.4",
      "M30 12.4 C31 11 32 11 33 12.4 C34 11 35 11 36 12.4 M37.4 8.8 C38.2 7.7 39 7.7 39.8 8.8 C40.6 7.7 41.4 7.7 42.2 8.8",
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
