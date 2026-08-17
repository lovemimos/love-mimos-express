import type { RecommendationContext, RecommendationStrategy } from "@/services/recommendations/types";
import type { Product } from "@/types";

/**
 * Holds every known `RecommendationStrategy` and can run any of them by
 * name. This is deliberately dumb — it doesn't decide *which* strategy
 * to use for a given situation, that's `RecommendationProvider`'s job.
 * Splitting these two responsibilities means adding a new strategy
 * (including a future Lumi one) never requires touching the selection
 * logic, and changing the selection priority never requires touching
 * strategy implementations.
 */
export class RecommendationEngine {
  private readonly strategies = new Map<string, RecommendationStrategy>();

  constructor(strategies: RecommendationStrategy[] = []) {
    for (const strategy of strategies) this.register(strategy);
  }

  register(strategy: RecommendationStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  get(name: string): RecommendationStrategy | undefined {
    return this.strategies.get(name);
  }

  list(): RecommendationStrategy[] {
    return [...this.strategies.values()];
  }

  run(name: string, context: RecommendationContext, catalog: Product[], limit: number): Product[] {
    const strategy = this.get(name);
    if (!strategy) return [];
    return strategy.getRecommendations(context, catalog, limit).slice(0, limit);
  }
}
