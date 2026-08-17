import HomeCarousel from "@/features/home/components/HomeCarousel";
import ProductCard from "@/features/product/components/ProductCard";
import { trackEvent } from "@/lib/analytics";
import type { Product } from "@/types";

/**
 * Reuses `HomeCarousel` (generic scroller, Sprint 9) and `ProductCard`
 * (Product feature) as-is — no new carousel or card implementation.
 * `recommendation_click` is tracked via a capture-phase wrapper instead
 * of extending `ProductCard` again, keeping all recommendation-specific
 * tracking self-contained in this feature.
 */
export default function RecommendationCarousel({
  products,
  strategyName,
  source,
}: {
  products: Product[];
  strategyName: string;
  source: string;
}) {
  return (
    <HomeCarousel
      items={products}
      keyExtractor={(p) => p.id}
      renderItem={(p) => (
        <div
          onClickCapture={() =>
            trackEvent({ name: "recommendation_click", strategy: strategyName, source, productId: p.id })
          }
        >
          <ProductCard product={p} />
        </div>
      )}
    />
  );
}
