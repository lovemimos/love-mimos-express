import type { Product } from "@/types";
import { searchTerms, normalizeSearchText } from "@/utils/normalize-text";

/**
 * Sort orders the UI can request. Deliberately small and named for what
 * the *shopper* is asking for ("cheapest first"), not for any specific
 * data source's sort syntax â€” this is exactly the kind of Tiny-specific
 * coupling docs/API_TINY.md warns against baking into our contract.
 */
export type ProductSortOrder = "relevancia" | "menor-preco" | "maior-preco" | "nome-asc";

const VALID_SORTS: ProductSortOrder[] = ["relevancia", "menor-preco", "maior-preco", "nome-asc"];

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 500;

/**
 * The one query shape every `ProductRepository` implementation supports.
 * All fields optional â€” an empty query just means "everything, page 1".
 */
export type ProductQuery = {
  search?: string;
  categorySlug?: string;
  departmentSlug?: string;
  /** Filters by `Product.brandSlug` â€” a dedicated filter, not part of
   * `attributes`, because Brand is a first-class entity (see
   * src/types/index.ts and docs/features/faceted-catalog.md), not a
   * generic facet string. */
  brandSlug?: string;
  sort?: ProductSortOrder;
  page?: number; // 1-based
  pageSize?: number;
  onlyAvailable?: boolean; // stock > 0
  featuredOnly?: boolean; // has any marketing badge (novo/mais-vendido/promocao)
  badge?: Product["badge"]; // a *specific* badge â€” e.g. "mais-vendido" for a Best Sellers section (Sprint 9)
  /**
   * Faceted attribute filters â€” e.g. `{ cor: ["Preto", "Azul"] }`.
   * Semantics: a product matches a facet key if EITHER its own
   * `attributes[key]` OR any of its variants' `attributes[key]` is
   * included in the given array (OR within a facet); a product must
   * match every facet key present in this object (AND across facets).
   * See docs/features/faceted-catalog.md.
   */
  attributes?: Record<string, string[]>;
  /** Free-keyword filter over `Product.tags` â€” a product matches if it
   * has at least one of the given tags. */
  tags?: string[];
  priceMin?: number;
  priceMax?: number;
};

export type ProductQueryResult = {
  items: Product[];
  total: number; // total matches across all pages, not just this page's length
  page: number; // the page actually served (after fallback normalization)
  pageSize: number; // the page size actually served (after fallback normalization)
  hasMore: boolean;
};

/**
 * Normalizes a raw (possibly attacker- or typo-supplied, e.g. from a URL
 * query string) `ProductQuery` into safe values â€” see requirement in
 * docs/features/product.md and Sprint 6 task 11. Never throws; always
 * returns something usable.
 */
export function normalizeProductQuery(raw: ProductQuery): Required<
  Pick<ProductQuery, "sort" | "page" | "pageSize">
> &
  ProductQuery {
  const sort = raw.sort && VALID_SORTS.includes(raw.sort) ? raw.sort : "relevancia";

  const rawPage = raw.page;
  const page = Number.isFinite(rawPage) && (rawPage as number) >= 1 ? Math.floor(rawPage as number) : 1;

  const rawPageSize = raw.pageSize;
  let pageSize =
    Number.isFinite(rawPageSize) && (rawPageSize as number) > 0
      ? Math.floor(rawPageSize as number)
      : DEFAULT_PAGE_SIZE;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  return { ...raw, sort, page, pageSize };
}

/**
 * The actual query engine: filter â†’ search-score â†’ sort â†’ paginate.
 * Pure function over an in-memory `Product[]` â€” both
 * `MockProductRepository` and `TinyProductRepository` call this over
 * their respective full catalogs (mock: the static array; Tiny: the
 * already-fetched/cached mapped catalog â€” see docs/API_TINY.md Â§11 on
 * why Tiny can't push this filtering down to its own API). This is the
 * single place search/sort/pagination logic lives â€” never duplicated
 * per repository, per page, or between client and server.
 */
export function applyProductQuery(products: Product[], rawQuery: ProductQuery): ProductQueryResult {
  const query = normalizeProductQuery(rawQuery);
  let results = products;

  if (query.categorySlug) {
    results = results.filter((p) => p.categorySlug === query.categorySlug);
  }
  if (query.brandSlug) {
    results = results.filter((p) => p.brandSlug === query.brandSlug);
  }
  if (query.onlyAvailable) {
    results = results.filter((p) => p.stock > 0);
  }
  if (query.featuredOnly) {
    results = results.filter((p) => Boolean(p.badge));
  }
  if (query.badge) {
    results = results.filter((p) => p.badge === query.badge);
  }
  if (query.attributes) {
    for (const [key, values] of Object.entries(query.attributes)) {
      if (!values || values.length === 0) continue;
      results = results.filter((p) => productHasAttributeValue(p, key, values));
    }
  }
  if (query.tags && query.tags.length > 0) {
    results = results.filter((p) => p.tags?.some((t) => query.tags!.includes(t)));
  }
  if (query.priceMin !== undefined) {
    results = results.filter((p) => p.price >= query.priceMin!);
  }
  if (query.priceMax !== undefined) {
    results = results.filter((p) => p.price <= query.priceMax!);
  }

  const terms = query.search ? searchTerms(query.search) : [];
  let scoreById: Map<string, number> | null = null;

  if (terms.length > 0) {
    scoreById = new Map();
    results = results.filter((product) => {
      const score = scoreMatch(product, terms);
      if (score > 0) scoreById!.set(product.id, score);
      return score > 0;
    });
  }

  results = sortResults(results, query.sort, scoreById);

  const total = results.length;
  const start = (query.page - 1) * query.pageSize;
  const items = results.slice(start, start + query.pageSize);
  const hasMore = start + items.length < total;

  return { items, total, page: query.page, pageSize: query.pageSize, hasMore };
}

/**
 * True if the product matches a facet value either at the product
 * level (`product.attributes[key]`) or on any of its variants
 * (`variant.attributes[key]`) â€” a product with real color variants
 * stores color per-variant (see `ProductVariant.attributes` in
 * src/types/index.ts), so a filter that only checked the product level
 * would silently never match those products.
 */
function productHasAttributeValue(product: Product, key: string, values: string[]): boolean {
  const productValue = product.attributes?.[key];
  if (productValue && values.includes(productValue)) return true;

  return (product.variants ?? []).some((v) => {
    const variantValue = v.attributes?.[key];
    return variantValue && values.includes(variantValue);
  });
}

/**
 * Every search word must match somewhere in the product (AND semantics)
 * â€” this is what makes "cilios marrom" find "CÃ­lios Marrom Fio a Fio"
 * regardless of accent/case, while not matching a product that only has
 * "cilios" and nothing resembling "marrom" anywhere. Matches in the name
 * score highest (and a match at the very start of the name scores
 * highest of all), then short description, category, facet attribute
 * values (marca, tÃ©cnica, efeito, ...), SKU, then the long description â€”
 * this ordering is what "relevÃ¢ncia" sorts by.
 */
function scoreMatch(product: Product, terms: string[]): number {
  const name = normalizeSearchText(product.name);
  const shortDescription = normalizeSearchText(product.shortDescription);
  const description = normalizeSearchText(product.description);
  const category = normalizeSearchText(product.categorySlug);
  const sku = product.sku ? normalizeSearchText(product.sku) : "";
  const attributeValues = normalizeSearchText(
    [
      ...(product.attributes ? Object.values(product.attributes) : []),
      ...(product.variants ?? []).flatMap((v) => (v.attributes ? Object.values(v.attributes) : [])),
    ].join(" ")
  );

  let score = 0;

  for (const term of terms) {
    let termMatched = false;

    if (name.includes(term)) {
      score += name.indexOf(term) === 0 ? 40 : 25;
      termMatched = true;
    }
    if (shortDescription.includes(term)) {
      score += 12;
      termMatched = true;
    }
    if (category.includes(term)) {
      score += 8;
      termMatched = true;
    }
    if (attributeValues.includes(term)) {
      score += 8;
      termMatched = true;
    }
    if (sku.includes(term)) {
      score += 6;
      termMatched = true;
    }
    if (description.includes(term)) {
      score += 4;
      termMatched = true;
    }

    if (!termMatched) return 0; // every word must match somewhere
  }

  return score;
}

function sortResults(
  products: Product[],
  sort: ProductSortOrder,
  scoreById: Map<string, number> | null
): Product[] {
  switch (sort) {
    case "menor-preco":
      return [...products].sort((a, b) => a.price - b.price);
    case "maior-preco":
      return [...products].sort((a, b) => b.price - a.price);
    case "nome-asc":
      return [...products].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    case "relevancia":
    default:
      if (scoreById) {
        return [...products].sort((a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0));
      }
      return products; // no search term: natural catalog order
  }
}


