// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";

const trackEventMock = vi.fn();
vi.mock("@/lib/analytics", () => ({ trackEvent: (...args: unknown[]) => trackEventMock(...args) }));

const useRecommendationsMock = vi.fn();
vi.mock("@/features/recommendations/hooks/useRecommendations", () => ({
  useRecommendations: (...args: unknown[]) => useRecommendationsMock(...args),
}));

import RecommendationSection from "./RecommendationSection";
import type { Product } from "@/types";
import type { RecommendationProvider } from "@/services/recommendations";

afterEach(() => {
  cleanup();
  trackEventMock.mockClear();
  useRecommendationsMock.mockClear();
});

function product(overrides: Partial<Product>): Product {
  return {
    id: overrides.id ?? "p-1",
    slug: "produto",
    name: "Produto Teste",
    shortDescription: "",
    description: "",
    price: 10,
    stock: 5,
    categorySlug: "geral",
    images: [],
    ...overrides,
  };
}

const fakeProvider = {} as RecommendationProvider;

describe("RecommendationSection", () => {
  it("não renderiza nada quando não há recomendações (estado vazio)", () => {
    useRecommendationsMock.mockReturnValue({ strategyName: "none", products: [] });
    const { container } = render(
      <RecommendationSection provider={fakeProvider} title="Recomendado" source="home" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renderiza o título e os produtos quando há recomendações", () => {
    useRecommendationsMock.mockReturnValue({
      strategyName: "best-seller",
      products: [product({ id: "1", name: "Cílios Volume Russo" })],
    });
    render(<RecommendationSection provider={fakeProvider} title="Recomendado para Você" source="home" />);

    expect(screen.getByText("Recomendado para Você")).toBeTruthy();
    expect(screen.getByText("Cílios Volume Russo")).toBeTruthy();
  });

  it("dispara recommendation_view quando há resultados", () => {
    useRecommendationsMock.mockReturnValue({
      strategyName: "cart-based",
      products: [product({ id: "1" })],
    });
    render(<RecommendationSection provider={fakeProvider} title="Complete seu Pedido" source="cart" />);

    expect(trackEventMock).toHaveBeenCalledWith({
      name: "recommendation_view",
      strategy: "cart-based",
      source: "cart",
      count: 1,
    });
  });

  it("não dispara recommendation_view quando não há resultados", () => {
    useRecommendationsMock.mockReturnValue({ strategyName: "none", products: [] });
    render(<RecommendationSection provider={fakeProvider} title="Recomendado" source="home" />);
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});
