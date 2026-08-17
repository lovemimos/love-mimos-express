import { describe, it, expect } from "vitest";
import { RecommendationEngine } from "./recommendation-engine";
import { RecommendationProvider } from "./recommendation-provider";
import type { RecommendationContext, RecommendationStrategy } from "./types";
import type { Product } from "@/types";

function product(overrides: Partial<Product>): Product {
  return {
    id: overrides.id ?? "p-1",
    slug: "produto",
    name: "Produto",
    shortDescription: "",
    description: "",
    price: 10,
    stock: 5,
    categorySlug: "geral",
    images: [],
    ...overrides,
  };
}

function fakeStrategy(
  name: string,
  applicable: boolean,
  products: Product[]
): RecommendationStrategy {
  return {
    name,
    isApplicable: () => applicable,
    getRecommendations: () => products,
  };
}

const emptyContext: RecommendationContext = { favoriteProductIds: [], cartProductIds: [] };

describe("RecommendationProvider", () => {
  it("seleciona a primeira estratégia aplicável da lista de prioridade", () => {
    const engine = new RecommendationEngine([
      fakeStrategy("primeira", false, [product({ id: "1" })]),
      fakeStrategy("segunda", true, [product({ id: "2" })]),
    ]);
    const provider = new RecommendationProvider(engine, ["primeira", "segunda"]);

    const result = provider.resolve(emptyContext, [], 10);
    expect(result.strategyName).toBe("segunda");
    expect(result.products.map((p) => p.id)).toEqual(["2"]);
  });

  it("pula estratégias aplicáveis que não produzem nenhum resultado", () => {
    const engine = new RecommendationEngine([
      fakeStrategy("vazia-mas-aplicavel", true, []),
      fakeStrategy("com-resultado", true, [product({ id: "1" })]),
    ]);
    const provider = new RecommendationProvider(engine, ["vazia-mas-aplicavel", "com-resultado"]);

    const result = provider.resolve(emptyContext, [], 10);
    expect(result.strategyName).toBe("com-resultado");
  });

  it("devolve strategyName 'none' e lista vazia quando nenhuma estratégia se aplica", () => {
    const engine = new RecommendationEngine([fakeStrategy("a", false, [product({ id: "1" })])]);
    const provider = new RecommendationProvider(engine, ["a"]);

    const result = provider.resolve(emptyContext, [], 10);
    expect(result).toEqual({ strategyName: "none", products: [] });
  });

  it("ignora nomes de estratégia não registrados na prioridade, sem lançar erro", () => {
    const engine = new RecommendationEngine([fakeStrategy("real", true, [product({ id: "1" })])]);
    const provider = new RecommendationProvider(engine, ["fantasma", "real"]);

    const result = provider.resolve(emptyContext, [], 10);
    expect(result.strategyName).toBe("real");
  });

  it("respeita o limite passado", () => {
    const products = [product({ id: "1" }), product({ id: "2" }), product({ id: "3" })];
    const engine = new RecommendationEngine([fakeStrategy("a", true, products)]);
    const provider = new RecommendationProvider(engine, ["a"]);

    const result = provider.resolve(emptyContext, [], 2);
    expect(result.products).toHaveLength(2);
  });
});
