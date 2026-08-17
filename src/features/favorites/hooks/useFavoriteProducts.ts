import { useMemo } from "react";
import { useFavoritesStore } from "@/features/favorites/store/favorites-store";
import { useProductQuery } from "@/hooks/useProducts";
import { resolveFavoriteProducts } from "@/services/favorites-service";

// Favorites need the whole catalog to match against, not one
// filtered/paginated slice — same reasoning as useCartLines.
const FULL_CATALOG_PAGE_SIZE = 100;

export function useFavoriteProducts() {
  const entries = useFavoritesStore((state) => state.entries);
  const { data } = useProductQuery({ pageSize: FULL_CATALOG_PAGE_SIZE });

  return useMemo(
    () => resolveFavoriteProducts(entries, data?.items ?? []),
    [entries, data]
  );
}
