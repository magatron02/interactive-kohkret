/**
 * The site's identity block. The artwork in `public/brand-lockup.png` carries the KOH KRET wordmark
 * itself along with the chedi, so there is no separate heading text drawn beside it — the `<h1>` keeps
 * the words for semantics, search and screen readers while the image does the showing.
 *
 * Painted as a CSS mask (`.brand-lockup`), the same as the seal in the footer, so it takes
 * `currentColor` from the theme rather than being a permanently-white PNG.
 */
export default function BrandLockup() {
  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <h1 className="shrink-0">
        <span className="sr-only">KOH KRET</span>
        {/* 1.301:1 — the artwork's own ratio. Kept modest on purpose: the source is 186px wide, so a
            larger box would upscale past its real resolution and go soft. */}
        <span
          aria-hidden="true"
          className="brand-lockup h-[3.4rem] w-[4.42rem] text-[var(--color-ink)] sm:h-[4.1rem] sm:w-[5.33rem]"
        />
      </h1>
      <div className="min-w-0">
        {/* Wordmark and strapline share a line on wide screens: the lockup is identity, not a hero. */}
        <p className="font-en text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)] sm:text-sm">
          Smart Tourism Map
        </p>
        <p className="font-th mt-1 text-[13px] text-[var(--color-ink-muted)] sm:text-sm">
          เที่ยวเกาะเกร็ด นนทบุรี · วางแผนครบ จบในวันเดียว
        </p>
      </div>
    </div>
  );
}
