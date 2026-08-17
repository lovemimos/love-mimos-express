import type { FavoriteEntry, Product } from "@/types";

/**
 * Pure favorites domain logic, deliberately decoupled from Zustand —
 * same architectural split as `src/services/cart-service.ts`:
 * `useFavoritesStore` only owns *persistence* of product IDs + when they
 * were favorited; this module is where "what do those IDs actually mean
 * against the current catalog" lives, testable on its own.
 */

/**
 * Resolves favorite entries (IDs only) against a product catalog into
 * full `Product` objects, most recently favorited first. Entries whose
 * product no longer exists in the catalog (removed, discontinued) are
 * silently dropped — same intended behavior as
 * `resolveCartLines` (see docs/features/cart.md §5) — not a bug.
 */
export function resolveFavoriteProducts(
  entries: FavoriteEntry[],
  products: Product[]
): Product[] {
  const byRecency = [...entries].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );

  return byRecency.reduce<Product[]>((resolved, entry) => {
    const product = products.find((p) => p.id === entry.productId);
    if (product) resolved.push(product);
    return resolved;
  }, []);
}
