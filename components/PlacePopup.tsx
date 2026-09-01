import { getCategory, placesAtSameSpot, PLACES, type Place } from "@/lib/places";
import { directionsLink, placeLink } from "@/lib/maps-links";
import { Icon } from "@/lib/icons";
import { clusterOf } from "@/lib/pin-stack";

export default function PlacePopup({
  place,
  closing = false,
  onClose,
  onSelectPlace,
}: {
  place: Place;
  closing?: boolean;
  onClose: () => void;
  onSelectPlace: (id: string) => void;
}) {
  const category = getCategory(place.category);
  // Markers are never nudged off their real coordinates, so places metres apart genuinely hide each
  // other on the map. This is how the buried ones stay reachable.
  const neighbours = clusterOf(place, PLACES, placesAtSameSpot);

  return (
    <div
      // Anchored to the bottom, so a tall card grows upward — and the tallest ones (a description, a
      // cuisine list, a phone, a sibling place and a dataNote) are taller than the map frame itself.
      // The card is a sibling of the map, not a child, so the map's own `overflow-hidden` does not clip
      // it: unbounded, it ran 90px past the top edge and over the site header. Capped to the frame with
      // its own scroll instead.
      className={`scroll-y absolute left-3 bottom-3 z-30 w-[min(280px,calc(100%-1.5rem))] max-h-[calc(100%-1.5rem)] overflow-y-auto overscroll-contain rounded-xl border border-[var(--color-hairline)] bg-[var(--color-bg-elevated)] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.45)] sm:left-4 sm:bottom-4 sm:max-h-[calc(100%-2rem)] sm:w-[272px] ${
        closing ? "popup-exit pointer-events-none" : "popup-enter"
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิดรายละเอียดสถานที่"
        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full text-[var(--color-ink-muted)] transition-colors duration-150 hover:bg-[var(--color-bg-map)] hover:text-[var(--color-ink)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-elevated)]"
      >
        <Icon name="close" className="h-3 w-3" strokeWidth={2} />
      </button>

      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
        style={{ backgroundColor: category.color, color: category.ink }}
      >
        <Icon name={category.id} className="h-3 w-3" strokeWidth={1.8} />
        {category.label}
      </span>

      <h3 className="mt-1.5 pr-7 text-[15px] font-semibold leading-snug text-[var(--color-ink)]">{place.name}</h3>
      {place.nameEn && <p className="text-[11px] text-[var(--color-ink-faint)]">{place.nameEn}</p>}

      {place.description ? (
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">{place.description}</p>
      ) : (
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-ink-faint)]">
          ยังไม่มีคำอธิบายที่ตรวจสอบแหล่งที่มาได้สำหรับสถานที่นี้
        </p>
      )}

      {place.cuisine && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {place.cuisine.map((c) => (
            <li
              key={c}
              className="rounded border border-[var(--color-hairline)] px-1.5 py-0.5 text-xs text-[var(--color-ink-muted)]"
            >
              {c}
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--color-hairline)] pt-2 text-[11px]">
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

      {/* Hands the visitor off to whatever map app they already have, once they stop planning and
          start walking. Plain URLs — no Google API key, no billing, no third-party script. */}
      <div className="mt-2.5 flex gap-1.5">
        <a
          href={directionsLink(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-2.5 text-[13px] font-semibold text-[var(--color-bg-deep)] transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-elevated)]"
        >
          <Icon name="route" className="h-3.5 w-3.5" strokeWidth={1.8} />
          นำทางไปที่นี่
        </a>
        <a
          href={placeLink(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--color-hairline)] px-2.5 text-[13px] text-[var(--color-ink-muted)] transition-colors duration-150 hover:border-[var(--color-ink-faint)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-elevated)]"
        >
          ดูบนแผนที่
        </a>
      </div>

      {place.tourUrl && (
        <a
          href={place.tourUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--color-hairline)] px-2.5 text-[13px] text-[var(--color-ink-muted)] transition-colors duration-150 hover:border-[var(--color-ink-faint)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-elevated)]"
        >
          <Icon name="tour-360" className="h-3.5 w-3.5" strokeWidth={1.8} />
          ชม 360°
        </a>
      )}

      {(place.phone || place.website) && (
        <div className="mt-1.5 flex flex-wrap gap-x-3">
          {place.phone && (
            <a
              href={`tel:${place.phone.replace(/[^+\d]/g, "")}`}
              className="inline-flex min-h-9 items-center rounded text-[12px] text-[var(--color-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              {place.phone}
            </a>
          )}
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center rounded text-[12px] text-[var(--color-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              เว็บไซต์ร้าน
            </a>
          )}
        </div>
      )}

      {neighbours.length > 0 && (
        <div className="mt-2 border-t border-[var(--color-hairline)] pt-1.5">
          <p className="text-[11px] text-[var(--color-ink-faint)]">
            อีก {neighbours.length} แห่งที่จุดเดียวกัน
          </p>
          <ul className="mt-1 flex flex-wrap gap-1">
            {neighbours.map((n) => {
              const nc = getCategory(n.category);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPlace(n.id)}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--color-hairline)] px-1.5 text-[12px] text-[var(--color-ink-muted)] transition-colors duration-150 hover:border-[var(--color-ink-faint)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-elevated)]"
                  >
                    <span style={{ color: nc.color }}>
                      <Icon name={nc.id} className="h-3 w-3" strokeWidth={1.8} />
                    </span>
                    {n.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {place.dataNote && (
        <p className="mt-1.5 border-t border-[var(--color-hairline)] pt-1.5 text-[10px] leading-relaxed text-[var(--color-ink-faint)]">
          ⚠ {place.dataNote}
        </p>
      )}
    </div>
  );
}
