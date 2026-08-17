import type { Category, Product } from "@/types";
import type { ProductQuery, ProductQueryResult } from "@/lib/repositories/product-query";

/**
 * Contract for reading product data, regardless of where it comes from.
 *
 * `query()` (added Sprint 6) is the single entry point for search,
 * category filtering, sorting, and pagination — see
 * src/lib/repositories/product-query.ts for the shared engine both
 * implementations below call. `findAll`/`findByCategory`/`search` remain
 * for existing callers and are implemented as thin wrappers over
 * `query()` in both repositories — never a second, divergent filtering
 * implementation.
 *
 * Today: MockProductRepository (src/lib/repositories/mock/) reads from
 * the static catalog in src/lib/data/products.ts.
 *
 * Sprint 4: TinyProductRepository implements this same interface against
 * the Tiny ERP API (see docs/API_TINY.md). Nothing outside
 * src/lib/repositories/index.ts needs to change when that happens — every
 * hook, service, and page consumes this interface, never a concrete
 * implementation directly.
 *
 * All methods are async on purpose, even though the mock implementation
 * is instant — this is what makes the interface honest about what a real
 * network-backed implementation will look like.
 */
export interface ProductRepository {
  query(params: ProductQuery): Promise<ProductQueryResult>;
  findAll(): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | undefined>;
  findByCategory(categorySlug: string): Promise<Product[]>;
  search(query: string): Promise<Product[]>;
}

/**
 * Contract for reading category data. Kept separate from
 * ProductRepository because the two may end up backed by different
 * sources even after the Tiny integration (e.g. categories curated by
 * hand in this app, products fetched live from Tiny) — see
 * docs/API_TINY.md §3 on why categories might not map 1:1 to Tiny.
 */
export interface CategoryRepository {
  findAll(): Promise<Category[]>;
}
