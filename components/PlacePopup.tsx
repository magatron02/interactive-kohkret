import { getCategory, type Place } from "@/lib/places";
import { Icon } from "@/lib/icons";

export default function PlacePopup({
  place,
  closing = false,
  onClose,
}: {
  place: Place;
  closing?: boolean;
  onClose: () => void;
}) {
  const category = getCategory(place.category);

  return (
    <div
      className={`absolute inset-x-3 bottom-3 z-30 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-bg-elevated)] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.45)] sm:inset-x-auto sm:left-4 sm:bottom-4 sm:max-w-sm ${
        closing ? "popup-exit pointer-events-none" : "popup-enter"
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิดรายละเอียดสถานที่"
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-[var(--color-ink-muted)] transition-colors duration-150 hover:bg-[var(--color-bg-map)] hover:text-[var(--color-ink)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-elevated)]"
      >
        <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
        style={{ backgroundColor: category.color, color: category.ink }}
      >
        <Icon name={category.id} className="h-3.5 w-3.5" strokeWidth={1.8} />
        {category.label}
      </span>

      <h3 className="mt-2 pr-8 text-sm font-semibold leading-snug text-[var(--color-ink)]">{place.name}</h3>
      {place.nameEn && <p className="text-[11px] text-[var(--color-ink-faint)]">{place.nameEn}</p>}

      {place.description ? (
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">{place.description}</p>
      ) : (
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-faint)]">
          ยังไม่มีคำอธิบายที่ตรวจสอบแหล่งที่มาได้สำหรับสถานที่นี้
        </p>
      )}

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-[var(--color-hairline)] pt-2.5 text-[11px]">
        <div className="flex gap-1.5">
          <dt className="text-[var(--color-ink-faint)]">เวลาเปิด</dt>
          <dd className="text-[var(--color-ink-muted)]">{place.hours ?? "ไม่ระบุ"}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-[var(--color-ink-faint)]">พิกัด</dt>
          <dd className="tabular-nums text-[var(--color-ink-muted)]">
            {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
