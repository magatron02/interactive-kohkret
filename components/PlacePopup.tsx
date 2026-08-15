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

      {place.cuisine && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {place.cuisine.map((c) => (
            <li
              key={c}
              className="rounded border border-[var(--color-hairline)] px-1.5 py-0.5 text-[11px] text-[var(--color-ink-muted)]"
            >
              {c}
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-[var(--color-hairline)] pt-2.5 text-[11px]">
        <div className="flex gap-1.5">
          <dt className="text-[var(--color-ink-faint)]">เวลาเปิด</dt>
          <dd className="text-[var(--color-ink-muted)]">{place.hours ?? "ไม่ระบุ"}</dd>
        </div>
        {place.wifi !== undefined && (
          <div className="flex gap-1.5">
            <dt className="text-[var(--color-ink-faint)]">Wi-Fi</dt>
            <dd className="text-[var(--color-ink-muted)]">{place.wifi ? "มี (ฟรี)" : "ไม่มี"}</dd>
          </div>
        )}
        {place.outdoorSeating !== undefined && (
          <div className="flex gap-1.5">
            <dt className="text-[var(--color-ink-faint)]">ที่นั่งกลางแจ้ง</dt>
            <dd className="text-[var(--color-ink-muted)]">{place.outdoorSeating ? "มี" : "ไม่มี"}</dd>
          </div>
        )}
        <div className="flex gap-1.5">
          <dt className="text-[var(--color-ink-faint)]">พิกัด</dt>
          <dd className="tabular-nums text-[var(--color-ink-muted)]">
            {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
          </dd>
        </div>
      </dl>

      {(place.phone || place.website) && (
        <div className="mt-2 flex flex-wrap gap-x-4">
          {place.phone && (
            <a
              href={`tel:${place.phone.replace(/[^+\d]/g, "")}`}
              className="inline-flex min-h-11 items-center rounded text-[12px] text-[var(--color-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              {place.phone}
            </a>
          )}
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded text-[12px] text-[var(--color-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              เว็บไซต์ร้าน
            </a>
          )}
        </div>
      )}

      {place.dataNote && (
        <p className="mt-2 border-t border-[var(--color-hairline)] pt-2 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
          ⚠ {place.dataNote}
        </p>
      )}
    </div>
  );
}
