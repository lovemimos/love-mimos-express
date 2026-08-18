import type { Product, ProductVariant } from "@/types";

export function isVariantAvailable(variant: ProductVariant): boolean {
  return variant.active !== false && (variant.stock ?? 0) > 0;
}

export function isProductAvailable(product: Product): boolean {
  if (product.active === false) return false;
  const variants = product.variants ?? [];
  return variants.length > 0
    ? variants.some(isVariantAvailable)
    : product.stock > 0;
}

export function availableStock(product: Product, variantId?: string): number {
  const variants = product.variants ?? [];
  if (variants.length === 0) return Math.max(0, product.stock);
  const variant = variants.find((item) => item.id === variantId);
  return variant && isVariantAvailable(variant) ? Math.max(0, variant.stock ?? 0) : 0;
}
