import { BrandMark } from "@/components/brand/BrandMark";

export type BrandLogoVariant = "full" | "compact" | "icon";
export type BrandLogoTheme = "dark" | "light";
export type BrandLogoSize = "sm" | "md" | "lg";

/**
 * The single source of truth for rendering the Love Mimos brand anywhere
 * in the app — header, footer, splash, share previews, empty states.
 * Never hand-roll the wordmark or the curve mark elsewhere; extend this
 * component instead. See docs/BRAND_GUIDELINES.md for the full usage
 * rules (clear space, minimum sizes, prohibited uses).
 *
 * - `variant="full"` — the complete lockup: "Love Mimos Express" +
 *   animated curve underline. Default; use wherever there's room (header,
 *   Home hero context, share cards).
 * - `variant="compact"` — shortened wordmark ("Love Mimos", no
 *   "Express", no underline) for tight spaces.
 * - `variant="icon"` — the standalone mark alone, no text. Use for
 *   favicon/app icon, avatars, or anywhere space is too small for any
 *   text at all.
 * - `theme="dark"` (default) — ink/plum text, for light/cream
 *   backgrounds.
 * - `theme="light"` — cream/white text, for dark backgrounds (the plum
 *   hero, footers, splash screen). The gold curve accent stays gold in
 *   both themes — it's the one constant brand accent.
 */
export function BrandLogo({
  variant = "full",
  theme = "dark",
  size = "md",
  className = "",
}: {
  variant?: BrandLogoVariant;
  theme?: BrandLogoTheme;
  size?: BrandLogoSize;
  className?: string;
}) {
  const textColor = theme === "light" ? "text-cream" : "text-plum";
  const accentColor = theme === "light" ? "text-rose-300" : "text-rose-500";
  const textSize = size === "lg" ? "text-h1" : size === "sm" ? "text-lg" : "text-h2";
  const iconSize = size === "lg" ? "h-9 w-9" : size === "sm" ? "h-6 w-6" : "h-7 w-7";

  if (variant === "icon") {
    return (
      <BrandMark
        className={`${iconSize} ${theme === "light" ? "text-cream" : "text-plum"} ${className}`}
      />
    );
  }

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <span
        className={`font-display font-semibold leading-none tracking-tight ${textColor} ${textSize}`}
      >
        Love Mimos
        {variant === "full" && <span className={accentColor}> Express</span>}
      </span>
      {variant === "full" && (
        <svg
          viewBox="0 0 140 14"
          className="mt-2 h-3 w-28"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 9 C 30 -3, 45 -3, 70 6 C 95 14, 112 4, 138 6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="220"
            strokeDashoffset="220"
            className="animate-lash-draw stroke-gold"
          />
        </svg>
      )}
    </div>
  );
}
