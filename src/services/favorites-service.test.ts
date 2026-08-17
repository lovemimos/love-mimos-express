import { describe, it, expect } from "vitest";
import { resolveFavoriteProducts } from "./favorites-service";
import type { FavoriteEntry, Product } from "@/types";

function product(overrides: Partial<Product>): Product {
  return {
    id: overrides.id ?? "p-1",
    slug: overrides.slug ?? "produto",
    name: overrides.name ?? "Produto",
    shortDescription: "",
    description: "",
    price: 10,
    stock: 5,
    categorySlug: "geral",
    images: [],
    ...overrides,
  };
}

const catalog: Product[] = [
  product({ id: "p-1", name: "Cílios Volume Russo" }),
  product({ id: "p-2", name: "Cola Secagem Rápida" }),
];

describe("resolveFavoriteProducts", () => {
  it("resolve entradas de favorito contra o catálogo", () => {
    const entries: FavoriteEntry[] = [{ productId: "p-1", addedAt: "2026-01-01T00:00:00.000Z" }];
    const result = resolveFavoriteProducts(entries, catalog);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p-1");
  });

  it("produto removido do catálogo é descartado silenciosamente, não quebra", () => {
    const entries: FavoriteEntry[] = [
      { productId: "p-1", addedAt: "2026-01-01T00:00:00.000Z" },
      { productId: "produto-fantasma", addedAt: "2026-01-02T00:00:00.000Z" },
    ];
    const result = resolveFavoriteProducts(entries, catalog);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p-1");
  });

  it("ordena do mais recente para o mais antigo", () => {
    const entries: FavoriteEntry[] = [
      { productId: "p-1", addedAt: "2026-01-01T00:00:00.000Z" },
      { productId: "p-2", addedAt: "2026-01-05T00:00:00.000Z" },
    ];
    const result = resolveFavoriteProducts(entries, catalog);
    expect(result.map((p) => p.id)).toEqual(["p-2", "p-1"]);
  });

  it("lista de favoritos vazia resolve para lista vazia", () => {
    expect(resolveFavoriteProducts([], catalog)).toEqual([]);
  });
});
