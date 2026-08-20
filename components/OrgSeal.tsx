/**
 * The seal of องค์การบริหารส่วนตำบลเกาะเกร็ด — the organisation's own emblem, not a redrawing of it.
 *
 * This started as hand-built SVG (rings, arced `<textPath>`, a generated lotus). That version was
 * legible, but it was an approximation, and the real seal's lotus rosette and flourishes carry detail
 * not worth chasing in paths. `public/org-seal.png` is the actual artwork, converted to
 * white-on-transparent by `scripts/build-seal-asset.mjs`.
 *
 * It is applied as a CSS **mask** rather than drawn as an `<img>`, so `currentColor` still paints it:
 * the footer sets `text-[var(--color-ink-muted)]` and the seal follows that token like every other mark
 * in the app. A plain `<img>` would be permanently white and would sit wrong the moment a colour moved.
 *
 * Decorative — the organisation's name is set in real type immediately beside it, so announcing this
 * would only repeat it.
 */
export default function OrgSeal({ className }: { className?: string }) {
  return <span aria-hidden="true" className={`org-seal ${className ?? ""}`} />;
}
