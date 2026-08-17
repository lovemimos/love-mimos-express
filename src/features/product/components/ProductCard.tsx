import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import ProductBadge from "@/features/product/components/ProductBadge";
import FavoriteButton from "@/features/favorites/components/FavoriteButton";
import Rating from "@/components/ui/Rating";
import { formatBRL } from "@/utils/format";
import { trackEvent } from "@/lib/analytics";
import type { Product } from "@/types";

export default function ProductCard({
  product,
  analyticsSource,
}: {
  product: Product;
  /** Where this card is being rendered (e.g. "home_best_sellers",
   * "search_results") — optional, purely for analytics (Sprint 9 task
   * 12). Omitting it just means the click isn't tracked; existing
   * callers don't need to change. */
  analyticsSource?: string;
}) {
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
        )
      : null;
  const outOfStock = product.stock <= 0;

  return (
    <Link
      href={`/produto/${product.slug}`}
      onClick={() => {
        if (analyticsSource) {
          trackEvent({ name: "product_click", productId: product.id, source: analyticsSource });
        }
      }}
      className="group flex flex-col overflow-hidden rounded-2xl bg-neutral-0 shadow-card transition active:scale-[0.98]"
    >
      <div className="relative p-2">
        <ProductImage
          images={product.images}
          categorySlug={product.categorySlug}
          alt={product.name}
          className={outOfStock ? "opacity-50" : undefined}
        />
        {product.badge && !outOfStock && (
          <div className="absolute left-4 top-4">
            <ProductBadge type={product.badge} />
          </div>
        )}
        {outOfStock && (
          <div className="absolute left-4 top-4 rounded-full bg-ink/70 px-2 py-0.5 text-micro font-semibold uppercase tracking-wide text-white">
            Esgotado
          </div>
        )}
        <FavoriteButton productId={product.id} size="sm" className="absolute right-4 top-4" />
        {discount && !outOfStock && (
          <div className="absolute bottom-4 right-4 rounded-full bg-plum px-2 py-0.5 text-micro font-bold text-white">
            -{discount}%
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-1">
        <h3 className="line-clamp-2 text-title text-ink">
          {product.name}
        </h3>
        {product.rating && (
          <Rating value={product.rating} count={product.reviewCount} />
        )}
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="font-display text-base font-semibold text-rose-500">
            {formatBRL(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs text-ink/50 line-through">
              {formatBRL(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
