import { describe, it, expect } from "vitest";
import { RecommendationEngine } from "./recommendation-engine";
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

function fakeStrategy(name: string, products: Product[]): RecommendationStrategy {
  return {
    name,
    isApplicable: () => true,
    getRecommendations: () => products,
  };
}

const emptyContext: RecommendationContext = { favoriteProductIds: [], cartProductIds: [] };

describe("RecommendationEngine", () => {
  it("registra estratégias no construtor e consegue recuperá-las por nome", () => {
    const strategyA = fakeStrategy("a", [product({ id: "1" })]);
    const engine = new RecommendationEngine([strategyA]);
    expect(engine.get("a")).toBe(strategyA);
  });

  it("get() devolve undefined para um nome não registrado", () => {
    const engine = new RecommendationEngine();
    expect(engine.get("inexistente")).toBeUndefined();
  });

  it("register() adiciona uma estratégia depois da construção", () => {
    const engine = new RecommendationEngine();
    const strategyB = fakeStrategy("b", []);
    engine.register(strategyB);
    expect(engine.get("b")).toBe(strategyB);
  });

  it("list() devolve todas as estratégias registradas", () => {
    const engine = new RecommendationEngine([fakeStrategy("a", []), fakeStrategy("b", [])]);
    expect(engine.list().map((s) => s.name).sort()).toEqual(["a", "b"]);
  });

  it("run() executa a estratégia pelo nome e respeita o limite", () => {
    const products = [product({ id: "1" }), product({ id: "2" }), product({ id: "3" })];
    const engine = new RecommendationEngine([fakeStrategy("a", products)]);
    const result = engine.run("a", emptyContext, products, 2);
    expect(result).toHaveLength(2);
  });

  it("run() com nome inexistente devolve lista vazia, sem lançar erro", () => {
    const engine = new RecommendationEngine();
    expect(engine.run("nao-existe", emptyContext, [], 10)).toEqual([]);
  });
});
