"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchBar from "@/features/product/components/SearchBar";
import CategoryPills from "@/features/product/components/CategoryPills";
import ProductGrid from "@/features/product/components/ProductGrid";
import DepartmentPills from "@/features/product/components/DepartmentPills";
import CatalogFilterPanel from "@/features/product/components/CatalogFilterPanel";
import { Button } from "@/components/ui/button";
import { useProductQuery, useCategories, useDepartments, useBrands } from "@/hooks/useProducts";
import type { ProductQuery, ProductSortOrder } from "@/lib/repositories/product-query";
import type { Product } from "@/types";

// Deliberately smaller than Home's page size — this is what makes
// "carregar mais" demonstrable even against today's small mock catalog,
// and is the page size a real (larger) Tiny catalog would actually use.
const PAGE_SIZE = 12;
// Only the URL write (and therefore the network refetch) is debounced —
// the input's visible value is never delayed. See SearchBar/task 8.
const SEARCH_SYNC_DEBOUNCE_MS = 400;
const DEFAULT_DEPARTMENT = "";

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
  const department = searchParams.get("departamento") ?? DEFAULT_DEPARTMENT;
  const brand = searchParams.get("marca");
  const availability = (searchParams.get("estoque") === "sold-out" || searchParams.get("estoque") === "all" ? searchParams.get("estoque") : "available") as NonNullable<ProductQuery["availability"]>;
  const productType = (searchParams.get("tipo") === "simples" || searchParams.get("tipo") === "com-variacoes" ? searchParams.get("tipo") : undefined) as ProductQuery["productType"];
  const priceMin = searchParams.get("precoMin") ? Number(searchParams.get("precoMin")) : undefined;
  const priceMax = searchParams.get("precoMax") ? Number(searchParams.get("precoMax")) : undefined;
  const sort = readSort(searchParams.get("ordem"));

  const [query, setQuery] = useState(urlQuery);
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<Product[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Back/forward navigation or a shared link can change the URL out from
  // under us — keep the visible input in sync with it.
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  function updateUrl(next: {
    q?: string;
    categoria?: string | null;
    departamento?: string;
    marca?: string | null;
    estoque?: ProductQuery["availability"];
    tipo?: ProductQuery["productType"] | null;
    precoMin?: number;
    precoMax?: number;
    ordem?: ProductSortOrder;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.categoria !== undefined) {
      if (next.categoria) params.set("categoria", next.categoria);
      else params.delete("categoria");
    }
    if (next.departamento !== undefined) params.set("departamento", next.departamento);
    if (next.marca !== undefined) {
      if (next.marca) params.set("marca", next.marca);
      else params.delete("marca");
    }
    if (next.estoque !== undefined) next.estoque === "available" ? params.delete("estoque") : params.set("estoque", next.estoque);
    if (next.tipo !== undefined) next.tipo ? params.set("tipo", next.tipo) : params.delete("tipo");
    if (next.precoMin !== undefined) Number.isFinite(next.precoMin) ? params.set("precoMin", String(next.precoMin)) : params.delete("precoMin");
    if (next.precoMax !== undefined) Number.isFinite(next.precoMax) ? params.set("precoMax", String(next.precoMax)) : params.delete("precoMax");
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

  function handleDepartmentSelect(slug: string) {
    setPage(1);
    updateUrl({ departamento: slug, categoria: null, marca: null });
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

  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } = useProductQuery({
    search: urlQuery || undefined,
    categorySlug: activeCategory || undefined,
    departmentSlug: department,
    brandSlug: brand || undefined,
    availability,
    productType,
    priceMin,
    priceMax,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: categories = [] } = useCategories(department);
  const { data: departments = [] } = useDepartments();
  const { data: brands = [] } = useBrands(department, activeCategory ?? undefined, availability === "available");

  // A new filter combination always replaces the visible list; only
  // incrementing the page (via "Carregar mais") appends to it.
  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [urlQuery, department, activeCategory, brand, availability, productType, priceMin, priceMax, sort]);

  useEffect(() => {
    if (!data || isPlaceholderData) return;
    setAccumulated((prev) => page === 1 ? data.items : Array.from(new Map([...prev, ...data.items].map((item) => [item.id, item])).values()));
  }, [data, page, isPlaceholderData]);

  const categoryName = activeCategory
    ? categories.find((c) => c.slug === activeCategory)?.name
    : null;

  const hasFilters = Boolean(urlQuery || activeCategory || brand || productType || availability !== "available" || priceMin !== undefined || priceMax !== undefined || department !== DEFAULT_DEPARTMENT);

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

      <section aria-label="Departamentos" className="mb-1">
        <p className="px-4 pt-1 text-xs font-semibold uppercase tracking-wide text-ink/50">Departamento</p>
        <DepartmentPills departments={departments} active={department} onSelect={handleDepartmentSelect} />
      </section>

      <section className="mb-2">
        <CategoryPills
          categories={categories}
          active={activeCategory}
          onSelect={handleCategorySelect}
        />
      </section>

      <CatalogFilterPanel
        brands={brands}
        brand={brand}
        onBrandChange={(slug) => { setPage(1); updateUrl({ marca: slug }); }}
        productType={productType}
        onProductTypeChange={(value) => { setPage(1); updateUrl({ tipo: value ?? null }); }}
        availability={availability}
        onAvailabilityChange={(value) => { setPage(1); updateUrl({ estoque: value }); }}
        priceMin={priceMin}
        priceMax={priceMax}
        onPriceChange={(min, max) => { setPage(1); updateUrl({ precoMin: min ?? Number.NaN, precoMax: max ?? Number.NaN }); }}
        sort={sort}
        onSortChange={handleSortChange}
      />

      <section className="flex items-center justify-between gap-3 px-4 pb-2 pt-2">
        <span className="text-xs text-ink/50">
          {urlQuery
            ? `${data?.total ?? 0} resultado(s) para "${urlQuery}"`
            : activeCategory
              ? `${data?.total ?? 0} produtos em ${categoryName ?? "categoria"}`
              : `${data?.total ?? 0} produtos`}
        </span>
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
