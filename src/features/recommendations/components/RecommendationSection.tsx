"use client";

import { useEffect } from "react";
import HomeSection from "@/features/home/components/HomeSection";
import RecommendationCarousel from "@/features/recommendations/components/RecommendationCarousel";
import { useRecommendations } from "@/features/recommendations/hooks/useRecommendations";
import { trackEvent } from "@/lib/analytics";
import type { RecommendationProvider } from "@/services/recommendations";
import type { Product } from "@/types";

/**
 * The single component used on Home, the product detail page, and the
 * cart page (Sprint 10 task 10) — only the `provider` and `source` props
 * differ per screen; no logic is duplicated between them. Reuses
 * `HomeSection` for the loading/error/empty/no-render policy instead of
 * reimplementing it (same reasoning as every Home section since
 * Sprint 9).
 */
export default function RecommendationSection({
  provider,
  title,
  source,
  currentProduct,
  limit = 8,
}: {
  provider: RecommendationProvider;
  title: string;
  /** Where this section renders — "home" | "product" | "cart" — used
   * only for analytics, so a strategy running on two screens is
   * distinguishable in `recommendation_view`/`recommendation_click`. */
  source: string;
  currentProduct?: Product;
  limit?: number;
}) {
  const { strategyName, products } = useRecommendations(provider, currentProduct, limit);

  useEffect(() => {
    if (products.length > 0) {
      trackEvent({ name: "recommendation_view", strategy: strategyName, source, count: products.length });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyName, products.length, source]);

  return (
    <HomeSection title={title} isEmpty={products.length === 0}>
      <RecommendationCarousel products={products} strategyName={strategyName} source={source} />
    </HomeSection>
  );
}
