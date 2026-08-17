import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSafeLocalStorage } from "@/lib/persist/safe-local-storage";
import type { FavoriteEntry } from "@/types";

type FavoritesState = {
  entries: FavoriteEntry[];
  add: (productId: string) => void;
  remove: (productId: string) => void;
  toggle: (productId: string) => void;
  clear: () => void;
  isFavorite: (productId: string) => boolean;
};

type PersistedFavorites = { entries: FavoriteEntry[] };

/**
 * Same architectural pattern as `useCartStore`
 * (src/features/cart/store/cart-store.ts) — a global Zustand store
 * (no Provider needed), persisted via the shared corruption-safe
 * localStorage wrapper (`createSafeLocalStorage`, extracted from the
 * cart store in this same sprint so both share the exact recovery
 * behavior instead of duplicating it). See
 * docs/features/favorites.md §4 for why this mirrors the cart instead
 * of introducing a different pattern.
 */
export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      entries: [],
      add: (productId) =>
        set((state) => {
          // Nunca duplica: se já é favorito, não faz nada.
          if (state.entries.some((e) => e.productId === productId)) {
            return state;
          }
          return {
            entries: [...state.entries, { productId, addedAt: new Date().toISOString() }],
          };
        }),
      remove: (productId) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.productId !== productId),
        })),
      toggle: (productId) => {
        if (get().isFavorite(productId)) {
          get().remove(productId);
        } else {
          get().add(productId);
        }
      },
      clear: () => set({ entries: [] }),
      isFavorite: (productId) => get().entries.some((e) => e.productId === productId),
    }),
    {
      name: "love-mimos-favorites",
      storage: createSafeLocalStorage<PersistedFavorites>("favorites"),
      partialize: (state) => ({ entries: state.entries }),
    }
  )
);

export function useFavoritesCount() {
  return useFavoritesStore((state) => state.entries.length);
}

/** Scoped selector — only re-renders when this specific product's
 * favorited state changes, not on every favorites mutation. */
export function useIsFavorite(productId: string): boolean {
  return useFavoritesStore((state) => state.entries.some((e) => e.productId === productId));
}
