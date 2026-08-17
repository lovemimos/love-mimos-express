"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import ProductImage from "@/components/ui/ProductImage";
import QuantityStepper from "@/components/ui/QuantityStepper";
import { formatBRL } from "@/utils/format";
import { useCartStore } from "@/features/cart/store/cart-store";
import type { CartLineWithProduct } from "@/types";

export default function CartLineItem({ line }: { line: CartLineWithProduct }) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const unitPrice = line.product.price + (line.variant?.priceModifier ?? 0);

  return (
    <div className="flex gap-4 rounded-2xl bg-neutral-0 p-4 shadow-card">
      <Link href={`/produto/${line.product.slug}`} className="w-20 shrink-0">
        <ProductImage images={line.product.images} categorySlug={line.product.categorySlug} alt={line.product.name} />
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/produto/${line.product.slug}`} className="min-w-0">
            <h3 className="line-clamp-2 text-title text-ink">
              {line.product.name}
            </h3>
            {line.variant && (
              <p className="mt-0.5 text-xs text-ink/50">{line.variant.label}</p>
            )}
          </Link>
          <button
            onClick={() => removeItem(line.productId, line.variantId)}
            aria-label="Remover item"
            className="shrink-0 text-ink/50 transition hover:text-rose-500 active:scale-90"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <QuantityStepper
            value={line.quantity}
            onChange={(q) => setQuantity(line.productId, q, line.variantId)}
            max={line.product.stock}
          />
          <span className="font-display text-sm font-semibold text-rose-500">
            {formatBRL(unitPrice * line.quantity)}
          </span>
        </div>
      </div>
    </div>
  );
}
