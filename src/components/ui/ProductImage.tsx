import Image from "next/image";
import ProductImagePlaceholder from "@/components/ui/ProductImagePlaceholder";
import { normalizeImageUrls } from "@/utils/normalize-image-url";

/**
 * Decides real photo vs. placeholder — the ONLY correct trigger is
 * whether `images` has at least one VALID URL (never just "the array
 * isn't empty" — legacy placeholder ids like "lash-1" are real strings
 * that are not real image sources, see normalize-image-url.ts).
 */
export default function ProductImage({
  images,
  index = 0,
  categorySlug,
  alt,
  className = "",
  sizes = "(max-width: 768px) 50vw, 300px",
  priority = false,
}: {
  images: string[];
  index?: number;
  categorySlug: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const validImages = normalizeImageUrls(images);
  const url = validImages[index];

  if (!url) {
    return <ProductImagePlaceholder categorySlug={categorySlug} className={className} />;
  }

  return (
    <div className={`relative aspect-square overflow-hidden rounded-2xl ${className}`}>
      <Image src={url} alt={alt} fill sizes={sizes} priority={priority} className="bg-white object-contain" />
    </div>
  );
}
