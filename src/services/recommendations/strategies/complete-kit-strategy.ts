import type { RecommendationContext, RecommendationStrategy } from "@/services/recommendations/types";
import { getComplementaryCategories } from "@/lib/data/kit-pairings";
import type { Product } from "@/types";

/**
 * "Produtos normalmente utilizados em conjunto" — see
 * src/lib/data/kit-pairings.ts for why this is a mock rule table, not
 * real "frequently bought together" data.
 */
export class CompleteKitStrategy implements RecommendationStrategy {
  readonly name = "complete-kit";

  isApplicable(context: RecommendationContext): boolean {
    if (!context.currentProduct) return false;
    return getComplementaryCategories(context.currentProduct.categorySlug).length > 0;
  }

  getRecommendations(context: RecommendationContext, catalog: Product[], limit: number): Product[] {
    const current = context.currentProduct;
    if (!current) return [];

    const complementary = new Set(getComplementaryCategories(current.categorySlug));
    return catalog
      .filter((p) => p.id !== current.id && complementary.has(p.categorySlug))
      .slice(0, limit);
  }
}
