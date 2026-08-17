"use client";

import { Trash2 } from "lucide-react";
import BackHeader from "@/components/layout/BackHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import ProductGrid from "@/features/product/components/ProductGrid";
import { useFavoriteProducts } from "@/features/favorites/hooks/useFavoriteProducts";
import { useFavoritesStore } from "@/features/favorites/store/favorites-store";

export default function FavoritesPage() {
  const products = useFavoriteProducts();
  const clear = useFavoritesStore((state) => state.clear);

  if (products.length === 0) {
    return (
      <div>
        <BackHeader title="Meus Favoritos" />
        <EmptyState
          emoji="💛"
          title="Você ainda não tem favoritos"
          message="Toque no coração de um produto para guardá-lo aqui."
          ctaLabel="Ver produtos"
          ctaHref="/"
        />
      </div>
    );
  }

  return (
    <div>
      <BackHeader title={`Meus Favoritos · ${products.length}`} />

      <div className="flex items-center justify-end px-4 pb-2 pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2 text-error-500 hover:bg-error-50"
          onClick={clear}
        >
          <Trash2 size={14} />
          Limpar favoritos
        </Button>
      </div>

      <ProductGrid products={products} />
    </div>
  );
}
