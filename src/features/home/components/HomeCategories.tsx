"use client";

import Link from "next/link";
import HomeSection from "@/features/home/components/HomeSection";
import HomeCarousel from "@/features/home/components/HomeCarousel";
import CategoryIcon from "@/components/ui/CategoryIcon";
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

  return (
    <HomeSection title="Categorias em Destaque" isLoading={isLoading} isError={isError} isEmpty={categories.length === 0}>
      <HomeCarousel
        items={categories}
        keyExtractor={(c) => c.id}
        itemClassName="w-24"
        renderItem={(category) => (
          <Link
            href={`/busca?categoria=${category.slug}`}
            onClick={() => trackEvent({ name: "category_click", categorySlug: category.slug })}
            className="flex flex-col items-center gap-2 text-center"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-500 shadow-card transition active:scale-95">
              <CategoryIcon name={category.icon} size={24} />
            </span>
            <span className="line-clamp-1 text-xs font-medium text-ink">{category.name}</span>
          </Link>
        )}
      />
    </HomeSection>
  );
}
