"use client";

import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import ProductImagePlaceholder from "@/components/ui/ProductImagePlaceholder";
import { normalizeImageUrls } from "@/utils/normalize-image-url";

/**
 * Galeria de fotos do produto. Quando `images` tem URLs válidas, os
 * pontos abaixo trocam a foto de verdade (a primeira válida é sempre a
 * "imagem principal"). Usa o mesmo `normalizeImageUrls` que
 * `ProductImage` — valores legados inválidos (ex.: "lash-1") nunca
 * contam como foto real, nem aqui nem lá.
 */
export default function ProductGallery({
  images,
  categorySlug,
  productName,
}: {
  images: string[];
  categorySlug: string;
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const validImages = normalizeImageUrls(images);
  const hasRealImages = validImages.length > 0;
  const count = Math.max(validImages.length, 1);

  return (
    <div className="px-4 pt-4">
      {hasRealImages ? (
        <ProductImage
          images={images}
          index={activeIndex}
          categorySlug={categorySlug}
          alt={`${productName}${count > 1 ? ` — foto ${activeIndex + 1} de ${count}` : ""}`}
          className="rounded-3xl"
          sizes="(max-width: 768px) 100vw, 480px"
          priority
        />
      ) : (
        <ProductImagePlaceholder categorySlug={categorySlug} className="rounded-3xl" />
      )}

      {count > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: count }).map((_, i) =>
            hasRealImages ? (
              <button
                key={i}
                type="button"
                aria-label={`Ver foto ${i + 1} de ${count}`}
                aria-current={i === activeIndex}
                onClick={() => setActiveIndex(i)}
                className={
                  i === activeIndex ? "h-1.5 w-5 rounded-full bg-rose-500" : "h-1.5 w-1.5 rounded-full bg-rose-100"
                }
              />
            ) : (
              <span
                key={i}
                aria-hidden="true"
                className={i === 0 ? "h-1.5 w-5 rounded-full bg-rose-500" : "h-1.5 w-1.5 rounded-full bg-rose-100"}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
