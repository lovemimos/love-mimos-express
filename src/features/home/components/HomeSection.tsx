import type { ReactNode } from "react";
import HomeSectionTitle from "@/features/home/components/HomeSectionTitle";

function DefaultCarouselSkeleton() {
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="w-40 shrink-0 overflow-hidden rounded-2xl bg-neutral-0 shadow-card">
          <div className="aspect-square animate-pulse bg-rose-100/60" />
          <div className="flex flex-col gap-2 px-3 pb-3 pt-2">
            <div className="h-3 w-4/5 animate-pulse rounded-full bg-rose-100/60" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-rose-100/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Every Home section (`HomeContinueShopping`, `HomeFavorites`,
 * `HomeBestSellers`, `HomeNewProducts`, ...) renders through this
 * wrapper instead of each reimplementing the same policy:
 *
 * - `isError` → renders nothing. These are secondary, supplementary
 *   blocks — a broken "Mais Vendidos" carousel shouldn't put a scary
 *   error message on the Home screen and compromise the primary
 *   shopping experience the way a broken product grid would. The
 *   "treatment" of the error state is exactly this: fail quietly,
 *   never break the page. See docs/features/home.md.
 * - `isLoading` → shows a skeleton (default provided, or a custom one).
 * - `isEmpty` (and not loading) → renders nothing. This is the
 *   "caso contrário, não renderizar" rule from every section's spec —
 *   centralized here instead of repeated in each section component.
 * - otherwise → renders `children`.
 */
export default function HomeSection({
  title,
  ctaLabel,
  ctaHref,
  onCtaClick,
  isLoading = false,
  isError = false,
  isEmpty = false,
  loadingSkeleton,
  children,
}: {
  title: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  loadingSkeleton?: ReactNode;
  children: ReactNode;
}) {
  if (isError) return null;
  if (!isLoading && isEmpty) return null;

  return (
    <section className="mb-6">
      <HomeSectionTitle title={title} ctaLabel={ctaLabel} ctaHref={ctaHref} onCtaClick={onCtaClick} />
      {isLoading ? loadingSkeleton ?? <DefaultCarouselSkeleton /> : children}
    </section>
  );
}
