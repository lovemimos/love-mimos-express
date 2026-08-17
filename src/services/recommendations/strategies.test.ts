import { describe, it, expect } from "vitest";
import { RelatedProductsStrategy } from "./strategies/related-products-strategy";
import { CompleteKitStrategy } from "./strategies/complete-kit-strategy";
import { BestSellerStrategy } from "./strategies/best-seller-strategy";
import { NewestProductsStrategy } from "./strategies/newest-products-strategy";
import { FavoriteBasedStrategy } from "./strategies/favorite-based-strategy";
import { CartBasedStrategy } from "./strategies/cart-based-strategy";
import type { Product } from "@/types";
import type { RecommendationContext } from "./types";

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

const emptyContext: RecommendationContext = { favoriteProductIds: [], cartProductIds: [] };

const catalog: Product[] = [
  product({ id: "cilios-1", name: "Cílios A", categorySlug: "cilios" }),
  product({ id: "cilios-2", name: "Cílios B", categorySlug: "cilios" }),
  product({ id: "colas-1", name: "Cola A", categorySlug: "colas", badge: "mais-vendido" }),
  product({ id: "colas-2", name: "Cola B", categorySlug: "colas", badge: "novo" }),
  product({ id: "removedor-1", name: "Removedor A", categorySlug: "removedores" }),
];

describe("RelatedProductsStrategy", () => {
  const strategy = new RelatedProductsStrategy();

  it("não é aplicável sem currentProduct", () => {
    expect(strategy.isApplicable(emptyContext)).toBe(false);
  });

  it("é aplicável com currentProduct", () => {
    expect(strategy.isApplicable({ ...emptyContext, currentProduct: catalog[0] })).toBe(true);
  });

  it("recomenda produtos da mesma categoria, excluindo o próprio produto", () => {
    const result = strategy.getRecommendations({ ...emptyContext, currentProduct: catalog[0] }, catalog, 10);
    expect(result.map((p) => p.id)).toEqual(["cilios-2"]);
  });

  it("respeita o limite", () => {
    const result = strategy.getRecommendations({ ...emptyContext, currentProduct: catalog[0] }, catalog, 0);
    expect(result).toEqual([]);
  });
});

describe("CompleteKitStrategy", () => {
  const strategy = new CompleteKitStrategy();

  it("não é aplicável sem currentProduct", () => {
    expect(strategy.isApplicable(emptyContext)).toBe(false);
  });

  it("é aplicável quando a categoria tem par complementar definido (ex.: cilios -> colas)", () => {
    expect(strategy.isApplicable({ ...emptyContext, currentProduct: catalog[0] })).toBe(true);
  });

  it("recomenda produtos das categorias complementares", () => {
    const result = strategy.getRecommendations({ ...emptyContext, currentProduct: catalog[0] }, catalog, 10);
    // cilios -> colas + acessorios (ver kit-pairings.ts)
    expect(result.map((p) => p.id).sort()).toEqual(["colas-1", "colas-2"]);
  });
});

describe("BestSellerStrategy", () => {
  const strategy = new BestSellerStrategy();

  it("sempre aplicável (fallback seguro)", () => {
    expect(strategy.isApplicable()).toBe(true);
  });

  it("retorna só produtos com badge 'mais-vendido'", () => {
    const result = strategy.getRecommendations(emptyContext, catalog, 10);
    expect(result.map((p) => p.id)).toEqual(["colas-1"]);
  });

  it("exclui produtos já favoritados/no carrinho/sendo visualizado", () => {
    const result = strategy.getRecommendations(
      { favoriteProductIds: ["colas-1"], cartProductIds: [] },
      catalog,
      10
    );
    expect(result).toEqual([]);
  });
});

describe("NewestProductsStrategy", () => {
  const strategy = new NewestProductsStrategy();

  it("sempre aplicável (fallback seguro)", () => {
    expect(strategy.isApplicable()).toBe(true);
  });

  it("retorna só produtos com badge 'novo'", () => {
    const result = strategy.getRecommendations(emptyContext, catalog, 10);
    expect(result.map((p) => p.id)).toEqual(["colas-2"]);
  });
});

describe("FavoriteBasedStrategy", () => {
  const strategy = new FavoriteBasedStrategy();

  it("não é aplicável sem favoritos", () => {
    expect(strategy.isApplicable(emptyContext)).toBe(false);
  });

  it("é aplicável com pelo menos um favorito", () => {
    expect(strategy.isApplicable({ ...emptyContext, favoriteProductIds: ["cilios-1"] })).toBe(true);
  });

  it("recomenda produtos da mesma categoria dos favoritos, excluindo o que já é favorito", () => {
    const result = strategy.getRecommendations(
      { favoriteProductIds: ["cilios-1"], cartProductIds: [] },
      catalog,
      10
    );
    expect(result.map((p) => p.id)).toEqual(["cilios-2"]);
  });
});

describe("CartBasedStrategy", () => {
  const strategy = new CartBasedStrategy();

  it("não é aplicável com carrinho vazio", () => {
    expect(strategy.isApplicable(emptyContext)).toBe(false);
  });

  it("é aplicável com item no carrinho", () => {
    expect(strategy.isApplicable({ ...emptyContext, cartProductIds: ["cilios-1"] })).toBe(true);
  });

  it("prioriza categorias complementares (ex.: cílios no carrinho -> sugere cola)", () => {
    const result = strategy.getRecommendations(
      { favoriteProductIds: [], cartProductIds: ["cilios-1"] },
      catalog,
      10
    );
    expect(result.map((p) => p.id).sort()).toEqual(["colas-1", "colas-2"]);
  });

  it("cai para mesma categoria quando não há par complementar cadastrado", () => {
    const noComplementCatalog = catalog.filter((p) => p.categorySlug !== "colas");
    const withRemover: Product[] = [
      ...noComplementCatalog,
      product({ id: "removedor-2", categorySlug: "removedores" }),
    ];
    const result = strategy.getRecommendations(
      { favoriteProductIds: [], cartProductIds: ["removedor-1"] },
      withRemover,
      10
    );
    expect(result.map((p) => p.id)).toEqual(["removedor-2"]);
  });
});
