import { useProductQuery } from "@/hooks/useProducts";
import type { Product } from "@/types";

// Same reasoning as useCartLines/useFavoriteProducts: recommendation
// strategies need the whole catalog to match against, not one
// filtered/paginated slice. Kept as its own hook (not shared with those
// two) because touching their files is off-limits this sprint — see
// docs/features/recommendations.md.
const FULL_CATALOG_PAGE_SIZE = 12;

export function useFullCatalog(): Product[] {
  const { data } = useProductQuery({ pageSize: FULL_CATALOG_PAGE_SIZE, onlyAvailable: true });
  return data?.items ?? [];
}
