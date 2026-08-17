import "server-only";
import type { ProductRepository, CategoryRepository } from "@/lib/repositories/contracts";
import { MockProductRepository } from "@/lib/repositories/mock/mock-product-repository";
import { MockCategoryRepository } from "@/lib/repositories/mock/mock-category-repository";
import { TinyProductRepository } from "@/lib/repositories/tiny/tiny-product-repository";
import { TinyCategoryRepository } from "@/lib/repositories/tiny/tiny-category-repository";
import { dataSourceConfig, validateTinyEnv } from "@/lib/env";

/**
 * Single composition root for the data layer — the only file that
 * decides which repository implementation backs the app.
 *
 * Controlled by `DATA_SOURCE` (see .env.example):
 *   - "mock" (default): MockProductRepository/MockCategoryRepository.
 *   - "tiny": TinyProductRepository/TinyCategoryRepository, calling the
 *     real Tiny ERP API v3 — see docs/API_TINY.md.
 *
 * Safety net: if `DATA_SOURCE=tiny` but the required credentials aren't
 * configured, this falls back to mock at startup (with a warning) rather
 * than instantiating a Tiny repository that would fail on every request.
 * This is separate from the *runtime* fallback inside
 * TinyProductRepository itself (which falls back per-request if a
 * healthy-looking config still fails against the real API) — see
 * docs/API_TINY.md §9.
 *
 * Marked `server-only`: this file (and everything under
 * lib/repositories/tiny/) must never be reachable from a Client
 * Component. Client-side data fetching goes through the Next.js Route
 * Handlers in src/app/api/**, which import this file safely because
 * Route Handlers only ever run on the server. See docs/ARCHITECTURE.md.
 */

function resolveDataSource(): "mock" | "tiny" {
  if (dataSourceConfig.source === "tiny") {
    const validation = validateTinyEnv();
    if (!validation.ok) {
      console.warn(`[config] ${validation.message} Usando o catálogo mock em vez de falhar em toda requisição.`);
      return "mock";
    }
  }
  return dataSourceConfig.source;
}

const activeSource = resolveDataSource();

export const productRepository: ProductRepository =
  activeSource === "tiny" ? new TinyProductRepository() : new MockProductRepository();

export const categoryRepository: CategoryRepository =
  activeSource === "tiny" ? new TinyCategoryRepository() : new MockCategoryRepository();
