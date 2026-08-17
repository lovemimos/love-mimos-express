import "server-only";
import type { ProductRepository } from "@/lib/repositories/contracts";
import { MockProductRepository } from "@/lib/repositories/mock/mock-product-repository";
import { tinyClient, TinyApiError } from "@/lib/repositories/tiny/tiny-client";
import { mapTinyProduct, type TinyProductPayload } from "@/lib/repositories/tiny/tiny-mapper";
import { tinyCache } from "@/lib/repositories/tiny/cache";
import { recordTinySuccess, recordTinyFallback } from "@/lib/repositories/tiny/status";
import { logConnectionStart, logRecordCount, logFallback } from "@/lib/repositories/tiny/logger";
import { applyProductQuery, MAX_PAGE_SIZE, type ProductQuery, type ProductQueryResult } from "@/lib/repositories/product-query";
import type { Product } from "@/types";

const CATALOG_CACHE_KEY = "tiny:products:all";
const CATALOG_CACHE_TTL_MS = 60_000; // matches the client's React Query staleTime
const LIST_PAGE_SIZE = 100; // Tiny's documented default/limit for GET /produtos

type TinyProductListItem = { id: number };
type TinyProductListResponse = {
  itens: TinyProductListItem[];
  paginacao: { limit: number; offset: number; total: number };
};

/**
 * Implements `ProductRepository` against the real Tiny ERP API v3.
 *
 * Important shape of the sync (see docs/API_TINY.md §4 and §11):
 * `GET /produtos` (list) does NOT include categoria/anexos/variações/SEO
 * — only `GET /produtos/{id}` (detail) does. So building our `Product[]`
 * means: page through the list to collect IDs, then fetch each product's
 * detail individually. This is an N+1 pattern and is the single biggest
 * scaling risk of this integration — documented, not hidden, in
 * docs/API_TINY.md §11. The in-memory cache below exists specifically to
 * keep this expensive fetch from re-running on every request.
 *
 * On ANY failure (auth, timeout, HTTP error, network), every method
 * falls back to `MockProductRepository` rather than showing a broken
 * page — see docs/API_TINY.md §9 "fallback controlado".
 */
export class TinyProductRepository implements ProductRepository {
  private readonly fallback = new MockProductRepository();

  private async fetchAllFromTiny(): Promise<Product[]> {
    const cached = tinyCache.get<Product[]>(CATALOG_CACHE_KEY);
    if (cached) return cached;

    logConnectionStart("catálogo de produtos");

    // Phase 1: page through the lightweight list to collect active IDs.
    const ids: number[] = [];
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const page = await tinyClient.get<TinyProductListResponse>("/produtos", {
        limit: LIST_PAGE_SIZE,
        offset,
        situacao: "A", // only active products — documented Tiny query param
      });
      total = page.paginacao?.total ?? page.itens.length;
      ids.push(...page.itens.map((item) => item.id));
      offset += LIST_PAGE_SIZE;
    }

    // Phase 2: fetch full detail per product (sequential — see class doc
    // comment on rate-limit risk; parallelizing this would need its own
    // throttling against the account's X-RateLimit-* headers).
    const products: Product[] = [];
    for (const id of ids) {
      const detail = await tinyClient.get<TinyProductPayload>(`/produtos/${id}`);
      const mapped = mapTinyProduct(detail);
      if (mapped) products.push(mapped);
    }

    logRecordCount("catálogo de produtos", products.length);
    tinyCache.set(CATALOG_CACHE_KEY, products, CATALOG_CACHE_TTL_MS);
    recordTinySuccess();
    return products;
  }

  async query(params: ProductQuery): Promise<ProductQueryResult> {
    try {
      const all = await this.fetchAllFromTiny();
      return applyProductQuery(all, params);
    } catch (err) {
      this.recordFallback("query", err);
      return this.fallback.query(params);
    }
  }

  async findAll(): Promise<Product[]> {
    return (await this.query({ pageSize: MAX_PAGE_SIZE })).items;
  }

  async findBySlug(slug: string): Promise<Product | undefined> {
    try {
      const all = await this.fetchAllFromTiny();
      return all.find((p) => p.slug === slug);
    } catch (err) {
      this.recordFallback("findBySlug", err);
      return this.fallback.findBySlug(slug);
    }
  }

  async findByCategory(categorySlug: string): Promise<Product[]> {
    return (await this.query({ categorySlug, pageSize: MAX_PAGE_SIZE })).items;
  }

  async search(query: string): Promise<Product[]> {
    return (await this.query({ search: query, pageSize: MAX_PAGE_SIZE })).items;
  }

  /** Logs enough to debug (which op, what kind of failure) without ever
   * touching request/response bodies, headers, or credentials. */
  private recordFallback(operation: string, err: unknown): void {
    const reason =
      err instanceof TinyApiError
        ? `${err.kind}${err.status ? ` (HTTP ${err.status})` : ""}`
        : "erro desconhecido";
    logFallback(operation, reason);
    recordTinyFallback(err instanceof TinyApiError ? err.kind : "unknown");
  }
}
