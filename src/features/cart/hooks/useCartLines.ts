import { useMemo } from "react";
import { useCartStore } from "@/features/cart/store/cart-store";
import { useProductQuery } from "@/hooks/useProducts";
import { buildCart } from "@/services/cart-service";

// Cart resolution needs the whole catalog to match against (a cart line
// could reference any product), not one filtered/paginated slice.
const FULL_CATALOG_PAGE_SIZE = 100;

/**
 * Thin composition hook: reads raw lines from the cart store, reads the
 * catalog through the same `useProductQuery` hook every other screen
 * uses, and delegates the actual resolution/math to `buildCart`
 * (src/services/cart-service.ts) — this hook itself has no business
 * logic of its own. See docs/features/cart.md and docs/ARCHITECTURE.md.
 */
export function useCartLines() {
  const lines = useCartStore((state) => state.lines);
  const { data } = useProductQuery({ pageSize: FULL_CATALOG_PAGE_SIZE });

  return useMemo(() => buildCart(lines, data?.items ?? []), [lines, data]);
}
