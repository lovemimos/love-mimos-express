import type { CartLineWithProduct, Product } from "@/types";
import { availableStock } from "@/lib/availability";

/** Canonical price: the mapper represents a variant price as base + modifier. */
export function effectivePrice(product: Product, variantId?: string): number | null {
  const variants = product.variants ?? [];
  const variant = variants.find((v) => v.id === variantId);
  if ((variants.length > 0 && (!variant || variant.active === false)) || (!variants.length && variantId)) return null;
  const price = product.price + (variant?.priceModifier ?? 0);
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function cardPrice(product: Product): number | null {
  if (!product.variants?.length) return effectivePrice(product);
  const valid = product.variants.filter((v) => v.active !== false && effectivePrice(product, v.id) !== null);
  const available = valid.filter((v) => availableStock(product, v.id) > 0);
  const prices = (available.length ? available : valid)
    .map((v) => effectivePrice(product, v.id))
    .filter((price): price is number => price !== null);
  return prices.length ? Math.min(...prices) : null;
}

export function purchaseIssue(product: Product, variantId: string | undefined, quantity: number): string | null {
  if (product.variants?.length && !product.variants.some((v) => v.id === variantId && v.active !== false)) {
    return "Selecione uma variação válida.";
  }
  if (effectivePrice(product, variantId) === null) return "Preço indisponível. Remova o item ou consulte o atendimento.";
  const stock = availableStock(product, variantId);
  if (product.active === false || !Number.isFinite(stock) || stock < 1) return "Produto indisponível. Remova o item do carrinho.";
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > Math.floor(stock)) {
    return `Ajuste a quantidade: há ${Math.floor(stock)} unidade(s) disponível(is).`;
  }
  return null;
}

export function orderIssue(lines: CartLineWithProduct[]): string | null {
  if (!lines.length) return "Seu carrinho está vazio.";
  const quantities = new Map<string, number>();
  for (const line of lines) {
    const issue = purchaseIssue(line.product, line.variantId, line.quantity);
    if (issue) return `${line.product.name}: ${issue}`;
    const key = JSON.stringify([line.productId, line.variantId]);
    const total = (quantities.get(key) ?? 0) + line.quantity;
    quantities.set(key, total);
    const combinedIssue = purchaseIssue(line.product, line.variantId, total);
    if (combinedIssue) return `${line.product.name}: ${combinedIssue}`;
  }
  return null;
}
