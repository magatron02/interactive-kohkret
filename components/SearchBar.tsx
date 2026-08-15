import { Icon } from "@/lib/icons";

export default function SearchBar({
  value,
  onChange,
  resultCount,
}: {
  value: string;
  onChange: (v: string) => void;
  resultCount: number;
}) {
  const query = value.trim();

  return (
    <div>
      <label htmlFor="place-search" className="sr-only">
        ค้นหาสถานที่บนเกาะเกร็ด
      </label>
      <div className="relative">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-faint)]"
          strokeWidth={1.8}
        />
        <input
          id="place-search"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ค้นหาสถานที่"
          className="h-11 w-full rounded-lg border border-[var(--color-hairline)] bg-[var(--color-bg-map)] pl-9 pr-9 text-sm text-[var(--color-ink)] outline-none transition-colors duration-150 placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-primary)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="ล้างคำค้นหา"
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[var(--color-ink-faint)] transition-colors duration-150 hover:bg-[var(--color-bg-panel)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
      <p aria-live="polite" className="mt-1.5 min-h-4 text-[11px] text-[var(--color-ink-faint)]">
        {query ? `พบ ${resultCount} สถานที่` : ""}
      </p>
    </div>
  );
}
