import { Icon } from "@/lib/icons";

/**
 * Only verified facts appear here. The reference poster carries a phone number and a Facebook page;
 * neither was verifiable, so neither is printed. The website below returns HTTP 200 and is the real
 * organisation site.
 */
export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-hairline)] pt-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Icon name="brand-chedi" className="h-8 w-8 shrink-0 text-[var(--color-ink-muted)]" strokeWidth={1.3} />
          <div>
            <p className="text-[13px] font-medium text-[var(--color-ink)]">
              องค์การบริหารส่วนตำบลเกาะเกร็ด จังหวัดนนทบุรี
            </p>
            <p className="text-[11px] text-[var(--color-ink-faint)]">
              Koh Kret Subdistrict Administrative Organization
            </p>
          </div>
        </div>

        <a
          href="https://www.kohkred-sao.go.th/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-2 text-[13px] text-[var(--color-ink-muted)] transition-colors duration-150 hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-deep)] sm:self-auto"
        >
          <Icon name="globe" className="h-4 w-4" strokeWidth={1.6} />
          kohkred-sao.go.th
        </a>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-[var(--color-ink-faint)]">
        ชายฝั่ง แม่น้ำ โครงข่ายถนน และพิกัดสถานที่มาจาก OpenStreetMap — ข้อมูล ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded underline underline-offset-2 hover:text-[var(--color-ink-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          ผู้ร่วมสร้าง OpenStreetMap
        </a>{" "}
        สัญญาอนุญาต ODbL 1.0 · เว็บนี้เป็นงานต้นแบบ ไม่ใช่เว็บทางการของหน่วยงาน
      </p>
    </footer>
  );
}
