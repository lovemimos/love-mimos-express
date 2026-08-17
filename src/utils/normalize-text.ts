/**
 * Normalizes free text for search comparison: strips accents, lowercases,
 * collapses internal whitespace, trims. Used on both sides of a search
 * match (the query term and the product fields being searched) so
 * "cílios" and "cilios" — or "  Cílios   Marrom  " and "cilios marrom" —
 * compare equal.
 *
 * This is deliberately NOT the same as `slugify()` (used for URL slugs
 * in tiny-mapper.ts) — that produces hyphenated ASCII identifiers; this
 * preserves spaces and word boundaries, which search matching needs.
 */
export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Splits a normalized search term into individual words, dropping empties. */
export function searchTerms(input: string): string[] {
  return normalizeSearchText(input).split(" ").filter(Boolean);
}
