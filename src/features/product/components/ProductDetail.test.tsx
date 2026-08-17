// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import ProductDetail from "./ProductDetail";
import { useCartStore } from "@/features/cart/store/cart-store";
import type { Product } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/features/recommendations/components/RecommendationSection", () => ({
  default: () => null,
}));
vi.mock("@/services/recommendations", () => ({
  productRecommendationProvider: {},
}));

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p-1",
    slug: "cilios-teste",
    name: "Cílios de Teste",
    shortDescription: "Descrição curta",
    description: "Descrição completa",
    price: 42.9,
    stock: 10,
    categorySlug: "cilios",
    images: [],
    ...overrides,
  };
}

describe("ProductDetail — bloqueio de produto esgotado (bug crítico corrigido na Sprint 12)", () => {
  afterEach(() => {
    cleanup();
    useCartStore.setState({ lines: [] });
  });

  it("desabilita 'Adicionar ao carrinho' e 'Comprar agora' quando stock é 0", () => {
    render(<ProductDetail product={product({ stock: 0 })} />);

    expect(screen.getByText("Produto esgotado")).toBeTruthy();
    const addButton = screen.getByText("Adicionar ao carrinho").closest("button") as HTMLButtonElement;
    const buyButton = screen.getByText("Esgotado").closest("button") as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
    expect(buyButton.disabled).toBe(true);
  });

  it("mantém os botões habilitados quando há estoque", () => {
    render(<ProductDetail product={product({ stock: 5 })} />);

    const addButton = screen.getByText("Adicionar ao carrinho").closest("button") as HTMLButtonElement;
    const buyButton = screen.getByText("Comprar agora").closest("button") as HTMLButtonElement;
    expect(addButton.disabled).toBe(false);
    expect(buyButton.disabled).toBe(false);
    expect(screen.queryByText("Produto esgotado")).toBeNull();
  });

  it("clicar em 'Adicionar ao carrinho' não adiciona nada quando o produto está esgotado (defesa em profundidade)", () => {
    render(<ProductDetail product={product({ id: "p-esgotado", stock: 0 })} />);

    const addButton = screen.getByText("Adicionar ao carrinho").closest("button") as HTMLButtonElement;
    addButton.click(); // mesmo clicando à força num botão "disabled" via DOM

    expect(useCartStore.getState().lines).toEqual([]);
  });

  it("clicar em 'Adicionar ao carrinho' funciona normalmente quando há estoque", () => {
    render(<ProductDetail product={product({ id: "p-disponivel", stock: 5 })} />);

    const addButton = screen.getByText("Adicionar ao carrinho").closest("button") as HTMLButtonElement;
    addButton.click();

    expect(useCartStore.getState().lines).toEqual([
      { productId: "p-disponivel", variantId: undefined, quantity: 1 },
    ]);
  });
});

describe("ProductDetail — produto com imagens externas reais (bug de renderização corrigido)", () => {
  afterEach(() => {
    cleanup();
    useCartStore.setState({ lines: [] });
  });

  it("renderiza a foto real da galeria (não o placeholder) quando o produto tem images", () => {
    render(
      <ProductDetail
        product={product({
          name: "Cílios com Foto Real",
          images: ["https://tiny.com.br/anexos/produto-744931523.jpg"],
        })}
      />
    );
    expect(screen.getByAltText(/Cílios com Foto Real/)).toBeTruthy();
  });

  it("não renderiza nenhuma <img> quando o produto realmente não tem imagem (placeholder correto)", () => {
    render(<ProductDetail product={product({ images: [] })} />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});

describe("ProductDetail — descrição com HTML é sanitizada e formatada, não exibida como texto bruto", () => {
  afterEach(() => {
    cleanup();
    useCartStore.setState({ lines: [] });
  });

  it("renderiza tags de formatação permitidas de verdade (não como texto literal com <>)", () => {
    const { container } = render(
      <ProductDetail
        product={product({ description: "<p>Fórmula <strong>vegana</strong> e cruelty-free</p>" })}
      />
    );
    // Se estivesse "bruto" (texto), o DOM teria o literal "<p>" como
    // caractere — aqui, checamos que existe um <strong> real no DOM.
    const strongEl = container.querySelector("strong");
    expect(strongEl?.textContent).toBe("vegana");
    expect(container.textContent).not.toContain("<p>");
    expect(container.textContent).not.toContain("<strong>");
  });

  it("remove <script> da descrição em vez de renderizar (segurança)", () => {
    const { container } = render(
      <ProductDetail product={product({ description: '<p>Texto</p><script>alert("x")</script>' })} />
    );
    expect(container.querySelector("script")).toBeNull();
  });

  it("descrição sem nenhum HTML continua sendo exibida normalmente, como texto simples", () => {
    render(<ProductDetail product={product({ description: "Descrição simples sem tags" })} />);
    expect(screen.getByText("Descrição simples sem tags")).toBeTruthy();
  });
});
