import { getCategory, getPlace, type TourRoute } from "@/lib/places";
import { routeDirectionsLink } from "@/lib/maps-links";
import { Icon } from "@/lib/icons";

export default function ItineraryTimeline({
  route,
  onSelectPlace,
}: {
  route: TourRoute | null;
  onSelectPlace: (id: string) => void;
}) {
  if (!route) return null;

  const maps = routeDirectionsLink(route);

  return (
    <section aria-labelledby="itinerary-heading" className="mt-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="itinerary-heading" className="text-[13px] font-semibold text-[var(--color-ink)]">
          แผนเที่ยว: {route.name}
        </h2>
        <p className="text-xs text-[var(--color-ink-faint)]">{route.tagline}</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <a
          href={maps.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--color-hairline)] px-3 text-[13px] text-[var(--color-ink-muted)] transition-colors duration-150 hover:border-[var(--color-primary)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-deep)]"
        >
          <Icon name="route" className="h-4 w-4" strokeWidth={1.8} />
          เปิดเส้นทางทั้งหมดใน Google Maps
        </a>
        {/* The Maps URL scheme caps intermediate waypoints, so say what was left out rather than
            handing someone a quietly shortened trip. */}
        {maps.droppedStops > 0 && (
          <p className="text-[11px] text-[var(--color-ink-faint)]">
            Google Maps รับจุดแวะได้จำกัด ลิงก์นี้จึงมี {maps.usedStops} จุดแรก (ขาดอีก{" "}
            {maps.droppedStops} จุด)
          </p>
        )}
      </div>

      <ol className="edge-fade -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-3 lg:mx-0 lg:px-0">
        {route.stops.map((stop, i) => {
          const place = getPlace(stop.placeId);
          if (!place) return null;
          const category = getCategory(place.category);
          return (
            <li key={`${stop.placeId}-${stop.time}`} className="stagger-in" style={{ animationDelay: `${i * 40}ms` }}>
              <button
                type="button"
                onClick={() => onSelectPlace(place.id)}
                className="flex h-full w-44 shrink-0 flex-col gap-2 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-bg-panel)] p-3 text-left transition-colors duration-150 hover:border-[var(--color-ink-faint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-deep)]"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums"
                    style={{ backgroundColor: route.color, color: route.ink }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-[var(--color-ink-muted)]">
                    {stop.time}
                  </span>
                </span>

                <span className="text-[13px] font-medium leading-snug text-[var(--color-ink)]">
                  {place.name}
                </span>

                <span
                  className="mt-auto inline-flex items-center gap-1.5 text-[11px]"
                  style={{ color: category.color }}
                >
                  <Icon name={category.id} className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {category.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
