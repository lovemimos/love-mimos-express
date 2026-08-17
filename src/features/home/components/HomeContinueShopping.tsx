"use client";

import HomeSection from "@/features/home/components/HomeSection";
import HomeCarousel from "@/features/home/components/HomeCarousel";
import ProductCard from "@/features/product/components/ProductCard";
import { useCartLines } from "@/features/cart/hooks/useCartLines";

/**
 * "Caso exista carrinho: exibir produtos do carrinho + botão 'Ver
 * carrinho'. Caso contrário: não renderizar." — the "don't render"
 * half of that rule lives in `HomeSection` (via `isEmpty`), not
 * duplicated here.
 */
export default function HomeContinueShopping() {
  const { lines } = useCartLines();
  const products = lines.map((line) => line.product);

  return (
    <HomeSection
      title="Continue Comprando"
      ctaHref="/carrinho"
      ctaLabel="Ver carrinho"
      isEmpty={products.length === 0}
    >
      <HomeCarousel
        items={products}
        keyExtractor={(p) => p.id}
        renderItem={(p) => <ProductCard product={p} analyticsSource="home_continue_shopping" />}
      />
    </HomeSection>
  );
}
