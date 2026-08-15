import { ROUTES } from "@/lib/places";
import { ROUTE_GEOMETRY, formatDistance } from "@/lib/route-paths";

export default function RouteLegend({
  activeRouteId,
  onSelect,
}: {
  activeRouteId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <section aria-labelledby="routes-heading" className="panel-surface">
      {/* Same reservation as the category panel: the button occupies its space whether or not it is
          shown, so choosing a route does not nudge the map and the legend under it. */}
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2
          id="routes-heading"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]"
        >
          Highlight Routes
        </h2>
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-hidden={!activeRouteId}
          tabIndex={activeRouteId ? undefined : -1}
          className={`-mr-2 inline-flex min-h-9 items-center rounded px-2 text-xs text-[var(--color-ink-muted)] underline-offset-2 transition-colors duration-150 hover:text-[var(--color-ink)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-deep)] ${
            activeRouteId ? "" : "pointer-events-none invisible"
          }`}
        >
          ล้างเส้นทาง
        </button>
      </div>

      {/* Phone: one scrollable row so the six routes never push the itinerary below the fold.
          Desktop: they wrap into the legend strip the reference poster runs under the map. */}
      <ul className="edge-fade -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:gap-x-4 lg:gap-y-1.5 lg:overflow-visible lg:px-0 lg:pb-0">
        {ROUTES.map((route, i) => {
          const isActive = route.id === activeRouteId;
          return (
            <li key={route.id} className="min-w-0 shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => onSelect(isActive ? null : route.id)}
                aria-pressed={isActive}
                className={`flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-deep)] lg:min-h-0 lg:py-1 ${
                  isActive ? "bg-[var(--color-bg-panel)]" : "hover:bg-[var(--color-bg-panel)]"
                }`}
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums transition-transform duration-200"
                  style={{
                    backgroundColor: route.color,
                    color: route.ink,
                    transform: isActive ? "scale(1.1)" : undefined,
                  }}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block whitespace-nowrap text-[13px] leading-tight lg:truncate lg:whitespace-normal ${
                      isActive ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ink-muted)]"
                    }`}
                  >
                    {route.name}
                  </span>
                  <span className="block truncate text-[10px] text-[var(--color-ink-faint)]">
                    {route.durationLabel}
                    {ROUTE_GEOMETRY[route.id] && ` · เดิน ${formatDistance(ROUTE_GEOMETRY[route.id].metres)}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
