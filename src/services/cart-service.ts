import type { Cart, CartLine, CartLineWithProduct, Product } from "@/types";

/**
 * Pure cart domain logic, deliberately decoupled from Zustand.
 *
 * `useCartStore` (src/features/cart/store/cart-store.ts) only owns
 * *persistence* of `CartLine[]` (product/variant IDs + quantity) — it has
 * no idea what a product costs or even what one looks like. This module
 * is where "what does this cart actually total to" lives, so that logic
 * is testable on its own and doesn't assume any particular state
 * management library or data source.
 */

function unitPriceOf(product: Product, variantId?: string): number {
  const variant = product.variants?.find((v) => v.id === variantId);
  return product.price + (variant?.priceModifier ?? 0);
}

/**
 * Resolves raw cart lines (IDs only) against a product catalog into fully
 * priced lines. Lines whose product no longer exists in the catalog are
 * silently dropped — see docs/features/cart.md §5 for why that's the
 * intended behavior, not a bug.
 */
export function resolveCartLines(
  lines: CartLine[],
  products: Product[]
): CartLineWithProduct[] {
  return lines.reduce<CartLineWithProduct[]>((resolved, line) => {
    const product = products.find((p) => p.id === line.productId);
    if (!product) return resolved;

    const variant = product.variants?.find((v) => v.id === line.variantId);
    const unitPrice = unitPriceOf(product, line.variantId);

    resolved.push({
      ...line,
      product,
      variant,
      lineTotal: unitPrice * line.quantity,
    });
    return resolved;
  }, []);
}

/** Derives subtotal and item count from already-resolved lines. */
export function computeCartTotals(
  lines: CartLineWithProduct[]
): Pick<Cart, "subtotal" | "itemCount"> {
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  return { subtotal, itemCount };
}

/** Convenience wrapper: raw lines + catalog in, full Cart snapshot out. */
export function buildCart(lines: CartLine[], products: Product[]): Cart {
  const resolved = resolveCartLines(lines, products);
  return { lines: resolved, ...computeCartTotals(resolved) };
}
