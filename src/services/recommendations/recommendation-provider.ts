import type { RecommendationEngine } from "@/services/recommendations/recommendation-engine";
import type { RecommendationContext, RecommendationResult } from "@/services/recommendations/types";
import type { Product } from "@/types";

/**
 * Picks a strategy automatically from a prioritized list — tries each
 * name in order, skips any that aren't `isApplicable` for this context
 * or that produce zero results, and returns the first one that works.
 * Different call sites (Home, Product, Cart) pass different priority
 * orders (see `src/services/recommendations/index.ts`) without any
 * duplicated selection logic — only the *order* differs.
 */
export class RecommendationProvider {
  constructor(
    private readonly engine: RecommendationEngine,
    private readonly priority: string[]
  ) {}

  resolve(context: RecommendationContext, catalog: Product[], limit: number): RecommendationResult {
    for (const name of this.priority) {
      const strategy = this.engine.get(name);
      if (!strategy || !strategy.isApplicable(context)) continue;

      const products = strategy.getRecommendations(context, catalog, limit).slice(0, limit);
      if (products.length > 0) return { strategyName: name, products };
    }

    return { strategyName: "none", products: [] };
  }
}
