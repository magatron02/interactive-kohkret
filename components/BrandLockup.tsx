import { Icon } from "@/lib/icons";

export default function BrandLockup() {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <Icon
        name="brand-chedi"
        className="h-11 w-11 shrink-0 text-[var(--color-ink)] sm:h-14 sm:w-14"
        strokeWidth={1.4}
      />
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold leading-[0.92] tracking-[-0.02em] text-[var(--color-ink)] sm:text-[2rem]">
          KOH KRET
        </h1>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)] sm:text-xs">
          Smart Tourism Map
        </p>
        <p className="mt-1.5 text-xs text-[var(--color-ink-muted)] sm:text-sm">
          เที่ยวเกาะเกร็ด นนทบุรี · วางแผนครบ จบในวันเดียว
        </p>
      </div>
    </div>
  );
}
