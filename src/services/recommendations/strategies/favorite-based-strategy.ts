import type { RecommendationContext, RecommendationStrategy } from "@/services/recommendations/types";
import type { Product } from "@/types";

/**
 * Reads favorites purely through `RecommendationContext.favoriteProductIds`
 * (built from `useFavoritesStore` in
 * `src/features/recommendations/hooks/useRecommendationContext.ts`) —
 * never imports the favorites store/service directly. This is what
 * "sem alterar Favoritos" means in practice: recommendations only ever
 * *read* favorites through its already-public API, never modify it.
 */
export class FavoriteBasedStrategy implements RecommendationStrategy {
  readonly name = "favorite-based";

  isApplicable(context: RecommendationContext): boolean {
    return context.favoriteProductIds.length > 0;
  }

  getRecommendations(context: RecommendationContext, catalog: Product[], limit: number): Product[] {
    const favoriteCategories = new Set(
      catalog
        .filter((p) => context.favoriteProductIds.includes(p.id))
        .map((p) => p.categorySlug)
    );
    if (favoriteCategories.size === 0) return [];

    const exclude = new Set([...context.favoriteProductIds, ...context.cartProductIds]);

    return catalog
      .filter((p) => favoriteCategories.has(p.categorySlug) && !exclude.has(p.id))
      .slice(0, limit);
  }
}
