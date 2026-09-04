"use client";

import { SlidersHorizontal } from "lucide-react";
import SortSelect from "@/features/product/components/SortSelect";
import type { CatalogOption } from "@/hooks/useProducts";
import type { ProductQuery, ProductSortOrder } from "@/lib/repositories/product-query";

type Availability = NonNullable<ProductQuery["availability"]>;

export default function CatalogFilterPanel({ brands, brand, onBrandChange, productType, onProductTypeChange, availability, onAvailabilityChange, priceMin, priceMax, onPriceChange, sort, onSortChange }: {
  brands: CatalogOption[]; brand: string | null; onBrandChange: (slug: string | null) => void;
  productType: ProductQuery["productType"]; onProductTypeChange: (value: ProductQuery["productType"]) => void;
  availability: Availability; onAvailabilityChange: (value: Availability) => void;
  priceMin?: number; priceMax?: number; onPriceChange: (min?: number, max?: number) => void;
  sort: ProductSortOrder; onSortChange: (value: ProductSortOrder) => void;
}) {
  const activeCount = Number(Boolean(brand)) + Number(Boolean(productType)) + Number(availability !== "available") + Number(priceMin !== undefined || priceMax !== undefined);
  const numberValue = (value: string) => value.trim() === "" ? undefined : Number(value);
  return (
    <details open className="mx-4 mb-3 overflow-hidden rounded-2xl border-2 border-rose-200 bg-white shadow-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between bg-rose-50 px-4 py-3 text-sm font-bold text-plum">
        <span className="flex items-center gap-2"><SlidersHorizontal size={18} /> Filtros</span>
        {activeCount > 0 && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs text-white">{activeCount}</span>}
      </summary>
      <div className="grid gap-4 border-t border-rose-100 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="grid gap-1 text-xs font-semibold text-ink/60">Marca<select aria-label="Filtrar por marca" value={brand ?? ""} onChange={(event) => onBrandChange(event.target.value || null)} className="min-h-11 rounded-xl border border-rose-100 bg-cream px-3 text-sm font-medium text-ink"><option value="">Todas as marcas</option>{brands.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-semibold text-ink/60">Tipo de produto<select aria-label="Filtrar por tipo de produto" value={productType ?? ""} onChange={(event) => onProductTypeChange((event.target.value || undefined) as ProductQuery["productType"])} className="min-h-11 rounded-xl border border-rose-100 bg-cream px-3 text-sm font-medium text-ink"><option value="">Todos os tipos</option><option value="simples">Produto simples</option><option value="com-variacoes">Com variações</option></select></label>
        <label className="grid gap-1 text-xs font-semibold text-ink/60">Disponibilidade<select aria-label="Filtrar por disponibilidade" value={availability} onChange={(event) => onAvailabilityChange(event.target.value as Availability)} className="min-h-11 rounded-xl border border-rose-100 bg-cream px-3 text-sm font-medium text-ink"><option value="available">Em estoque</option><option value="sold-out">Esgotados</option><option value="all">Todos</option></select></label>
        <fieldset className="grid grid-cols-2 gap-2"><legend className="col-span-2 mb-1 text-xs font-semibold text-ink/60">Faixa de preço</legend><input aria-label="Preço mínimo" type="number" min="0" step="1" placeholder="Mín." value={priceMin ?? ""} onChange={(event) => onPriceChange(numberValue(event.target.value), priceMax)} className="min-h-11 min-w-0 rounded-xl border border-rose-100 bg-cream px-3 text-sm" /><input aria-label="Preço máximo" type="number" min="0" step="1" placeholder="Máx." value={priceMax ?? ""} onChange={(event) => onPriceChange(priceMin, numberValue(event.target.value))} className="min-h-11 min-w-0 rounded-xl border border-rose-100 bg-cream px-3 text-sm" /></fieldset>
        <label className="grid gap-1 text-xs font-semibold text-ink/60">Ordenação<SortSelect value={sort} onChange={onSortChange} /></label>
      </div>
    </details>
  );
}
