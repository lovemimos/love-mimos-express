"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/layout/Header";
import SearchBar from "@/features/product/components/SearchBar";
import CategoryPills from "@/features/product/components/CategoryPills";
import ProductGrid from "@/features/product/components/ProductGrid";
import DepartmentPills from "@/features/product/components/DepartmentPills";
import CatalogFilterPanel from "@/features/product/components/CatalogFilterPanel";
import HomeHero from "@/features/home/components/HomeHero";
import { useProductQuery, useCategories, useDepartments, useBrands } from "@/hooks/useProducts";
import type { ProductSortOrder } from "@/lib/repositories/product-query";
import { banners } from "@/lib/data/banners";
import { homeRecommendationProvider } from "@/services/recommendations";

// Below-the-fold, non-critical sections — code-split so the initial
// Home bundle stays focused on the hero/search/grid (Sprint 9 task 10:
// "lazy loading onde fizer sentido"). Each already renders `null` when
// it has nothing to show (see HomeSection), so there's no layout jump
// while these chunks load in.
const HomeContinueShopping = dynamic(() => import("@/features/home/components/HomeContinueShopping"));
const HomeFavorites = dynamic(() => import("@/features/home/components/HomeFavorites"));
const HomeCategories = dynamic(() => import("@/features/home/components/HomeCategories"));
const HomeBestSellers = dynamic(() => import("@/features/home/components/HomeBestSellers"));
const HomeNewProducts = dynamic(() => import("@/features/home/components/HomeNewProducts"));
const RecommendationSection = dynamic(() => import("@/features/recommendations/components/RecommendationSection"));

// Home shows the whole (filtered) catalog at once, no "load more" — a
// generous page size keeps that feel without a second, duplicate
// client-side filter on top of the query. See docs/features/home-and-search.md.
const HOME_PAGE_SIZE = 500;
const DEFAULT_DEPARTMENT = "lash-designer";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [department, setDepartment] = useState(DEFAULT_DEPARTMENT);
  const [brand, setBrand] = useState<string | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState<ProductSortOrder>("relevancia");

  const { data, isLoading, isError, refetch } = useProductQuery({
    search: query || undefined,
    categorySlug: activeCategory || undefined,
    departmentSlug: department,
    brandSlug: brand || undefined,
    onlyAvailable,
    sort,
    pageSize: HOME_PAGE_SIZE,
  });
  const { data: categories = [] } = useCategories(department);
  const { data: departments = [] } = useDepartments();
  const { data: brands = [] } = useBrands(department, activeCategory ?? undefined, onlyAvailable);

  const products = data?.items ?? [];
  const total = data?.total ?? 0;

  function clearFilters() {
    setQuery("");
    setActiveCategory(null);
    setBrand(null);
    setOnlyAvailable(false);
    setSort("relevancia");
  }

  function selectDepartment(slug: string) {
    setDepartment(slug);
    setActiveCategory(null);
    setBrand(null);
  }

  return (
    <div>
      <Header />

      <section className="px-4 pb-2 pt-4">
        <SearchBar value={query} onChange={setQuery} />
      </section>

      <HomeHero banners={banners} />

      <HomeContinueShopping />
      <HomeFavorites />
      <HomeCategories />
      <HomeBestSellers />
      <HomeNewProducts />
      <RecommendationSection
        provider={homeRecommendationProvider}
        title="Recomendado para Você"
        source="home"
      />

      <section aria-label="Departamentos" className="mb-1">
        <p className="px-4 pt-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Departamento</p>
        <DepartmentPills departments={departments} active={department} onSelect={selectDepartment} />
      </section>

      <section className="mb-2">
        <CategoryPills
          categories={categories}
          active={activeCategory}
          onSelect={setActiveCategory}
        />
      </section>

      <CatalogFilterPanel
        brands={brands}
        brand={brand}
        onBrandChange={setBrand}
        onlyAvailable={onlyAvailable}
        onOnlyAvailableChange={setOnlyAvailable}
        sort={sort}
        onSortChange={setSort}
      />

      <section className="mt-2 flex items-center justify-between px-4 pb-2">
        <h2 className="font-display text-h2 text-plum">
          {activeCategory
            ? categories.find((c) => c.slug === activeCategory)?.name
            : "Todos os produtos"}
        </h2>
        <span className="text-xs text-ink/50">{total} itens</span>
      </section>

      <ProductGrid
        products={products}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle={query ? "Nenhum resultado encontrado" : "Sem produtos nesta categoria"}
        emptyMessage={
          query
            ? `Não encontramos nada para "${query}".`
            : "Explore outra categoria ou veja o catálogo completo."
        }
        emptyAction={
          query || activeCategory || brand || onlyAvailable
            ? { label: "Ver todos os produtos", onClick: clearFilters }
            : undefined
        }
      />
    </div>
  );
}
