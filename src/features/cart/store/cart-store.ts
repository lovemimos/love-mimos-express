import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSafeLocalStorage } from "@/lib/persist/safe-local-storage";
import type { CartLine, Product } from "@/types";
import { availableStock } from "@/lib/availability";
import { purchaseIssue } from "@/lib/purchase-validation";

type CartState = {
  lines: CartLine[];
  addItem: (line: CartLine, product?: Product) => void;
  removeItem: (productId: string, variantId?: string) => void;
  setQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clear: () => void;
  hasItem: (productId: string, variantId?: string) => boolean;
};

type PersistedCart = { lines: CartLine[] };

function sameLine(a: CartLine, productId: string, variantId?: string) {
  return a.productId === productId && a.variantId === variantId;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      addItem: (line, product) =>
        set((state) => {
          if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || (product && (product.id !== line.productId || purchaseIssue(product, line.variantId, line.quantity)))) return state;
          const max = product ? Math.floor(availableStock(product, line.variantId)) : Number.MAX_SAFE_INTEGER;
          const existing = state.lines.find((l) =>
            sameLine(l, line.productId, line.variantId)
          );
          if (existing) {
            // Adicionar o mesmo produto/variação incrementa a quantidade
            // da linha existente — nunca cria uma segunda linha para o
            // mesmo produto.
            return {
              lines: state.lines.map((l) =>
                sameLine(l, line.productId, line.variantId)
                  ? { ...l, quantity: Math.min(max, l.quantity + line.quantity) }
                  : l
              ),
            };
          }
          return { lines: [...state.lines, line] };
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          lines: state.lines.filter(
            (l) => !sameLine(l, productId, variantId)
          ),
        })),
      setQuantity: (productId, quantity, variantId) =>
        set((state) => ({
          // Quantidade <= 0 remove a linha — nunca deixa uma linha com
          // quantidade zero/negativa persistida.
          lines:
            quantity <= 0
              ? state.lines.filter((l) => !sameLine(l, productId, variantId))
              : state.lines.map((l) =>
                  sameLine(l, productId, variantId) ? { ...l, quantity } : l
                ),
        })),
      clear: () => set({ lines: [] }),
      hasItem: (productId, variantId) =>
        get().lines.some((l) => sameLine(l, productId, variantId)),
    }),
    {
      name: "love-mimos-cart",
      storage: createSafeLocalStorage<PersistedCart>("cart"),
      partialize: (state) => ({ lines: state.lines }),
    }
  )
);

export function useCartCount() {
  return useCartStore((state) =>
    state.lines.reduce((sum, l) => sum + l.quantity, 0)
  );
}

/** Scoped selector — only re-renders when this specific product/variant's
 * presence in the cart changes, not on every cart mutation. */
export function useIsInCart(productId: string, variantId?: string): boolean {
  return useCartStore((state) =>
    state.lines.some((l) => sameLine(l, productId, variantId))
  );
}
