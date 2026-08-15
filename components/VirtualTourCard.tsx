import { QR_MODULES, QR_PATH, QR_TARGET_LABEL, QR_TARGET_URL } from "@/lib/qr";

/**
 * The reference poster puts a "VIRTUAL TOUR 360°" QR here. No 360° tour exists for this project yet,
 * so the QR resolves to the real, verified อบต.เกาะเกร็ด website instead of promising a tour that
 * would not load. When a tour exists, regenerate lib/qr.ts against its URL and relabel this card.
 */
export default function VirtualTourCard() {
  return (
    <section
      aria-labelledby="qr-heading"
      className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-bg-map)] p-4"
    >
      <div className="flex items-center gap-4">
        <a
          href={QR_TARGET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md bg-white p-1.5 transition-transform duration-150 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-map)]"
        >
          <svg
            viewBox={`0 0 ${QR_MODULES} ${QR_MODULES}`}
            shapeRendering="crispEdges"
            className="h-[72px] w-[72px]"
            role="img"
            aria-label={`คิวอาร์โค้ดไปยังเว็บไซต์ ${QR_TARGET_LABEL}`}
          >
            <path d={QR_PATH} stroke="#0b1a2b" strokeWidth={1} />
          </svg>
        </a>

        <div className="min-w-0">
          <h2 id="qr-heading" className="text-[13px] font-semibold text-[var(--color-ink)]">
            สแกนเพื่อดูข้อมูลทางการ
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
            เว็บไซต์ อบต.เกาะเกร็ด
          </p>
          <a
            href={QR_TARGET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="-ml-1 mt-0.5 inline-flex min-h-11 items-center break-all rounded px-1 text-[11px] text-[var(--color-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-map)]"
          >
            {QR_TARGET_LABEL}
          </a>
        </div>
      </div>

      <p className="mt-3 border-t border-[var(--color-hairline)] pt-2.5 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
        ทัวร์เสมือน 360° ยังไม่เปิดให้บริการ
      </p>
    </section>
  );
}
