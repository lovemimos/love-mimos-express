import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./tiny-integration-service", () => ({
  tinyIntegrationService: { getProductById: vi.fn() },
}));

import { tinyIntegrationService } from "./tiny-integration-service";
import { syncSingleTinyProduct } from "./single-product-sync";
import type { Product } from "@/types";

const getProductByIdMock = tinyIntegrationService.getProductById as unknown as ReturnType<typeof vi.fn>;

function tinyProductDetail(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    sku: `SKU-${id}`,
    descricao: `Produto ${id}`,
    situacao: "A",
    precos: { preco: 50, precoPromocional: null },
    estoque: { quantidade: 10 },
    categoria: { nome: "Cílios" },
    anexos: [{ id: 1, url: "https://exemplo.com/foto.jpg", externo: false }],
    variacoes: [],
    ...overrides,
  };
}

describe("syncSingleTinyProduct", () => {
  beforeEach(() => {
    getProductByIdMock.mockReset();
  });

  it("busca o produto diretamente por ID, sem depender do catálogo completo", async () => {
    getProductByIdMock.mockResolvedValueOnce(tinyProductDetail(123));
    await syncSingleTinyProduct("123", []);
    expect(getProductByIdMock).toHaveBeenCalledWith("123");
    expect(getProductByIdMock).toHaveBeenCalledTimes(1);
  });

  it("found: false quando a chamada à Tiny falha (rede, auth, etc.)", async () => {
    getProductByIdMock.mockRejectedValueOnce(new Error("falha de rede"));
    const report = await syncSingleTinyProduct("123", []);
    expect(report.found).toBe(false);
    expect(report.mapped).toBeUndefined();
  });

  it("found: true mas mapped ausente quando o produto existe mas está inativo na Tiny", async () => {
    getProductByIdMock.mockResolvedValueOnce(tinyProductDetail(123, { situacao: "I" }));
    const report = await syncSingleTinyProduct("123", []);
    expect(report.found).toBe(true);
    expect(report.mapped).toBeUndefined();
    expect(report.rawKeysSeen).toContain("situacao");
  });

  it("produto novo (sem correspondência no catálogo atual): mapeado, sem conflito", async () => {
    getProductByIdMock.mockResolvedValueOnce(tinyProductDetail(123));
    const report = await syncSingleTinyProduct("123", []);
    expect(report.mapped?.name).toBe("Produto 123");
    expect(report.mapped?.externalRef).toEqual({ source: "tiny", id: "123" });
    expect(report.conflict).toBeUndefined();
  });

  it("registra o ID da Tiny (externalRef) em cada variação também", async () => {
    getProductByIdMock.mockResolvedValueOnce(
      tinyProductDetail(123, {
        variacoes: [{ id: 999, descricao: "Curvatura C", precos: { preco: 55 } }],
      })
    );
    const report = await syncSingleTinyProduct("123", []);
    expect(report.mapped?.variants?.[0].externalRef).toEqual({ source: "tiny", id: "999" });
  });

  it("reporta campos ausentes (sem categoria, sem imagem, sem variação, sem SKU)", async () => {
    getProductByIdMock.mockResolvedValueOnce(
      tinyProductDetail(123, { categoria: null, anexos: [], variacoes: [], sku: null })
    );
    const report = await syncSingleTinyProduct("123", []);
    expect(report.missingFields.some((m) => m.includes("categoria"))).toBe(true);
    expect(report.missingFields.some((m) => m.includes("imagens"))).toBe(true);
    expect(report.missingFields.some((m) => m.includes("variações"))).toBe(true);
    expect(report.missingFields.some((m) => m.includes("SKU"))).toBe(true);
  });

  it("sempre reporta marca como não confirmada na Tiny (nenhum campo equivalente conhecido)", async () => {
    getProductByIdMock.mockResolvedValueOnce(tinyProductDetail(123));
    const report = await syncSingleTinyProduct("123", []);
    expect(report.missingFields.some((m) => m.includes("marca"))).toBe(true);
  });

  it("sempre reporta peso/dimensões como não confirmados na Tiny", async () => {
    getProductByIdMock.mockResolvedValueOnce(tinyProductDetail(123));
    const report = await syncSingleTinyProduct("123", []);
    expect(report.missingFields.some((m) => m.includes("peso"))).toBe(true);
  });

  it("detecta conflito quando já existe um produto com o mesmo externalRef e algum campo difere", async () => {
    const existing: Product = {
      id: "p-01",
      slug: "produto-123",
      name: "Nome Antigo (editado manualmente)",
      shortDescription: "x",
      description: "x",
      price: 40,
      stock: 10,
      categorySlug: "cilios",
      images: [],
      externalRef: { source: "tiny", id: "123" },
    };
    getProductByIdMock.mockResolvedValueOnce(tinyProductDetail(123, { descricao: "Nome Novo da Tiny" }));

    const report = await syncSingleTinyProduct("123", [existing]);
    expect(report.conflict?.matchedBy).toBe("externalRef");
    expect(report.conflict?.fieldDiffs.some((d) => d.field === "name")).toBe(true);
  });

  it("sem conflito quando o produto já existente é idêntico ao que veio da Tiny", async () => {
    getProductByIdMock.mockResolvedValueOnce(tinyProductDetail(123));
    const first = await syncSingleTinyProduct("123", []);
    const existing = { ...first.mapped!, id: "p-01" };

    getProductByIdMock.mockResolvedValueOnce(tinyProductDetail(123));
    const second = await syncSingleTinyProduct("123", [existing]);
    expect(second.conflict).toBeUndefined();
  });

  it("casa por SKU quando não há externalRef ainda no catálogo (produto cadastrado manualmente antes)", async () => {
    const existing: Product = {
      id: "p-01",
      slug: "outro-slug",
      sku: "SKU-123",
      name: "Nome Manual",
      shortDescription: "x",
      description: "x",
      price: 99,
      stock: 1,
      categorySlug: "cilios",
      images: [],
    };
    getProductByIdMock.mockResolvedValueOnce(tinyProductDetail(123));
    const report = await syncSingleTinyProduct("123", [existing]);
    expect(report.conflict?.matchedBy).toBe("sku");
  });
});
