import { useCallback, useEffect, useRef, useState } from "react";
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
import { clusterOf, frontPlaces } from "@/lib/pin-stack";
import { routeArrows, type WalkRoute } from "@/lib/walk-routing";
import { Icon } from "@/lib/icons";
import { FRAME_TALL, FRAME_WIDE, clampFrame, zoomFrame, type Frame } from "@/lib/frame";

const { width: VW, height: VH } = MAP_VIEWBOX;

/** The width below which the wide letterbox renders too short to be a usable map. */
const NARROW_PX = 640;

/**
 * Which crop to show, decided by the map's own rendered width rather than by a viewport media query.
 * The container is the thing that actually determines whether the letterbox is usable, and observing
 * it directly also survives resizes that never deliver a matchMedia `change` event.
 *
 * Server and first client render agree on the wide frame; the observer corrects it on mount.
 */
function useBaseFrame(ref: React.RefObject<HTMLElement | null>) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setNarrow(el.getBoundingClientRect().width < NARROW_PX);
    measure();
    // ResizeObserver is the right instrument here — it catches the container changing for any reason,
    // including a sidebar opening, not just the window moving. `resize` is kept as a belt-and-braces
    // fallback for environments that deliver one but not the other.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);
  return narrow ? FRAME_TALL : FRAME_WIDE;
}

export default function MapCanvas({
  visiblePlaces,
  activeRoute,
  selectedPlaceId,
  onSelectPlace,
  /** Distinguishes "nothing matched your filter" from "you have not filtered yet". */
  hasSelection,
  /** Ad-hoc A→B routes from RoutePicker — null while a themed route is active, so the two never draw
   *  on top of each other. */
  walkRoutes,
}: {
  visiblePlaces: Place[];
  activeRoute: TourRoute | null;
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
  hasSelection: boolean;
  walkRoutes?: WalkRoute[] | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const base = useBaseFrame(wrapRef);
  const [frame, setFrame] = useState<Frame>(base);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ px: number; py: number; fx: number; fy: number } | null>(null);

  /**
   * Zoom eases toward a target instead of jumping to it. The viewBox is an attribute, so CSS cannot
   * transition it — this tweens the four numbers on rAF with the same ease-out curve the rest of the
   * app uses. Panning writes straight through, because a drag should track the finger exactly.
   */
  const target = useRef<Frame>(frame);
  const raf = useRef<number | null>(null);
  // 0.22 per frame settles within a pixel in about seven frames at 60Hz: quick, but visibly eased.
  const EASE_K = 0.22;
  const ease = (cur: Frame, t: Frame): Frame => ({
    x: cur.x + (t.x - cur.x) * EASE_K,
    y: cur.y + (t.y - cur.y) * EASE_K,
    w: cur.w + (t.w - cur.w) * EASE_K,
    h: cur.h + (t.h - cur.h) * EASE_K,
  });
  const animateTo = useCallback((next: Frame) => {
    target.current = next;
    // Take the first step synchronously. The input then always produces movement, even where rAF is
    // throttled — a background tab, a headless render — rather than being silently dropped.
    setFrame((cur) => ease(cur, next));
    if (raf.current !== null) return;
    const step = () => {
      raf.current = null;
      setFrame((cur) => {
        const t = target.current;
        if (Math.abs(t.x - cur.x) + Math.abs(t.y - cur.y) + Math.abs(t.w - cur.w) < 0.02) return t;
        raf.current = requestAnimationFrame(step);
        return ease(cur, t);
      });
    };
    raf.current = requestAnimationFrame(step);
  }, []);
  useEffect(() => () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
  }, []);

  const setFrameNow = useCallback((f: Frame) => {
    target.current = f;
    setFrame(f);
  }, []);

  // A breakpoint change re-frames the map, which resets any zoom — the tall crop is a different view.
  // React's "adjust state when a prop changes" pattern, in state rather than a ref: an effect would
  // paint one frame of the old crop inside the new box first, and the lint rules here forbid both a
  // synchronous setState inside an effect and a ref touched during render.
  const [framedFor, setFramedFor] = useState(base);
  if (framedFor !== base) {
    setFramedFor(base);
    setFrame(base);
  }
  // The animation goal follows the reset. Only on a re-frame — mirroring `frame` here every time
  // would cancel every zoom tween on its first eased step.
  useEffect(() => {
    target.current = base;
  }, [base]);

  const zoomed = frame.w < base.w - 0.001;

  /** Zoom about a focal point given in 0..1 of the current frame, so the spot under the cursor stays put. */
  const zoomBy = useCallback(
    (factor: number, fx = 0.5, fy = 0.5) => {
      animateTo(zoomFrame(base, target.current, factor, fx, fy));
    },
    [base, animateTo]
  );

  /**
   * Wheel-to-zoom has to be a native non-passive listener. React routes onWheel through a delegated
   * passive listener, so preventDefault there is ignored and the page scrolls away underneath the
   * zoom. Bound directly on the element, it stops.
   */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? 1.25 : 1 / 1.25, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!zoomed) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, fx: frame.x, fy: frame.y };
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const prev = target.current;
    setFrameNow(
      clampFrame(base, {
        ...prev,
        x: d.fx - ((e.clientX - d.px) / r.width) * prev.w,
        y: d.fy - ((e.clientY - d.py) / r.height) * prev.h,
      })
    );
  }

  const endDrag = () => {
    drag.current = null;
  };

  const routePlaces = activeRoute
    ? activeRoute.stops.map((s) => getPlace(s.placeId)).filter((p): p is Place => Boolean(p))
    : [];
  const routeGeo = activeRoute ? ROUTE_GEOMETRY[activeRoute.id] : undefined;
  const routeLine = routeGeo?.d;
  const routeStopIds = new Set(routePlaces.map((p) => p.id));

  /**
   * Walking a route one stop at a time: the line reveals up to whichever stop was last tapped,
   * instead of the whole path appearing at once. `progress` is a fraction of the drawn line (0..1),
   * taken straight from `stopOffsets` — real walking distance, not stop count — and driven by the
   * same `selectedPlaceId` that already opens a pin's popup, so tapping a stop on the map or in the
   * itinerary is the one gesture that does both.
   *
   * Adjusted during render, the same pattern `framedFor` above uses: an effect would paint one frame
   * at the old progress first, and the lint rules here forbid both a synchronous setState inside an
   * effect and a ref read during render.
   */
  const routeKey = activeRoute?.id ?? null;
  const [progressState, setProgressState] = useState({ routeKey, forId: selectedPlaceId, value: 0 });
  if (progressState.routeKey !== routeKey) {
    // A different route (or none) — start its walk over from the beginning.
    setProgressState({ routeKey, forId: selectedPlaceId, value: 0 });
  } else if (progressState.forId !== selectedPlaceId) {
    const offsets = routeGeo?.stopOffsets;
    const matches = offsets && selectedPlaceId ? offsets.filter((o) => o.placeId === selectedPlaceId) : [];
    // Not a stop on this route (or one reached only by boat) — leave progress where it was. A loop
    // revisits its first stop at the end; land on whichever occurrence is next ahead of where you
    // already are, so re-tapping the start pin after finishing the loop reveals the return leg
    // rather than snapping the line back to zero.
    const value = matches.length
      ? (matches.find((m) => m.offset >= progressState.value)?.offset ?? matches[matches.length - 1].offset)
      : progressState.value;
    setProgressState({ routeKey, forId: selectedPlaceId, value });
  }
  const progress = progressState.value;
  const walkedArrows = routeGeo?.arrows?.filter((a) => a.offset <= progress + 0.001) ?? [];

  // A highlighted route shows its own numbered stops. Anything else on screen has to be asked for:
  // `visiblePlaces` is empty until a category or a search narrows it, so the two can be combined
  // without the clutter that showing everything-dimmed produced.
  const routeUnique = routePlaces.filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i);
  const shown = activeRoute
    ? [...routeUnique, ...visiblePlaces.filter((p) => !routeStopIds.has(p.id))]
    : visiblePlaces;

  return (
    <div
      ref={wrapRef}
      // `z-0` is load-bearing: it makes this a stacking context so the pins' z-indexes (up to 150 for a
      // selected one, 200 for the zoom controls) stay *inside* the map. Without it they competed
      // directly with the popup's z-30 in the page's own stacking context, and the selected pin painted
      // straight over the card describing it.
      className={`relative z-0 w-full overflow-hidden rounded-2xl bg-[var(--color-bg-map)] ring-1 ring-[var(--color-hairline)] ${
        activeRoute ? "map-has-route" : ""
      }`}
    >
      <svg
        ref={svgRef}
        viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`}
        className={`block h-auto w-full touch-none ${zoomed ? "cursor-grab active:cursor-grabbing" : ""}`}
        role="img"
        aria-label="แผนที่เกาะเกร็ดและพื้นที่โดยรอบ แสดงแม่น้ำเจ้าพระยา ชายฝั่งจริง และโครงข่ายถนนจริงจาก OpenStreetMap"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          zoomBy(1.8, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
        }}
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
            {/* The whole route, faint, so its shape and destination are visible before you have tapped
                a single stop — walking it one stop at a time should not mean starting from a blank map. */}
            <path d={routeLine} className="route-line route-line--ghost" />
            {/* Revealed up to `progress` via a normalised dash: pathLength=1 makes stroke-dashoffset a
                plain 0..1 fraction of the line regardless of its real length, and the offset change is
                a CSS transition (not a mount-only keyframe), so each tap animates from where you left
                off rather than re-drawing the whole route from zero. */}
            <path
              d={routeLine}
              className="route-line route-line--glow"
              pathLength={1}
              style={{ strokeDashoffset: 1 - progress }}
              filter="url(#route-glow)"
            />
            <path
              d={routeLine}
              className="route-line route-line--core"
              pathLength={1}
              style={{ strokeDashoffset: 1 - progress }}
            />
            {/* One chevron per walked leg, at its midpoint, pointing the way you actually walk it. Only
                the legs already revealed get one, so an arrow never points at ground you have not
                reached yet on the line — it appears the moment its leg is drawn. */}
            {walkedArrows.map((a, i) => (
              <path
                key={i}
                d="M-1,-1.3 L1,0 L-1,1.3"
                className="route-arrow"
                style={{ animationDelay: `${i * 60}ms` }}
                transform={`translate(${a.x},${a.y}) rotate(${a.angle})`}
              />
            ))}
          </g>
        )}

        {/* Ad-hoc A→B routes from RoutePicker — drawn in full immediately, no stop-by-stop reveal,
            since there is no itinerary order to walk through one tap at a time. */}
        {!activeRoute &&
          walkRoutes?.map((r, i) => {
            const d = "M" + r.path.map(([x, y]) => `${x},${y}`).join("L");
            const color = i === 0 ? "var(--color-route-4)" : "var(--color-ink-faint)";
            return (
              <g key={i} style={{ color }}>
                <path d={d} className={`walk-route ${i > 0 ? "walk-route--alt" : ""}`} />
                {routeArrows(r.path).map((a, j) => (
                  <path
                    key={j}
                    d="M-1,-1.3 L1,0 L-1,1.3"
                    className="route-arrow"
                    transform={`translate(${a.x},${a.y}) rotate(${a.angle})`}
                  />
                ))}
              </g>
            );
          })}
      </svg>

      <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-center gap-0.5 text-[var(--color-ink)] sm:right-5 sm:top-5">
        <Icon name="compass" className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.2} />
        <span className="font-en text-xs font-semibold tracking-[0.18em]">N</span>
      </div>

      {/* Wheel and drag cover pointer users; these give the same reach by keyboard and on touch.
          Above every pin (max z 110, selected 150) — on the phone crop a pin genuinely lands on top
          of this corner and used to eat the zoom-in click. */}
      <div className="absolute bottom-3 right-3 z-[200] flex flex-col gap-1.5 sm:bottom-4 sm:right-5">
        <button type="button" onClick={() => zoomBy(1.6)} aria-label="ขยายแผนที่" className="map-zoom-btn">
          <Icon name="zoom-in" className="h-4 w-4" strokeWidth={2} />
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="ย่อแผนที่" className="map-zoom-btn">
          <Icon name="zoom-out" className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => animateTo(base)}
          aria-label="กลับไปมุมมองเต็มเกาะ"
          disabled={!zoomed}
          className="map-zoom-btn disabled:opacity-35"
        >
          <Icon name="expand" className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      {shown.length === 0 && (
        <p className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto max-w-xs rounded-lg bg-[var(--color-bg-panel)]/90 px-4 py-2.5 text-center text-xs leading-relaxed text-[var(--color-ink-muted)]">
          {hasSelection
            ? "ไม่พบสถานที่ที่ตรงกับที่ค้นหา ลองเปลี่ยนคำค้นหรือเปิดหมวดหมู่อื่น"
            : "เลือกหมวดหมู่เพื่อแสดงสถานที่บนแผนที่"}
        </p>
      )}

      {/* A buried place is fully covered by a sibling's pin — see lib/pin-stack — so it does not get
          one of its own; it stays reachable through that pin's "+N" badge and the popup's sibling
          list, which is why `neighbours`/`buried` below are still computed against every place in
          `shown`, not just the ones that render here. */}
      {frontPlaces(
        shown,
        (p) => project(p.lat, p.lng),
        placesAtSameSpot
      ).map((place, i) => {
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
        const neighbours = clusterOf(place, shown, placesAtSameSpot);
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
              zIndex: isSelected ? 150 : 10 + Math.round(y),
              // Drop order: along the route when one is picked, otherwise in the order they were filtered in.
              animationDelay: `${(stopIndex >= 0 ? stopIndex : i) * 45}ms`,
              // The pin's own colour, so `.map-pin::after` — the contact glow at its tip — can pick it
              // up via currentColor rather than a flat black shadow, which barely registers against
              // navy and is why an isolated pin (nothing else nearby to anchor it visually) read as
              // floating instead of planted.
              color,
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
            {place.tourUrl && (
              <span className="map-pin__tour" aria-hidden>
                <Icon name="tour-360" className="h-2.5 w-2.5" strokeWidth={2} />
              </span>
            )}
            <span className="map-pin__stem" style={{ borderTopColor: color }} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
