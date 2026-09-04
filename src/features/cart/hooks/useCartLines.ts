import { useEffect, useMemo } from "react";
import { useCartStore } from "@/features/cart/store/cart-store";
import { useProductQuery } from "@/hooks/useProducts";
import { buildCart } from "@/services/cart-service";

/**
 * Thin composition hook: reads raw lines from the cart store, reads the
 * catalog through the same `useProductQuery` hook every other screen
 * uses, and delegates the actual resolution/math to `buildCart`
 * (src/services/cart-service.ts) — this hook itself has no business
 * logic of its own. See docs/features/cart.md and docs/ARCHITECTURE.md.
 */
export function useCartLines() {
  const lines = useCartStore((state) => state.lines);
  const productIds = useMemo(() => [...new Set(lines.map((line) => line.productId))], [lines]);
  const { data } = useProductQuery({ productIds, pageSize: Math.max(productIds.length, 1) });

  const cart = useMemo(() => buildCart(lines, data?.items ?? []), [lines, data]);
  useEffect(() => {
    for (const line of cart.lines) {
      const original = lines.find((item) => item.productId === line.productId && item.variantId === line.variantId);
      if (line.quantity > 0 && original?.quantity !== line.quantity) {
        useCartStore.getState().setQuantity(line.productId, line.quantity, line.variantId);
      }
    }
  }, [cart, lines]);
  return cart;
}
