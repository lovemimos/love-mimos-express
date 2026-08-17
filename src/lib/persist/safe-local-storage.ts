import type { PersistStorage, StorageValue } from "zustand/middleware";

/**
 * Zustand's default `createJSONStorage` helper does NOT catch JSON.parse
 * errors internally — if the persisted key ever contains malformed JSON
 * (a failed write, manual tampering, a browser extension corrupting
 * storage), the store throws an uncaught SyntaxError at initialization,
 * taking down whatever part of the app depends on it.
 *
 * This factory returns a `storage` for `zustand/middleware`'s `persist`
 * that catches that case explicitly: on any parse failure, it logs a
 * warning (scoped by `label`, e.g. "cart"/"favorites"), clears the
 * corrupted key, and returns `null` — which `persist` treats exactly
 * like "nothing was ever saved", i.e. a fresh empty state.
 *
 * Originally written for the cart store (Sprint 7); extracted here so
 * the favorites store (Sprint 8) — and any future persisted store —
 * reuses the exact same recovery behavior instead of re-implementing it.
 * See docs/features/cart.md and docs/features/favorites.md.
 */
export function createSafeLocalStorage<T>(label: string): PersistStorage<T> {
  return {
    getItem: (name) => {
      if (typeof window === "undefined") return null;
      try {
        const raw = window.localStorage.getItem(name);
        if (!raw) return null;
        return JSON.parse(raw) as StorageValue<T>;
      } catch (err) {
        console.warn(
          `[${label}] dados corrompidos em localStorage("${name}") — estado reiniciado vazio.`,
          err
        );
        try {
          window.localStorage.removeItem(name);
        } catch {
          // localStorage indisponível (modo privado, quota, etc.) — nada a fazer
        }
        return null;
      }
    },
    setItem: (name, value) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(name, JSON.stringify(value));
      } catch (err) {
        // Quota excedida ou localStorage indisponível — o estado continua
        // funcionando em memória para esta sessão, só não persiste.
        console.warn(`[${label}] falha ao salvar em localStorage.`, err);
      }
    },
    removeItem: (name) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.removeItem(name);
      } catch {
        // no-op
      }
    },
  };
}
