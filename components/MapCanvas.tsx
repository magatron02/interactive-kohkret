import { ISLAND_PATH, MAP_VIEWBOX, PIERS, ROADS_MAJOR, ROADS_MINOR } from "@/lib/geo";
import { ROUTE_GEOMETRY } from "@/lib/route-paths";
import { getCategory, getPlace, type Place, type TourRoute } from "@/lib/places";
import { Icon } from "@/lib/icons";

const { width: VW, height: VH } = MAP_VIEWBOX;

/**
 * Real geography puts four riverside places within a few metres of each other, which at pin size is
 * one unreadable blob. Fan tight clusters onto a small ring around their centroid so every pin stays
 * clickable. The underlying lat/lng in lib/places.ts is untouched — this is a render-time concern only.
 */
const CLUSTER_RADIUS = 4.2; // SVG units; roughly one pin diameter at typical render size
const FAN_RADIUS = 3.4;

type PositionedPlace = Place & { px: number; py: number; nudged: boolean };

function declutter(places: Place[]): PositionedPlace[] {
  const groups: Place[][] = [];
  for (const place of places) {
    const group = groups.find((g) =>
      g.some((other) => Math.hypot(other.mapX - place.mapX, other.mapY - place.mapY) < CLUSTER_RADIUS)
    );
    if (group) group.push(place);
    else groups.push([place]);
  }

  return groups.flatMap((group): PositionedPlace[] => {
    if (group.length === 1) {
      const [only] = group;
      return [{ ...only, px: only.mapX, py: only.mapY, nudged: false }];
    }
    const cx = group.reduce((sum, p) => sum + p.mapX, 0) / group.length;
    const cy = group.reduce((sum, p) => sum + p.mapY, 0) / group.length;
    return group.map((place, i) => {
      const angle = (i / group.length) * Math.PI * 2 - Math.PI / 2;
      return {
        ...place,
        px: cx + Math.cos(angle) * FAN_RADIUS,
        py: cy + Math.sin(angle) * FAN_RADIUS,
        nudged: true,
      };
    });
  });
}

export default function MapCanvas({
  visiblePlaces,
  activeRoute,
  selectedPlaceId,
  onSelectPlace,
}: {
  visiblePlaces: Place[];
  activeRoute: TourRoute | null;
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
}) {
  const routePlaces = activeRoute
    ? activeRoute.stops.map((s) => getPlace(s.placeId)).filter((p): p is Place => Boolean(p))
    : [];

  // The line is a precomputed walking path along the real street network (lib/route-paths.ts), not a
  // straight hop between pins — so it bends around the lanes a visitor would actually follow.
  const routeLine = activeRoute ? ROUTE_GEOMETRY[activeRoute.id]?.d : undefined;
  const routeStopIds = new Set(routePlaces.map((p) => p.id));

  // With a route active the numbered stops lead, but the rest of the island stays on screen dimmed
  // rather than vanishing — a visitor still wants to see what else is near the path they picked.
  const routeUnique = routePlaces.filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i);
  const shown = declutter(
    activeRoute
      ? [...routeUnique, ...visiblePlaces.filter((p) => !routeStopIds.has(p.id))]
      : visiblePlaces
  );

  const isEmpty = shown.length === 0;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-[var(--color-bg-map)] ring-1 ring-[var(--color-hairline)] ${
        activeRoute ? "map-has-route" : ""
      }`}
    >
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="block h-auto w-full"
        role="img"
        aria-label="แผนที่เกาะเกร็ด แสดงชายฝั่งจริงและโครงข่ายถนนจริงจาก OpenStreetMap"
      >
        <defs>
          <clipPath id="island-clip">
            <path d={ISLAND_PATH} />
          </clipPath>
          <radialGradient id="water-glow" cx="50%" cy="45%" r="62%">
            <stop offset="0%" stopColor="var(--color-map-glow)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--color-map-glow)" stopOpacity="0" />
          </radialGradient>
          <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
        </defs>

        {/* Water plane, with the soft centre glow the reference uses to lift the island off the page */}
        <rect x="0" y="0" width={VW} height={VH} fill="url(#water-glow)" />

        {/* Two faint contour echoes of the coastline, the way a nautical chart shows depth bands */}
        <path d={ISLAND_PATH} className="island-contour island-contour--far" />
        <path d={ISLAND_PATH} className="island-contour island-contour--near" />

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

        {/* Jetties stand out over the water, so they are drawn outside the coastline clip. */}
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

      {/* Compass */}
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-center gap-0.5 text-[var(--color-ink)] sm:right-5 sm:top-5">
        <Icon name="compass" className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.2} />
        <span className="text-[10px] font-semibold tracking-[0.18em]">N</span>
      </div>

      {isEmpty && (
        <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-[var(--color-ink-muted)]">
          ไม่พบสถานที่ที่ตรงกับที่ค้นหา ลองเปลี่ยนคำค้นหรือเปิดหมวดหมู่เพิ่ม
        </p>
      )}

      {shown.map((place) => {
        const onRoute = routeStopIds.has(place.id);
        // A loop route can visit one place twice (the day trip starts and ends at the pier), so the
        // pin carries its first stop number and announces every visit.
        const visits = activeRoute
          ? activeRoute.stops.flatMap((s, i) => (s.placeId === place.id ? [i + 1] : []))
          : [];
        const stopIndex = visits.length ? visits[0] - 1 : -1;
        const category = getCategory(place.category);
        const color = onRoute && activeRoute ? activeRoute.color : category.color;
        const ink = onRoute && activeRoute ? activeRoute.ink : category.ink;
        const isSelected = place.id === selectedPlaceId;

        return (
          <button
            key={activeRoute ? `${activeRoute.id}-${place.id}` : place.id}
            type="button"
            onClick={() => onSelectPlace(place.id)}
            aria-label={
              visits.length
                ? `จุดที่ ${visits.join(" และ ")} — ${place.name} — ${category.label}`
                : `${place.name} — ${category.label}`
            }
            title={visits.length > 1 ? `${place.name} (จุดที่ ${visits.join(", ")})` : place.name}
            className={`map-pin ${activeRoute ? "stagger-in" : ""} ${isSelected ? "map-pin--selected" : ""} ${
              activeRoute && !onRoute ? "map-pin--dim" : ""
            }`}
            style={{
              left: `${(place.px / VW) * 100}%`,
              top: `${(place.py / VH) * 100}%`,
              backgroundColor: color,
              color: ink,
              animationDelay: stopIndex >= 0 ? `${stopIndex * 40}ms` : undefined,
            }}
          >
            {stopIndex >= 0 ? (
              <span className="text-[11px] font-bold leading-none sm:text-xs">{stopIndex + 1}</span>
            ) : (
              <Icon name={place.category} className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.8} />
            )}
          </button>
        );
      })}
    </div>
  );
}
