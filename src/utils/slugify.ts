/**
 * Converts free text into a URL-safe slug — strips accents, lowercases,
 * collapses anything that isn't a-z0-9 into a single hyphen, trims
 * leading/trailing hyphens. Extracted from
 * `src/lib/repositories/tiny/tiny-mapper.ts` (Sprint 4) so the faceted
 * catalog architecture (facet value slugs for SEO routes like
 * `/cilios/maria-sasha`) reuses the exact same slugging rules instead
 * of a second, possibly-diverging implementation.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
