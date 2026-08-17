import type { Product } from "@/types";

/**
 * What any recommendation strategy needs to do its job. Kept to IDs and
 * the current product (never resolved recommendation results) so it's
 * cheap to build from existing stores (`useCartStore`,
 * `useFavoritesStore`) without any new persistence — see
 * `useRecommendationContext` (src/features/recommendations/hooks).
 */
export type RecommendationContext = {
  favoriteProductIds: string[];
  cartProductIds: string[];
  /** The product being viewed — only present on the product detail
   * page. Strategies that need "what's related to THIS item"
   * (`RelatedProductsStrategy`, `CompleteKitStrategy`) require this;
   * their `isApplicable` returns `false` without it. */
  currentProduct?: Product;
};

/**
 * The interface every recommendation strategy implements — six rule-
 * based strategies today, an actual Lumi model later. Nothing that
 * consumes a strategy (`RecommendationEngine`, `RecommendationProvider`,
 * `RecommendationSection`) ever depends on a concrete implementation,
 * only this interface — see docs/ARCHITECTURE.md.
 */
export interface RecommendationStrategy {
  readonly name: string;

  /**
   * Whether this strategy has enough signal to produce anything
   * meaningful for this context — e.g. `FavoriteBasedStrategy` needs at
   * least one favorite; `RelatedProductsStrategy` needs a
   * `currentProduct`. `RecommendationProvider` uses this to pick a
   * strategy automatically instead of always running every strategy and
   * discarding empty results.
   */
  isApplicable(context: RecommendationContext): boolean;

  /**
   * Produces recommendations from the given catalog. `catalog` is
   * whatever `ProductRepository.query()` returned — this function never
   * fetches data itself, so it works identically whether the catalog
   * came from `MockProductRepository` or `TinyProductRepository`.
   */
  getRecommendations(context: RecommendationContext, catalog: Product[], limit: number): Product[];
}

/** What `RecommendationProvider.resolve()` returns — the products, and
 * which strategy actually produced them (useful for analytics/debugging
 * — see `recommendation_view` in src/lib/analytics.ts). */
export type RecommendationResult = {
  strategyName: string;
  products: Product[];
};
