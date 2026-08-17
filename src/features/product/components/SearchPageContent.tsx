"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchBar from "@/features/product/components/SearchBar";
import CategoryPills from "@/features/product/components/CategoryPills";
import SortSelect from "@/features/product/components/SortSelect";
import ProductGrid from "@/features/product/components/ProductGrid";
import { Button } from "@/components/ui/button";
import { useProductQuery, useCategories } from "@/hooks/useProducts";
import type { ProductSortOrder } from "@/lib/repositories/product-query";
import type { Product } from "@/types";

// Deliberately smaller than Home's page size — this is what makes
// "carregar mais" demonstrable even against today's small mock catalog,
// and is the page size a real (larger) Tiny catalog would actually use.
const PAGE_SIZE = 8;
// Only the URL write (and therefore the network refetch) is debounced —
// the input's visible value is never delayed. See SearchBar/task 8.
const SEARCH_SYNC_DEBOUNCE_MS = 400;

function readSort(raw: string | null): ProductSortOrder {
  if (raw === "menor-preco" || raw === "maior-preco" || raw === "nome-asc" || raw === "relevancia") {
    return raw;
  }
  return "relevancia";
}

/**
 * Supports (see docs/features/home-and-search.md):
 *   /busca?q=cola
 *   /busca?categoria=cilios
 *   /busca?q=cola&categoria=adesivos&ordem=menor-preco
 *
 * The URL (via useSearchParams) is the source of truth for category and
 * sort — selecting either writes to the URL immediately. The typed
 * search term is mirrored in local state so typing feels instant, and
 * synced to the URL after a short debounce (or immediately on Enter/
 * submit) — this is what makes the URL always representative of the
 * current results, shareable and refresh-safe, without debouncing the
 * text the user sees themselves.
 */
export default function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const activeCategory = searchParams.get("categoria");
  const sort = readSort(searchParams.get("ordem"));

  const [query, setQuery] = useState(urlQuery);
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<Product[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Back/forward navigation or a shared link can change the URL out from
  // under us — keep the visible input in sync with it.
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  function updateUrl(next: { q?: string; categoria?: string | null; ordem?: ProductSortOrder }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.categoria !== undefined) {
      if (next.categoria) params.set("categoria", next.categoria);
      else params.delete("categoria");
    }
    if (next.ordem !== undefined) {
      if (next.ordem && next.ordem !== "relevancia") params.set("ordem", next.ordem);
      else params.delete("ordem");
    }

    const qs = params.toString();
    router.replace(qs ? `/busca?${qs}` : "/busca", { scroll: false });
  }

  function handleQueryChange(next: string) {
    setQuery(next);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateUrl({ q: next }), SEARCH_SYNC_DEBOUNCE_MS);
  }

  function handleQuerySubmit(next: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPage(1);
    updateUrl({ q: next });
  }

  function handleCategorySelect(slug: string | null) {
    setPage(1);
    updateUrl({ categoria: slug });
  }

  function handleSortChange(next: ProductSortOrder) {
    setPage(1);
    updateUrl({ ordem: next });
  }

  function clearFilters() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    setPage(1);
    router.replace("/busca", { scroll: false });
  }

  const { data, isLoading, isError, isFetching, refetch } = useProductQuery({
    search: urlQuery || undefined,
    categorySlug: activeCategory || undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: categories = [] } = useCategories();

  // A new filter combination always replaces the visible list; only
  // incrementing the page (via "Carregar mais") appends to it.
  useEffect(() => {
    setAccumulated([]);
  }, [urlQuery, activeCategory, sort]);

  useEffect(() => {
    if (!data) return;
    setAccumulated((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
  }, [data, page]);

  const categoryName = activeCategory
    ? categories.find((c) => c.slug === activeCategory)?.name
    : null;

  const hasFilters = Boolean(urlQuery || activeCategory);

  return (
    <>
      <section className="px-4 pb-2 pt-4">
        <SearchBar
          value={query}
          onChange={handleQueryChange}
          onSubmit={handleQuerySubmit}
          placeholder="O que você procura hoje?"
        />
      </section>

      <section className="mb-2">
        <CategoryPills
          categories={categories}
          active={activeCategory}
          onSelect={handleCategorySelect}
        />
      </section>

      <section className="flex items-center justify-between gap-3 px-4 pb-2 pt-2">
        <span className="text-xs text-ink/50">
          {urlQuery
            ? `${data?.total ?? 0} resultado(s) para "${urlQuery}"`
            : activeCategory
              ? `${data?.total ?? 0} produtos em ${categoryName ?? "categoria"}`
              : `${data?.total ?? 0} produtos`}
        </span>
        <SortSelect value={sort} onChange={handleSortChange} />
      </section>

      <ProductGrid
        products={accumulated}
        isLoading={isLoading && page === 1}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle={
          urlQuery
            ? "Nenhum resultado encontrado"
            : activeCategory
              ? "Sem produtos nesta categoria"
              : "Nada por aqui ainda"
        }
        emptyMessage={
          urlQuery
            ? `Não encontramos nada para "${urlQuery}". Tente outra palavra ou remova os filtros.`
            : "Explore outra categoria ou veja o catálogo completo."
        }
        emptyAction={hasFilters ? { label: "Limpar filtros", onClick: clearFilters } : undefined}
      />

      {data?.hasMore && !isLoading && (
        <div className="flex justify-center px-4 pb-6">
          <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={isFetching}>
            {isFetching ? "Carregando..." : "Carregar mais"}
          </Button>
        </div>
      )}
    </>
  );
}
