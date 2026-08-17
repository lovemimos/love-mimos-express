"use client";

import HomeSection from "@/features/home/components/HomeSection";
import HomeCarousel from "@/features/home/components/HomeCarousel";
import ProductCard from "@/features/product/components/ProductCard";
import { useProductQuery } from "@/hooks/useProducts";
import type { Product } from "@/types";

export const SECTION_PAGE_SIZE = 8;

/**
 * `HomeBestSellers` and `HomeNewProducts` are the same query/render
 * logic with a different badge and copy — this is the one place that
 * logic lives, so those two components stay thin wrappers instead of
 * duplicating it. Filters by `Product["badge"]` (Sprint 6's
 * `ProductQuery.badge`, extended in Sprint 9) — goes through
 * `useProductQuery`/`ProductRepository.query()` exactly like every
 * other catalog read in the app, so it already works against Mock and
 * will work against Tiny without any change here.
 */
export function HomeBadgeSection({
  title,
  ctaHref,
  badge,
  analyticsSource,
}: {
  title: string;
  ctaHref: string;
  badge: NonNullable<Product["badge"]>;
  analyticsSource: string;
}) {
  const { data, isLoading, isError } = useProductQuery({ badge, pageSize: SECTION_PAGE_SIZE });
  const products = data?.items ?? [];

  return (
    <HomeSection
      title={title}
      ctaHref={ctaHref}
      isLoading={isLoading}
      isError={isError}
      isEmpty={products.length === 0}
    >
      <HomeCarousel
        items={products}
        keyExtractor={(p) => p.id}
        renderItem={(p) => <ProductCard product={p} analyticsSource={analyticsSource} />}
      />
    </HomeSection>
  );
}
