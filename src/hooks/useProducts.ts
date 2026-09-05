import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ProductQuery, ProductQueryResult } from "@/lib/repositories/product-query";
import type { Category } from "@/types";

/**
 * `useProductQuery` calls the `/api/products` Route Handler, never
 * `catalogService`/Tiny code directly â€” that boundary is what keeps Tiny
 * credentials and network calls entirely server-side (see
 * docs/ARCHITECTURE.md and docs/API_TINY.md Â§4). Swapping the data
 * source (mock â†” tiny) only ever touches `DATA_SOURCE` in `.env` â€” this
 * file never changes either way.
 *
 * `initialData` runs `applyProductQuery` against the local mock array â€”
 * the exact same pure function the repositories call server-side (see
 * src/lib/repositories/product-query.ts) â€” purely to avoid a loading
 * flash on first render (see docs/ARCHITECTURE.md Â§5). It is NOT a
 * second implementation of search/sort/pagination; it's the one true
 * implementation, called from the client for this one bootstrap case.
 */

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Falha ao buscar ${url}: HTTP ${res.status}`);
  }
  return res.json();
}

function buildProductsUrl(query: ProductQuery): string {
  const params = new URLSearchParams();
  if (query.productIds?.length) params.set("ids", query.productIds.join(","));
  if (query.search) params.set("q", query.search);
  if (query.categorySlug) params.set("categoria", query.categorySlug);
  if (query.departmentSlug) params.set("departamento", query.departmentSlug);
  if (query.brandSlug) params.set("marca", query.brandSlug);
  if (query.productType) params.set("tipo", query.productType);
  if (query.availability) params.set("estoque", query.availability);
  if (query.sort) params.set("ordem", query.sort);
  if (query.page) params.set("pagina", String(query.page));
  if (query.pageSize) params.set("limite", String(query.pageSize));
  if (query.onlyAvailable) params.set("disponivel", "1");
  if (query.priceMin !== undefined) params.set("precoMin", String(query.priceMin));
  if (query.priceMax !== undefined) params.set("precoMax", String(query.priceMax));
  if (query.featuredOnly) params.set("destaque", "1");
  if (query.badge) params.set("badge", query.badge);
  const qs = params.toString();
  return qs ? `/api/products?${qs}` : "/api/products";
}

/**
 * The one hook every catalog-browsing screen uses (Home, Busca). Pass a
 * `ProductQuery` â€” see src/lib/repositories/product-query.ts for the
 * full shape (search, categorySlug, sort, page, pageSize, ...).
 *
 * `placeholderData: keepPreviousData` avoids a flash back to an empty/
 * loading grid while a new page or filter is being fetched â€” the
 * previous page's results stay visible (with `isFetching` true) until
 * the new ones arrive, which reads as "updating", not "reset".
 */
export function useProductQuery(query: ProductQuery) {
  return useQuery({
    queryKey: ["products", "query", query],
    queryFn: () => fetchJson<ProductQueryResult>(buildProductsUrl(query)),
    enabled: query.productIds === undefined || query.productIds.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useCategories(departmentSlug?: string) {
  return useQuery({
    queryKey: ["categories", departmentSlug],
    queryFn: async () => {
      const { categories } = await fetchJson<{ categories: Category[] }>(
        departmentSlug
          ? `/api/categories?departamento=${encodeURIComponent(departmentSlug)}`
          : "/api/categories"
      );
      return categories;
    },
  });
}

export type CatalogOption = { id: string; name: string; slug: string };

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { departments } = await fetchJson<{ departments: CatalogOption[] }>("/api/departments");
      return departments;
    },
  });
}

export function useBrands(departmentSlug?: string, categorySlug?: string, onlyAvailable?: boolean) {
  const params = new URLSearchParams();
  if (departmentSlug) params.set("departamento", departmentSlug);
  if (categorySlug) params.set("categoria", categorySlug);
  if (onlyAvailable) params.set("disponivel", "1");
  const suffix = params.toString();

  return useQuery({
    queryKey: ["brands", departmentSlug, categorySlug, onlyAvailable],
    queryFn: async () => {
      const { brands } = await fetchJson<{ brands: CatalogOption[] }>(`/api/brands${suffix ? `?${suffix}` : ""}`);
      return brands;
    },
  });
}

