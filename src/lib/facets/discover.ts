import { FACET_KEYS } from "@/lib/facets/registry";
import { getBrandBySlug } from "@/lib/data/brands";
import { slugify } from "@/utils/slugify";
import type { Product, Brand } from "@/types";

export type FacetValueOption = {
  key: string;
  value: string;
  slug: string;
  count: number;
};

/**
 * Scans a set of products (and their variants) and returns every
 * distinct (facetKey, value) pair actually present, with how many
 * products have it — drives the filter UI (only ever shows options
 * that exist) and is the source of truth for resolving generic-facet
 * SEO route slugs. Variant-level attributes are included because a
 * product with real color variants stores color there, not on the
 * product itself — see `ProductVariant.attributes` in src/types/index.ts.
 */
export function discoverFacetValues(products: Product[]): FacetValueOption[] {
  const counts = new Map<string, FacetValueOption>();

  function record(key: string, value: string) {
    const mapKey = `${key}:${value}`;
    const existing = counts.get(mapKey);
    if (existing) existing.count += 1;
    else counts.set(mapKey, { key, value, slug: slugify(value), count: 1 });
  }

  for (const product of products) {
    for (const key of FACET_KEYS) {
      const productValue = product.attributes?.[key];
      if (productValue) {
        record(key, productValue);
        continue;
      }
      const variantValues = new Set(
        (product.variants ?? []).map((v) => v.attributes?.[key]).filter((v): v is string => Boolean(v))
      );
      for (const value of variantValues) record(key, value);
    }
  }

  return Array.from(counts.values());
}

export type ResolvedCatalogSlug =
  | { type: "brand"; brand: Brand }
  | { type: "attribute"; key: string; value: string };

/**
 * Resolves a URL segment (e.g. "maria-sasha" or "efeito-fox" in
 * `/cilios/maria-sasha`) against, in order: (1) a real `Brand` entity —
 * checked first because brand has its own page/banner/SEO identity, not
 * just a filter value — but only a match if some product in `products`
 * (already scoped to the relevant category) actually has that brand;
 * (2) a generic attribute facet value that exists within `products`.
 * Returns `undefined` if nothing matches — the caller should 404, never
 * guess.
 */
export function resolveCatalogSlug(products: Product[], slug: string): ResolvedCatalogSlug | undefined {
  const brand = getBrandBySlug(slug);
  if (brand && products.some((p) => p.brandSlug === brand.slug)) {
    return { type: "brand", brand };
  }

  const options = discoverFacetValues(products);
  const match = options.find((o) => o.slug === slug);
  return match ? { type: "attribute", key: match.key, value: match.value } : undefined;
}
