import type { RecommendationContext, RecommendationStrategy } from "@/services/recommendations/types";
import type { Product } from "@/types";

/**
 * "Preparado para dados futuros. Hoje utilizar provider mock." — the
 * "provider" here is whichever `ProductRepository` supplied `catalog`
 * (Mock today, Tiny later, via `useFullCatalog`/`useProductQuery`) — this
 * strategy is just a filter over whatever it's handed, so it already
 * works against real bestseller data the moment Tiny provides a
 * `badge`/equivalent signal, with zero changes here.
 */
export class BestSellerStrategy implements RecommendationStrategy {
  readonly name = "best-seller";

  isApplicable(): boolean {
    return true; // always safe as a fallback — see RecommendationProvider's priority order
  }

  getRecommendations(context: RecommendationContext, catalog: Product[], limit: number): Product[] {
    const exclude = new Set([...context.favoriteProductIds, ...context.cartProductIds]);
    if (context.currentProduct) exclude.add(context.currentProduct.id);

    return catalog
      .filter((p) => p.badge === "mais-vendido" && !exclude.has(p.id))
      .slice(0, limit);
  }
}
