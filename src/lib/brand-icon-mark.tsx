/**
 * The lash-curve mark, as plain JSX suitable for `next/og`'s
 * `ImageResponse` (Satori) — no Tailwind classes, inline styles only,
 * since Satori doesn't process CSS classes. Shared by every generated
 * icon route (`icon.tsx`, `apple-icon.tsx`, and the PWA manifest icons)
 * so the mark is defined in exactly one place instead of duplicated
 * per file with slightly different sizes.
 */
export function BrandIconMarkSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M5 20 C 9 8, 23 8, 27 20"
        stroke="#D4AF7A"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M10 19 C 12 12, 15 10, 16 15"
        stroke="#D4AF7A"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M16 15 C 17 10, 20 12, 22 19"
        stroke="#D4AF7A"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
