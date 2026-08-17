import { describe, it, expect } from "vitest";
import { resolveCartLines, computeCartTotals, buildCart } from "./cart-service";
import type { CartLine, Product } from "@/types";

function product(overrides: Partial<Product>): Product {
  return {
    id: overrides.id ?? "p-1",
    slug: overrides.slug ?? "produto",
    name: overrides.name ?? "Produto",
    shortDescription: "",
    description: "",
    price: overrides.price ?? 10,
    stock: 5,
    categorySlug: "geral",
    images: [],
    ...overrides,
  };
}

const catalog: Product[] = [
  product({ id: "p-1", name: "Cílios Volume Russo", price: 42.9 }),
  product({
    id: "p-2",
    name: "Cílios com Variação",
    price: 30,
    variants: [
      { id: "v-c", label: "Curvatura C" },
      { id: "v-d", label: "Curvatura D", priceModifier: 5 },
    ],
  }),
];

describe("resolveCartLines", () => {
  it("resolve uma linha simples contra o catálogo", () => {
    const lines: CartLine[] = [{ productId: "p-1", quantity: 2 }];
    const resolved = resolveCartLines(lines, catalog);

    expect(resolved).toHaveLength(1);
    expect(resolved[0].product.id).toBe("p-1");
    expect(resolved[0].lineTotal).toBeCloseTo(85.8); // 42.9 * 2
  });

  it("produto removido do catálogo: a linha é descartada silenciosamente, não quebra", () => {
    const lines: CartLine[] = [
      { productId: "p-1", quantity: 1 },
      { productId: "produto-que-nao-existe-mais", quantity: 1 },
    ];
    const resolved = resolveCartLines(lines, catalog);

    expect(resolved).toHaveLength(1);
    expect(resolved[0].product.id).toBe("p-1");
  });

  it("aplica o priceModifier da variação ao preço unitário", () => {
    const lines: CartLine[] = [{ productId: "p-2", variantId: "v-d", quantity: 1 }];
    const resolved = resolveCartLines(lines, catalog);

    expect(resolved[0].lineTotal).toBe(35); // 30 + 5
  });

  it("variação sem priceModifier não altera o preço base", () => {
    const lines: CartLine[] = [{ productId: "p-2", variantId: "v-c", quantity: 2 }];
    const resolved = resolveCartLines(lines, catalog);

    expect(resolved[0].lineTotal).toBe(60); // 30 * 2
  });

  it("carrinho vazio resolve para lista vazia", () => {
    expect(resolveCartLines([], catalog)).toEqual([]);
  });
});

describe("computeCartTotals", () => {
  it("soma subtotal e quantidade total de múltiplas linhas", () => {
    const resolved = resolveCartLines(
      [
        { productId: "p-1", quantity: 2 },
        { productId: "p-2", quantity: 3 },
      ],
      catalog
    );
    const totals = computeCartTotals(resolved);

    expect(totals.subtotal).toBeCloseTo(42.9 * 2 + 30 * 3);
    expect(totals.itemCount).toBe(5);
  });

  it("carrinho vazio tem subtotal 0 e quantidade 0", () => {
    expect(computeCartTotals([])).toEqual({ subtotal: 0, itemCount: 0 });
  });
});

describe("buildCart", () => {
  it("monta o snapshot completo do carrinho a partir de linhas + catálogo", () => {
    const cart = buildCart([{ productId: "p-1", quantity: 1 }], catalog);
    expect(cart.lines).toHaveLength(1);
    expect(cart.subtotal).toBeCloseTo(42.9);
    expect(cart.itemCount).toBe(1);
  });

  it("produto inexistente no catálogo não aparece no snapshot final", () => {
    const cart = buildCart([{ productId: "id-fantasma", quantity: 2 }], catalog);
    expect(cart.lines).toEqual([]);
    expect(cart.subtotal).toBe(0);
    expect(cart.itemCount).toBe(0);
  });
});
