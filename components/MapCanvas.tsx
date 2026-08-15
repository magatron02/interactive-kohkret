import { useEffect, useState } from "react";
import {
  CONTEXT_ROADS,
  ISLAND_PATH,
  MAP_VIEWBOX,
  PIERS,
  ROADS_MAJOR,
  ROADS_MINOR,
  WATER,
  project,
} from "@/lib/geo";
import { ROUTE_GEOMETRY } from "@/lib/route-paths";
import { getCategory, getPlace, placesAtSameSpot, type Place, type TourRoute } from "@/lib/places";
import { Icon } from "@/lib/icons";

const { width: VW, height: VH } = MAP_VIEWBOX;

/**
 * Two crops of the same projection. The wide one is the desktop letterbox, which keeps the whole page
 * inside one screen. On a phone that shape collapses the map to a 143px sliver, so narrow screens crop
 * the river margins instead and get a usable frame.
 *
 * The viewBox is an attribute, not a style, so this is picked in JS after mount rather than by a media
 * query. Pin positions are computed against whichever frame is live, which is what keeps a pin's tip
 * welded to its coordinate in both.
 */
const FRAME_WIDE = { x: 0, y: 0, w: VW, h: VH };
const FRAME_TALL = { x: VW / 2 - 62.5, y: 0, w: 125, h: VH };

function useFrame() {
  // Server and first client render agree on the wide frame; narrow screens swap after mount.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow ? FRAME_TALL : FRAME_WIDE;
}

export default function MapCanvas({
  visiblePlaces,
  activeRoute,
  selectedPlaceId,
  onSelectPlace,
  /** Distinguishes "nothing matched your filter" from "you have not filtered yet". */
  hasSelection,
}: {
  visiblePlaces: Place[];
  activeRoute: TourRoute | null;
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
  hasSelection: boolean;
}) {
  const frame = useFrame();
  const routePlaces = activeRoute
    ? activeRoute.stops.map((s) => getPlace(s.placeId)).filter((p): p is Place => Boolean(p))
    : [];
  const routeLine = activeRoute ? ROUTE_GEOMETRY[activeRoute.id]?.d : undefined;
  const routeStopIds = new Set(routePlaces.map((p) => p.id));

  // A highlighted route shows its own stops and nothing else. Keeping the rest on screen — even
  // dimmed — put unrelated markers in among the numbers and made the sequence hard to follow.
  const routeUnique = routePlaces.filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i);
  const shown = activeRoute ? routeUnique : visiblePlaces;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-[var(--color-bg-map)] ring-1 ring-[var(--color-hairline)] ${
        activeRoute ? "map-has-route" : ""
      }`}
    >
      <svg
        viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`}
        className="block h-auto w-full"
        role="img"
        aria-label="แผนที่เกาะเกร็ดและพื้นที่โดยรอบ แสดงแม่น้ำเจ้าพระยา ชายฝั่งจริง และโครงข่ายถนนจริงจาก OpenStreetMap"
      >
        <defs>
          <clipPath id="island-clip">
            <path d={ISLAND_PATH} />
          </clipPath>
          <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
        </defs>

        {/* Ground plane is land — Pak Kret on both banks. The river is cut into it below. */}
        <rect x="0" y="0" width={VW} height={VH} className="mainland" />

        {/* The far bank, faint. It exists so Koh Kret reads as an island in a city, not a shape in a void. */}
        <g className="context-roads">
          {CONTEXT_ROADS.map((d, i) => (
            <path key={`c${i}`} d={d} />
          ))}
        </g>

        {/* Chao Phraya and the Lat Kret canal — the water that made this an island in 1722. */}
        <g className="water">
          {WATER.map((d, i) => (
            <path key={`w${i}`} d={d} />
          ))}
        </g>

        <path d={ISLAND_PATH} className="island-land" />

        <g clipPath="url(#island-clip)">
          {ROADS_MINOR.map((d, i) => (
            <path key={`n${i}`} d={d} className="road road--minor" />
          ))}
          {ROADS_MAJOR.map((d, i) => (
            <path key={`m${i}`} d={d} className="road road--major" />
          ))}
        </g>

        <path d={ISLAND_PATH} className="island-edge" />

        {PIERS.map((d, i) => (
          <path key={`p${i}`} d={d} className="road road--pier" />
        ))}

        {activeRoute && routeLine && (
          <g key={activeRoute.id} style={{ color: activeRoute.color }}>
            <path d={routeLine} className="route-line route-line--glow" pathLength={1} filter="url(#route-glow)" />
            <path d={routeLine} className="route-line route-line--core" pathLength={1} />
          </g>
        )}
      </svg>

      <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-center gap-0.5 text-[var(--color-ink)] sm:right-5 sm:top-5">
        <Icon name="compass" className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.2} />
        <span className="text-[10px] font-semibold tracking-[0.18em]">N</span>
      </div>

      {shown.length === 0 && (
        <p className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto max-w-xs rounded-lg bg-[var(--color-bg-panel)]/90 px-4 py-2.5 text-center text-xs leading-relaxed text-[var(--color-ink-muted)]">
          {hasSelection
            ? "ไม่พบสถานที่ที่ตรงกับที่ค้นหา ลองเปลี่ยนคำค้นหรือเปิดหมวดหมู่อื่น"
            : "เลือกหมวดหมู่เพื่อแสดงสถานที่บนแผนที่"}
        </p>
      )}

      {shown.map((place, i) => {
        const onRoute = routeStopIds.has(place.id);
        // A loop route can visit one place twice (the day trip starts and ends at the pier), so the
        // pin carries its first stop number and announces every visit.
        const visits = activeRoute
          ? activeRoute.stops.flatMap((s, idx) => (s.placeId === place.id ? [idx + 1] : []))
          : [];
        const stopIndex = visits.length ? visits[0] - 1 : -1;
        const category = getCategory(place.category);
        const color = onRoute && activeRoute ? activeRoute.color : category.color;
        const ink = onRoute && activeRoute ? activeRoute.ink : category.ink;
        const isSelected = place.id === selectedPlaceId;
        const { x, y } = project(place.lat, place.lng);
        // Only the pin painted on top of a cluster carries the badge; z-order is by latitude, so the
        // southernmost of a group is the one in front.
        const neighbours = placesAtSameSpot(place, shown);
        const buried = neighbours.filter((n) => project(n.lat, n.lng).y < y).length;

        return (
          <button
            key={place.id}
            type="button"
            onClick={() => onSelectPlace(place.id)}
            aria-label={
              (visits.length
                ? `จุดที่ ${visits.join(" และ ")} — ${place.name} — ${category.label}`
                : `${place.name} — ${category.label}`) +
              (buried > 0 ? ` และอีก ${buried} แห่งที่จุดเดียวกัน` : "")
            }
            title={visits.length > 1 ? `${place.name} (จุดที่ ${visits.join(", ")})` : place.name}
            className={`map-pin ${isSelected ? "map-pin--selected" : ""} ${
              activeRoute && !onRoute ? "map-pin--dim" : ""
            }`}
            style={{
              // The tip sits on the coordinate. Percentages of the live frame — the same rectangle the
              // SVG is showing — so the anchor holds through every resize and both crops.
              left: `${((x - frame.x) / frame.w) * 100}%`,
              top: `${((y - frame.y) / frame.h) * 100}%`,
              // Southern pins overlap northern ones, the way a paper map stacks markers by depth.
              zIndex: isSelected ? 40 : 10 + Math.round(y),
              // Drop order: along the route when one is picked, otherwise in the order they were filtered in.
              animationDelay: `${(stopIndex >= 0 ? stopIndex : i) * 45}ms`,
            }}
          >
            <span className="map-pin__body" style={{ backgroundColor: color, color: ink }}>
              {stopIndex >= 0 ? (
                <span className="text-[11px] font-bold leading-none">{stopIndex + 1}</span>
              ) : (
                <Icon name={place.category} className="h-3.5 w-3.5" strokeWidth={1.8} />
              )}
            </span>
            {/* The pin on top of a stack says how many are under it, so nothing is silently buried. */}
            {buried > 0 && <span className="map-pin__count">+{buried}</span>}
            <span className="map-pin__stem" style={{ borderTopColor: color }} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
