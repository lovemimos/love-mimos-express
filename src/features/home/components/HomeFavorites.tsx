"use client";

import HomeSection from "@/features/home/components/HomeSection";
import HomeCarousel from "@/features/home/components/HomeCarousel";
import ProductCard from "@/features/product/components/ProductCard";
import { useFavoriteProducts } from "@/features/favorites/hooks/useFavoriteProducts";

export default function HomeFavorites() {
  const products = useFavoriteProducts();

  return (
    <HomeSection
      title="Seus Favoritos"
      ctaHref="/favoritos"
      ctaLabel="Ver tudo"
      isEmpty={products.length === 0}
    >
      <HomeCarousel
        items={products}
        keyExtractor={(p) => p.id}
        renderItem={(p) => <ProductCard product={p} analyticsSource="home_favorites" />}
      />
    </HomeSection>
  );
}
