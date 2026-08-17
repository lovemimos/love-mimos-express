import "server-only";
import type { CategoryRepository } from "@/lib/repositories/contracts";
import { MockCategoryRepository } from "@/lib/repositories/mock/mock-category-repository";
import { tinyClient, TinyApiError } from "@/lib/repositories/tiny/tiny-client";
import { mapTinyCategoryTree, type TinyCategoryNode } from "@/lib/repositories/tiny/tiny-mapper";
import { tinyCache } from "@/lib/repositories/tiny/cache";
import { recordTinySuccess, recordTinyFallback } from "@/lib/repositories/tiny/status";
import { logConnectionStart, logRecordCount, logFallback } from "@/lib/repositories/tiny/logger";
import type { Category } from "@/types";

const CACHE_KEY = "tiny:categories:all";
const CACHE_TTL_MS = 5 * 60_000; // categories change far less often than stock/price

/**
 * Implements `CategoryRepository` against `GET /categorias/todas`.
 *
 * Known limitation (see docs/API_TINY.md §5 and §10): Tiny's category
 * tree has no icon and no app-friendly slug — only `id`/`descricao`/
 * `filhas`. Every category mapped from Tiny gets the same fallback icon
 * (see tiny-mapper.ts) until a manual per-category icon mapping exists.
 */
export class TinyCategoryRepository implements CategoryRepository {
  private readonly fallback = new MockCategoryRepository();

  async findAll(): Promise<Category[]> {
    try {
      const cached = tinyCache.get<Category[]>(CACHE_KEY);
      if (cached) return cached;

      logConnectionStart("árvore de categorias");
      const root = await tinyClient.get<TinyCategoryNode>("/categorias/todas");
      const categories = mapTinyCategoryTree(root);

      logRecordCount("árvore de categorias", categories.length);
      tinyCache.set(CACHE_KEY, categories, CACHE_TTL_MS);
      recordTinySuccess();
      return categories;
    } catch (err) {
      const reason =
        err instanceof TinyApiError
          ? `${err.kind}${err.status ? ` (HTTP ${err.status})` : ""}`
          : "erro desconhecido";
      logFallback("findAll (categorias)", reason);
      recordTinyFallback(err instanceof TinyApiError ? err.kind : "unknown");
      return this.fallback.findAll();
    }
  }
}
