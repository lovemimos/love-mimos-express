import { describe, it, expect, vi, afterEach } from "vitest";
import { buildWhatsAppOrderMessage, buildWhatsAppUrl, tryOpenWhatsApp } from "./whatsapp";
import type { CartLineWithProduct } from "@/types";

function line(overrides: Partial<CartLineWithProduct> = {}): CartLineWithProduct {
  return {
    productId: "p-1",
    quantity: 1,
    product: {
      id: "p-1",
      slug: "cilios",
      name: "Cílios Volume Russo",
      shortDescription: "",
      description: "",
      price: 42.9,
      stock: 5,
      categorySlug: "cilios",
      images: [],
    },
    lineTotal: 42.9,
    ...overrides,
  };
}

describe("buildWhatsAppOrderMessage", () => {
  it("inclui nome e quantidade de cada produto", () => {
    const message = buildWhatsAppOrderMessage([line({ quantity: 2 })], 85.8);
    expect(message).toContain("2x Cílios Volume Russo");
  });

  it("inclui a variação quando existe", () => {
    const message = buildWhatsAppOrderMessage(
      [line({ variant: { id: "v-1", label: "Curvatura D" } })],
      42.9
    );
    expect(message).toContain("(Curvatura D)");
  });

  it("inclui o total formatado em reais", () => {
    const message = buildWhatsAppOrderMessage([line()], 42.9);
    expect(message).toMatch(/Total: R\$\s?42,90/);
  });

  it("inclui também o subtotal formatado em reais (task 11)", () => {
    const message = buildWhatsAppOrderMessage([line()], 42.9);
    expect(message).toMatch(/Subtotal: R\$\s?42,90/);
  });

  it("não inclui 'Cliente:' quando nenhum nome é passado", () => {
    const message = buildWhatsAppOrderMessage([line()], 42.9);
    expect(message).not.toContain("Cliente:");
  });

  it("inclui 'Cliente:' quando um nome é passado", () => {
    const message = buildWhatsAppOrderMessage([line()], 42.9, { customerName: "Ana" });
    expect(message).toContain("Cliente: Ana");
  });

  it("nome só com espaços em branco é tratado como ausente", () => {
    const message = buildWhatsAppOrderMessage([line()], 42.9, { customerName: "   " });
    expect(message).not.toContain("Cliente:");
  });

  it("não inclui 'Observação:' quando nenhuma nota é passada", () => {
    const message = buildWhatsAppOrderMessage([line()], 42.9);
    expect(message).not.toContain("Observação:");
  });

  it("inclui 'Observação:' quando uma nota é passada", () => {
    const message = buildWhatsAppOrderMessage([line()], 42.9, { note: "Entregar até sexta" });
    expect(message).toContain("Observação: Entregar até sexta");
  });

  it("mensagem com múltiplos itens lista todos", () => {
    const message = buildWhatsAppOrderMessage(
      [
        line({ productId: "p-1" }),
        line({ productId: "p-2", product: { ...line().product, name: "Cola Secagem Rápida" } }),
      ],
      85.8
    );
    expect(message).toContain("Cílios Volume Russo");
    expect(message).toContain("Cola Secagem Rápida");
  });
});

describe("buildWhatsAppUrl", () => {
  it("usa o domínio oficial wa.me", () => {
    const url = buildWhatsAppUrl("teste");
    expect(url).toMatch(/^https:\/\/wa\.me\//);
  });

  it("codifica a mensagem como query param 'text'", () => {
    const url = buildWhatsAppUrl("Olá, tudo bem?");
    expect(url).toContain("text=Ol%C3%A1%2C%20tudo%20bem%3F");
  });

  it("inclui o número da loja configurado", () => {
    const url = buildWhatsAppUrl("teste");
    expect(url).toMatch(/wa\.me\/\d+\?/);
  });

  it("gera o link exatamente no formato https://wa.me/{numero}?text=... com o número real da loja", () => {
    const url = buildWhatsAppUrl("teste");
    expect(url).toBe("https://wa.me/5531992615667?text=teste");
  });
});

describe("tryOpenWhatsApp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devolve true quando window.open tem sucesso", () => {
    vi.stubGlobal("window", { open: vi.fn(() => ({})) });
    expect(tryOpenWhatsApp("https://wa.me/123")).toBe(true);
  });

  it("devolve false quando window.open é bloqueado (retorna null)", () => {
    vi.stubGlobal("window", { open: vi.fn(() => null) });
    expect(tryOpenWhatsApp("https://wa.me/123")).toBe(false);
  });

  it("devolve false, sem lançar, quando window.open lança uma exceção", () => {
    vi.stubGlobal("window", {
      open: vi.fn(() => {
        throw new Error("blocked");
      }),
    });
    expect(() => tryOpenWhatsApp("https://wa.me/123")).not.toThrow();
    expect(tryOpenWhatsApp("https://wa.me/123")).toBe(false);
  });

  it("devolve false quando `window` não está definido (contexto de servidor)", () => {
    vi.unstubAllGlobals();
    expect(tryOpenWhatsApp("https://wa.me/123")).toBe(false);
  });
});
