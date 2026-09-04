"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, Scissors, Droplets, Paintbrush, Sparkles, Package } from "lucide-react";
import HomeSection from "@/features/home/components/HomeSection";
import { useCategories } from "@/hooks/useProducts";
import { trackEvent } from "@/lib/analytics";

/**
 * Distinct from `CategoryPills` (the in-page filter row already on
 * Home) — this is a visual showcase with a real destination (Sprint 9
 * task 5: "melhorar apresentação visual" + "CTA para visualizar
 * categoria"), linking into `/busca?categoria=...` (the URL-driven
 * search page from Sprint 6) instead of just filtering the current
 * page. `CategoryPills` wasn't touched/removed — both coexist.
 */
export default function HomeCategories() {
  const { data: categories = [], isLoading, isError } = useCategories();
  const [expanded, setExpanded] = useState(false);
  const featuredSlugs = ["cilios", "nail-designer", "colas-e-adesivos", "pincas", "higienizacao", "acessorios"];
  const ordered = [...categories].sort((a, b) => {
    const rank = (slug: string) => { const i = featuredSlugs.indexOf(slug); return i < 0 ? featuredSlugs.length : i; };
    return rank(a.slug) - rank(b.slug);
  });
  const icons = [Eye, Paintbrush, Droplets, Scissors, Sparkles, Package];

  return (
    <HomeSection title="Categorias em Destaque" isLoading={isLoading} isError={isError} isEmpty={categories.length === 0}>
      <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-6">
        {(expanded ? ordered : ordered.slice(0, 6)).map((category, index) => {
          const Icon = icons[index % icons.length];
          return (
          <Link
            key={category.id}
            href={`/busca?categoria=${category.slug}`}
            onClick={() => trackEvent({ name: "category_click", categorySlug: category.slug })}
            className="flex min-h-28 min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-3 text-center transition hover:bg-rose-100"
          >
            <span className="flex h-10 w-10 items-center justify-center text-rose-500">
              <Icon size={25} />
            </span>
            <span className="break-words text-xs font-semibold text-ink">{category.name}</span>
          </Link>
        );})}
      </div>
      {categories.length > 6 && <button className="mx-4 mt-3 min-h-11 text-sm font-semibold text-rose-600" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? "Mostrar menos categorias" : "Ver todas as categorias"}</button>}
    </HomeSection>
  );
}
