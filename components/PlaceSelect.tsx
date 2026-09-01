"use client";

import { useEffect, useRef, useState } from "react";
import { PLACES } from "@/lib/places";
import { Icon } from "@/lib/icons";

/**
 * A custom listbox in the app's own styling, not a native <select> — the browser's own dropdown (a
 * plain OS scrollwheel-style list) was the one piece of chrome on the page that did not look like the
 * rest of it. Closes on an outside click or Escape, same as PlacePopup and every other overlay here.
 */
export default function PlaceSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sorted = [...PLACES].sort((a, b) => a.name.localeCompare(b.name, "th"));
  const selected = sorted.find((p) => p.id === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-bg-panel)] px-2.5 text-left text-[13px] text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      >
        <span className="truncate">{selected?.name}</span>
        <Icon
          name="chevron-right"
          className={`h-3.5 w-3.5 shrink-0 text-[var(--color-ink-faint)] transition-transform duration-150 ${open ? "-rotate-90" : "rotate-90"}`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="scroll-y absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--color-hairline)] bg-[var(--color-bg-elevated)] py-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          {sorted.map((p) => {
            const isSelected = p.id === value;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                  className={`flex min-h-9 w-full items-center px-2.5 text-left text-[13px] transition-colors duration-100 hover:bg-[var(--color-bg-panel)] ${
                    isSelected ? "font-medium text-[var(--color-primary)]" : "text-[var(--color-ink-muted)]"
                  }`}
                >
                  {p.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
