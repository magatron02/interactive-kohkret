import { getPlace } from "@/lib/places";
import { formatDistance } from "@/lib/route-paths";
import { estimateMinutes, type WalkRoute } from "@/lib/walk-routing";
import PlaceSelect from "@/components/PlaceSelect";

/**
 * Any two places, not just the six themed itineraries in RouteLegend — for "how do I get from the
 * pottery workshop to the pier" without scrolling every named route hoping it happens to visit both.
 * Distance is the real walked length from lib/walk-routing.ts's Dijkstra; the minute figure next to it
 * is explicitly an estimate (see estimateMinutes) since nothing in this codebase measures actual pace.
 */
export default function RoutePicker({
  fromId,
  toId,
  onChangeFrom,
  onChangeTo,
  routes,
}: {
  fromId: string;
  toId: string;
  onChangeFrom: (id: string) => void;
  onChangeTo: (id: string) => void;
  routes: WalkRoute[] | null;
}) {
  const same = fromId === toId;

  return (
    <section aria-labelledby="route-picker-heading" className="panel-surface">
      <h2
        id="route-picker-heading"
        className="font-en text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]"
      >
        Walk Between Places
      </h2>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <PlaceSelect value={fromId} onChange={onChangeFrom} label="จาก" />
        <span className="hidden text-[var(--color-ink-faint)] sm:inline" aria-hidden>
          →
        </span>
        <PlaceSelect value={toId} onChange={onChangeTo} label="ไป" />
      </div>

      {same ? (
        <p className="mt-2 text-xs text-[var(--color-ink-faint)]">เลือกสองจุดที่ต่างกัน</p>
      ) : routes === null ? (
        <p className="mt-2 text-xs text-[var(--color-ink-faint)]">
          เดินไปไม่ถึง — {getPlace(fromId)?.name} หรือ {getPlace(toId)?.name} ไม่ได้อยู่บนโครงข่ายทางเดินของเกาะ
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1 text-xs">
          {routes.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: i === 0 ? "var(--color-route-4)" : "var(--color-ink-faint)" }}
              />
              <span className="text-[var(--color-ink-muted)]">
                {i === 0 ? "เส้นทางหลัก" : "เส้นทางสำรอง"} · เดิน {formatDistance(r.metres)} ·{" "}
                ~{estimateMinutes(r.metres)} นาที (ประมาณ)
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
