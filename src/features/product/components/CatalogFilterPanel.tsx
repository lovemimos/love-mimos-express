"use client";

import SortSelect from "@/features/product/components/SortSelect";
import type { CatalogOption } from "@/hooks/useProducts";
import type { ProductSortOrder } from "@/lib/repositories/product-query";

export default function CatalogFilterPanel({
  brands,
  brand,
  onBrandChange,
  onlyAvailable,
  onOnlyAvailableChange,
  sort,
  onSortChange,
}: {
  brands: CatalogOption[];
  brand: string | null;
  onBrandChange: (slug: string | null) => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (value: boolean) => void;
  sort: ProductSortOrder;
  onSortChange: (value: ProductSortOrder) => void;
}) {
  const activeCount = Number(Boolean(brand)) + Number(onlyAvailable);

  return (
    <details className="mx-4 mb-2 rounded-2xl border border-rose-100 bg-neutral-0 shadow-card">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-plum">
        Filtrar{activeCount ? ` · ${activeCount}` : ""}
      </summary>
      <div className="grid gap-3 border-t border-rose-100 p-4">
        <label className="grid gap-1 text-xs font-semibold text-ink/60">
          Marca
          <select
            aria-label="Filtrar por marca"
            value={brand ?? ""}
            onChange={(event) => onBrandChange(event.target.value || null)}
            className="rounded-full border border-rose-100 bg-cream px-4 py-2.5 text-sm font-medium text-ink"
          >
            <option value="">Todas as marcas</option>
            {brands.map((option) => (
              <option key={option.id} value={option.slug}>{option.name}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(event) => onOnlyAvailableChange(event.target.checked)}
            className="h-4 w-4 accent-rose-500"
          />
          Somente disponíveis
        </label>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-ink/60">Ordenação</span>
          <SortSelect value={sort} onChange={onSortChange} />
        </div>
      </div>
    </details>
  );
}
