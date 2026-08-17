import type { ProductRepository } from "@/lib/repositories/contracts";
import { products, getProductBySlug } from "@/lib/data/products";
import { applyProductQuery, MAX_PAGE_SIZE, type ProductQuery, type ProductQueryResult } from "@/lib/repositories/product-query";
import type { Product } from "@/types";

/**
 * Reads from the static mock catalog (src/lib/data/products.ts).
 * This is the only file that should ever import that mock data directly
 * outside of the mock data module itself — every hook, service, and page
 * goes through the ProductRepository interface instead.
 *
 * `findAll`/`findByCategory`/`search` are kept for existing callers but
 * are implemented as thin wrappers over `query()` — the actual filtering
 * logic lives in exactly one place (product-query.ts), never duplicated
 * here.
 */
export class MockProductRepository implements ProductRepository {
  async query(params: ProductQuery): Promise<ProductQueryResult> {
    return applyProductQuery(products, params);
  }

  async findAll(): Promise<Product[]> {
    return (await this.query({ pageSize: MAX_PAGE_SIZE })).items;
  }

  async findBySlug(slug: string): Promise<Product | undefined> {
    return getProductBySlug(slug);
  }

  async findByCategory(categorySlug: string): Promise<Product[]> {
    return (await this.query({ categorySlug, pageSize: MAX_PAGE_SIZE })).items;
  }

  async search(query: string): Promise<Product[]> {
    return (await this.query({ search: query, pageSize: MAX_PAGE_SIZE })).items;
  }
}
