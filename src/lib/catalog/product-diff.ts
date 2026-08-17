import type { Product } from "@/types";

export type FieldDiff = {
  field: string;
  currentValue: unknown;
  incomingValue: unknown;
};

export type ExistingMatch = {
  product: Product;
  matchedBy: "externalRef" | "sku" | "slug";
};

const DOMAIN_FIELDS_TO_CHECK: (keyof Product)[] = [
  "name",
  "description",
  "categorySlug",
  "brandSlug",
  "price",
  "stock",
  "sku",
  "images",
  "variants",
];

/**
 * Finds an existing catalog entry matching `incoming` — by its
 * `externalRef` first (the most reliable: it never changes across a
 * resync even if SKU/slug are edited manually afterwards), then SKU,
 * then slug. Source-agnostic on purpose — works the same whether
 * `incoming` came from the Tiny v2 API, the v3 API, or any future
 * source, since it only ever looks at `Product` fields.
 */
export function findExistingProduct(catalog: Product[], incoming: Product): ExistingMatch | undefined {
  const byRef = catalog.find(
    (p) => p.externalRef?.source === incoming.externalRef?.source && p.externalRef?.id === incoming.externalRef?.id
  );
  if (byRef) return { product: byRef, matchedBy: "externalRef" };

  const bySku = incoming.sku ? catalog.find((p) => p.sku === incoming.sku) : undefined;
  if (bySku) return { product: bySku, matchedBy: "sku" };

  const bySlug = catalog.find((p) => p.slug === incoming.slug);
  if (bySlug) return { product: bySlug, matchedBy: "slug" };

  return undefined;
}

/** Compares the fields that actually matter for "did this product
 * change" — not every field (e.g. `id`, `rating` are deliberately
 * excluded). */
export function diffProductFields(existing: Product, incoming: Product): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const field of DOMAIN_FIELDS_TO_CHECK) {
    const currentValue = existing[field];
    const incomingValue = incoming[field];
    if (JSON.stringify(currentValue) !== JSON.stringify(incomingValue)) {
      diffs.push({ field, currentValue, incomingValue });
    }
  }
  return diffs;
}
