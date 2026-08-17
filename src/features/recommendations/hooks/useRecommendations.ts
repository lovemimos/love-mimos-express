import { useMemo } from "react";
import { useRecommendationContext } from "@/features/recommendations/hooks/useRecommendationContext";
import { useFullCatalog } from "@/features/recommendations/hooks/useFullCatalog";
import type { RecommendationProvider, RecommendationResult } from "@/services/recommendations";
import type { Product } from "@/types";

export function useRecommendations(
  provider: RecommendationProvider,
  currentProduct?: Product,
  limit = 8
): RecommendationResult {
  const context = useRecommendationContext(currentProduct);
  const catalog = useFullCatalog();

  return useMemo(
    () => provider.resolve(context, catalog, limit),
    [provider, context, catalog, limit]
  );
}
