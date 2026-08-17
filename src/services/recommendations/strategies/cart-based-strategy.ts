import type { RecommendationContext, RecommendationStrategy } from "@/services/recommendations/types";
import { getComplementaryCategories } from "@/lib/data/kit-pairings";
import type { Product } from "@/types";

/**
 * Reads the cart purely through `RecommendationContext.cartProductIds`
 * (built from `useCartStore` in `useRecommendationContext.ts`) — never
 * imports the cart store/service directly. Same reasoning as
 * `FavoriteBasedStrategy` re: "sem alterar Carrinho" — read-only access
 * through the store's already-public API.
 */
export class CartBasedStrategy implements RecommendationStrategy {
  readonly name = "cart-based";

  isApplicable(context: RecommendationContext): boolean {
    return context.cartProductIds.length > 0;
  }

  getRecommendations(context: RecommendationContext, catalog: Product[], limit: number): Product[] {
    const cartProducts = catalog.filter((p) => context.cartProductIds.includes(p.id));
    if (cartProducts.length === 0) return [];

    const cartCategories = new Set(cartProducts.map((p) => p.categorySlug));
    const complementary = new Set(
      cartProducts.flatMap((p) => getComplementaryCategories(p.categorySlug))
    );

    const exclude = new Set([...context.cartProductIds, ...context.favoriteProductIds]);

    // Prefer complementary categories (ex.: cílios no carrinho -> sugerir
    // cola) — só cai para "mesma categoria" se não houver par definido em
    // src/lib/data/kit-pairings.ts.
    const complementaryMatches = catalog.filter(
      (p) => complementary.has(p.categorySlug) && !exclude.has(p.id)
    );
    if (complementaryMatches.length > 0) return complementaryMatches.slice(0, limit);

    return catalog
      .filter((p) => cartCategories.has(p.categorySlug) && !exclude.has(p.id))
      .slice(0, limit);
  }
}
