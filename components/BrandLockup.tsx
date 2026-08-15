import { Icon } from "@/lib/icons";

export default function BrandLockup() {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Icon
        name="brand-chedi"
        className="h-10 w-10 shrink-0 text-[var(--color-ink)] sm:h-12 sm:w-12"
        strokeWidth={1.4}
      />
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold leading-[0.92] tracking-[-0.02em] text-[var(--color-ink)] sm:text-[1.75rem]">
          KOH KRET
        </h1>
        {/* Wordmark and strapline share a line on wide screens: the lockup is identity, not a hero. */}
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">
          Smart Tourism Map
          <span className="ml-3 hidden font-normal normal-case tracking-normal text-[var(--color-ink-muted)] sm:inline">
            เที่ยวเกาะเกร็ด นนทบุรี · วางแผนครบ จบในวันเดียว
          </span>
        </p>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)] sm:hidden">
          เที่ยวเกาะเกร็ด นนทบุรี · วางแผนครบ จบในวันเดียว
        </p>
      </div>
    </div>
  );
}
