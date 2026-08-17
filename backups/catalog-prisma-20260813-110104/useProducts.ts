import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { products as mockProducts } from "@/lib/data/products";
import { categories as mockCategories } from "@/lib/data/categories";
import { applyProductQuery, type ProductQuery, type ProductQueryResult } from "@/lib/repositories/product-query";
import type { Category } from "@/types";

/**
 * `useProductQuery` calls the `/api/products` Route Handler, never
 * `catalogService`/Tiny code directly — that boundary is what keeps Tiny
 * credentials and network calls entirely server-side (see
 * docs/ARCHITECTURE.md and docs/API_TINY.md §4). Swapping the data
 * source (mock ↔ tiny) only ever touches `DATA_SOURCE` in `.env` — this
 * file never changes either way.
 *
 * `initialData` runs `applyProductQuery` against the local mock array —
 * the exact same pure function the repositories call server-side (see
 * src/lib/repositories/product-query.ts) — purely to avoid a loading
 * flash on first render (see docs/ARCHITECTURE.md §5). It is NOT a
 * second implementation of search/sort/pagination; it's the one true
 * implementation, called from the client for this one bootstrap case.
 */

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao buscar ${url}: HTTP ${res.status}`);
  }
  return res.json();
}

function buildProductsUrl(query: ProductQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.categorySlug) params.set("categoria", query.categorySlug);
  if (query.sort) params.set("ordem", query.sort);
  if (query.page) params.set("pagina", String(query.page));
  if (query.pageSize) params.set("limite", String(query.pageSize));
  if (query.onlyAvailable) params.set("disponivel", "1");
  if (query.featuredOnly) params.set("destaque", "1");
  if (query.badge) params.set("badge", query.badge);
  const qs = params.toString();
  return qs ? `/api/products?${qs}` : "/api/products";
}

/**
 * The one hook every catalog-browsing screen uses (Home, Busca). Pass a
 * `ProductQuery` — see src/lib/repositories/product-query.ts for the
 * full shape (search, categorySlug, sort, page, pageSize, ...).
 *
 * `placeholderData: keepPreviousData` avoids a flash back to an empty/
 * loading grid while a new page or filter is being fetched — the
 * previous page's results stay visible (with `isFetching` true) until
 * the new ones arrive, which reads as "updating", not "reset".
 */
export function useProductQuery(query: ProductQuery) {
  return useQuery({
    queryKey: ["products", "query", query],
    queryFn: () => fetchJson<ProductQueryResult>(buildProductsUrl(query)),
    initialData: () => applyProductQuery(mockProducts, query),
    placeholderData: keepPreviousData,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { categories } = await fetchJson<{ categories: Category[] }>(
        "/api/categories"
      );
      return categories;
    },
    initialData: mockCategories,
  });
}
