import { useMemo } from "react";
import { useCartStore } from "@/features/cart/store/cart-store";
import { useFavoritesStore } from "@/features/favorites/store/favorites-store";
import type { RecommendationContext } from "@/services/recommendations";
import type { Product } from "@/types";

/**
 * Builds a `RecommendationContext` from the cart and favorites stores —
 * read-only, via the same public selectors every other consumer of
 * those stores already uses (`useCartStore((s) => s.lines)`,
 * `useFavoritesStore((s) => s.entries)`). This file never imports
 * `cart-service.ts`/`favorites-service.ts` and never calls a mutating
 * action — satisfies "não alterar Carrinho/Favoritos" by construction,
 * not just by convention.
 */
export function useRecommendationContext(currentProduct?: Product): RecommendationContext {
  const cartLines = useCartStore((state) => state.lines);
  const favoriteEntries = useFavoritesStore((state) => state.entries);

  return useMemo(
    () => ({
      cartProductIds: cartLines.map((line) => line.productId),
      favoriteProductIds: favoriteEntries.map((entry) => entry.productId),
      currentProduct,
    }),
    [cartLines, favoriteEntries, currentProduct]
  );
}
