import { RecommendationEngine } from "@/services/recommendations/recommendation-engine";
import { RecommendationProvider } from "@/services/recommendations/recommendation-provider";
import { RelatedProductsStrategy } from "@/services/recommendations/strategies/related-products-strategy";
import { CompleteKitStrategy } from "@/services/recommendations/strategies/complete-kit-strategy";
import { BestSellerStrategy } from "@/services/recommendations/strategies/best-seller-strategy";
import { NewestProductsStrategy } from "@/services/recommendations/strategies/newest-products-strategy";
import { FavoriteBasedStrategy } from "@/services/recommendations/strategies/favorite-based-strategy";
import { CartBasedStrategy } from "@/services/recommendations/strategies/cart-based-strategy";

export * from "@/services/recommendations/types";
export { RecommendationEngine } from "@/services/recommendations/recommendation-engine";
export { RecommendationProvider } from "@/services/recommendations/recommendation-provider";

/**
 * One engine, every strategy registered once. Adding a 7th strategy
 * (e.g. a real Lumi model) means registering it here — nothing else in
 * this file, or in any provider below, changes.
 */
export const recommendationEngine = new RecommendationEngine([
  new RelatedProductsStrategy(),
  new CompleteKitStrategy(),
  new BestSellerStrategy(),
  new NewestProductsStrategy(),
  new FavoriteBasedStrategy(),
  new CartBasedStrategy(),
]);

/**
 * Three providers, three priority orders — this is the entire
 * difference between "recommendations on the Home" and "recommendations
 * on a product page": which strategy gets tried first. See
 * docs/features/recommendations.md for why each order was chosen.
 */
/**
 * Home: only personal-signal strategies. `best-seller`/`newest-products`
 * were removed from this list during the Sprint 11 MVP review — Home
 * already has dedicated `HomeBestSellers`/`HomeNewProducts` sections, so
 * falling back to the same strategies here just showed the same
 * products twice for any visitor without favorites/cart items (the most
 * common case for a first-time visitor). With no personal signal, this
 * section now correctly renders nothing (see `HomeSection`'s empty-state
 * handling) instead of duplicating content already on the page.
 */
export const homeRecommendationProvider = new RecommendationProvider(recommendationEngine, [
  "favorite-based",
  "cart-based",
]);

export const productRecommendationProvider = new RecommendationProvider(recommendationEngine, [
  "complete-kit",
  "related-products",
  "best-seller",
]);

export const cartRecommendationProvider = new RecommendationProvider(recommendationEngine, [
  "cart-based",
  "complete-kit",
  "best-seller",
]);
