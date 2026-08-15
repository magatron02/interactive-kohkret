import { CATEGORIES, countByCategory, type Category } from "@/lib/places";
import { Icon } from "@/lib/icons";

export default function CategoryPanel({
  active,
  onToggle,
  onClear,
}: {
  active: Set<Category>;
  onToggle: (id: Category) => void;
  onClear: () => void;
}) {
  return (
    <section aria-labelledby="categories-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="categories-heading"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]"
        >
          Categories
        </h2>
        {active.size > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="-mr-2 inline-flex min-h-11 items-center rounded px-2 text-xs text-[var(--color-ink-muted)] underline-offset-2 transition-colors duration-150 hover:text-[var(--color-ink)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-panel)]"
          >
            แสดงทั้งหมด
          </button>
        )}
      </div>

      {/* Phone: a horizontal chip rail, because six full-width rows would push the map off screen.
          Desktop: the hairline-separated list from the reference poster. Same markup, no duplication. */}
      <ul className="edge-fade -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:block lg:overflow-visible lg:px-0 lg:pb-0">
        {CATEGORIES.map((cat) => {
          const isActive = active.has(cat.id);
          const count = countByCategory(cat.id);
          return (
            <li
              key={cat.id}
              className="shrink-0 lg:shrink lg:border-t lg:border-[var(--color-hairline)] lg:first:border-t-0"
            >
              <button
                type="button"
                onClick={() => onToggle(cat.id)}
                aria-pressed={isActive}
                className={`group flex min-h-11 items-center gap-2 rounded-full border px-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-panel)] lg:w-full lg:gap-3 lg:rounded-none lg:border-0 lg:px-0 lg:py-3 ${
                  isActive
                    ? "border-transparent bg-[var(--color-bg-elevated)] lg:bg-transparent"
                    : "border-[var(--color-hairline)] lg:border-0"
                }`}
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors duration-150 lg:h-9 lg:w-9"
                  style={
                    isActive
                      ? { backgroundColor: cat.color, color: cat.ink }
                      : { color: cat.color, backgroundColor: "var(--color-bg-map)" }
                  }
                >
                  <Icon name={cat.id} className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={1.6} />
                </span>

                <span className="min-w-0 lg:flex-1">
                  <span className="block whitespace-nowrap text-[13px] font-medium leading-tight text-[var(--color-ink)] lg:truncate lg:whitespace-normal">
                    {cat.label}
                  </span>
                  {/* The English sublabel is desktop-only: on a phone it costs a line and earns nothing. */}
                  <span className="hidden truncate text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)] lg:block">
                    {cat.labelEn}
                  </span>
                </span>

                <span
                  className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full px-1.5 text-xs font-semibold tabular-nums"
                  style={{ backgroundColor: cat.color, color: cat.ink }}
                >
                  {count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
