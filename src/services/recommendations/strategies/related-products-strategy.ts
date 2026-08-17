import type { RecommendationContext, RecommendationStrategy } from "@/services/recommendations/types";
import type { Product } from "@/types";

/**
 * "Baseado em categoria, marca, tags" — today `Product` only has
 * `categorySlug` (see src/types/index.ts); there is no `marca`/`tags`
 * field on the model yet (same honest limitation already documented for
 * search in docs/features/product.md §4). This strategy only matches on
 * category, and is written so adding brand/tags later is a one-line
 * change to the scoring, not a redesign.
 */
export class RelatedProductsStrategy implements RecommendationStrategy {
  readonly name = "related-products";

  isApplicable(context: RecommendationContext): boolean {
    return Boolean(context.currentProduct);
  }

  getRecommendations(context: RecommendationContext, catalog: Product[], limit: number): Product[] {
    const current = context.currentProduct;
    if (!current) return [];

    return catalog
      .filter((p) => p.id !== current.id && p.categorySlug === current.categorySlug)
      .slice(0, limit);
  }
}
