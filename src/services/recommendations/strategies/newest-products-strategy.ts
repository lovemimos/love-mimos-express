import type { RecommendationContext, RecommendationStrategy } from "@/services/recommendations/types";
import type { Product } from "@/types";

/**
 * "Preparado para Tiny. Hoje utilizar provider mock." — same reasoning
 * as `BestSellerStrategy`: Tiny's product payload includes
 * `dataCriacao` (see docs/API_TINY.md §5), so a real "newest first" sort
 * is a straightforward upgrade to this strategy later (sort by that
 * date instead of filtering by the mock `"novo"` badge) — the
 * `RecommendationStrategy` interface doesn't need to change either way.
 */
export class NewestProductsStrategy implements RecommendationStrategy {
  readonly name = "newest-products";

  isApplicable(): boolean {
    return true; // always safe as a fallback
  }

  getRecommendations(context: RecommendationContext, catalog: Product[], limit: number): Product[] {
    const exclude = new Set([...context.favoriteProductIds, ...context.cartProductIds]);
    if (context.currentProduct) exclude.add(context.currentProduct.id);

    return catalog
      .filter((p) => p.badge === "novo" && !exclude.has(p.id))
      .slice(0, limit);
  }
}
