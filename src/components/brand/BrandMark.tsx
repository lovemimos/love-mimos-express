/**
 * Standalone brand mark — the lash-curve motif distilled into an
 * icon-only glyph, without any wordmark. This is what appears alone at
 * small sizes (favicon, app icon, avatar) where the full "Love Mimos
 * Express" lockup would be illegible.
 *
 * No official standalone mark file was provided for this project (see
 * docs/BRAND_GUIDELINES.md) — this is derived directly from the same
 * curve already used as the wordmark's signature underline
 * (`BrandLogo` full/compact variants), just simplified and bolded for
 * legibility at 16–32px.
 */
export function BrandMark({
  className = "",
  strokeColor = "currentColor",
}: {
  className?: string;
  strokeColor?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 20 C 9 8, 23 8, 27 20"
        stroke={strokeColor}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M10 19 C 12 12, 15 10, 16 15"
        stroke={strokeColor}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M16 15 C 17 10, 20 12, 22 19"
        stroke={strokeColor}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
