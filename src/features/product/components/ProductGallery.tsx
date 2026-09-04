"use client";

import { useRef, useState } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const validImages = normalizeImageUrls(images);
  const hasRealImages = validImages.length > 0;
  const count = Math.max(validImages.length, 1);

  return (
    <div className="min-w-0 px-4 pt-4">
      <div className="mx-auto max-w-xl">
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

      {hasRealImages && <button type="button" onClick={() => dialogRef.current?.showModal()} className="mt-2 min-h-11 text-sm font-semibold text-rose-600">Ampliar imagem</button>}
      {count > 1 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {Array.from({ length: count }).map((_, i) =>
            hasRealImages ? (
              <button
                key={i}
                type="button"
                aria-label={`Ver foto ${i + 1} de ${count}`}
                aria-current={i === activeIndex}
                onClick={() => setActiveIndex(i)}
                className={`h-16 w-16 overflow-hidden rounded-xl border-2 ${i === activeIndex ? "border-rose-500" : "border-rose-100"}`}
              ><ProductImage images={validImages} index={i} categorySlug={categorySlug} alt={`Miniatura ${i + 1}`} sizes="64px" /></button>
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
      <dialog ref={dialogRef} aria-label={`Imagem ampliada de ${productName}`} className="w-[calc(100%-32px)] max-w-2xl rounded-2xl p-4 backdrop:bg-black/60">
        <form method="dialog" className="mb-3 flex justify-end"><button className="min-h-11 rounded-full border border-rose-100 px-5 text-sm font-semibold">Fechar imagem</button></form>
        <ProductImage images={validImages} index={activeIndex} categorySlug={categorySlug} alt={productName} sizes="(max-width: 700px) 90vw, 640px" />
      </dialog>
    </div>
  );
}
