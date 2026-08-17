"use client";

import { ArrowUpDown } from "lucide-react";
import type { ProductSortOrder } from "@/lib/repositories/product-query";

const OPTIONS: { value: ProductSortOrder; label: string }[] = [
  { value: "relevancia", label: "Relevância" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
  { value: "nome-asc", label: "Nome de A a Z" },
];

export default function SortSelect({
  value,
  onChange,
}: {
  value: ProductSortOrder;
  onChange: (value: ProductSortOrder) => void;
}) {
  return (
    <div className="relative">
      <ArrowUpDown
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-plum/50"
      />
      <select
        aria-label="Ordenar produtos"
        value={value}
        onChange={(e) => onChange(e.target.value as ProductSortOrder)}
        className="appearance-none rounded-full border border-rose-100 bg-neutral-0 py-2 pl-8 pr-4 text-xs font-medium text-ink shadow-card transition-colors focus:border-rose-300"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
