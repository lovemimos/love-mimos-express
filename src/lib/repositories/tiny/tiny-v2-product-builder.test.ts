import { describe, it, expect } from "vitest";
import { mapTinyV2ProductToDomain, type TinyV2ProductPayload } from "./tiny-v2-mapper";
import { buildWritableProduct } from "./tiny-v2-product-builder";

function payload(overrides: Partial<TinyV2ProductPayload> = {}): TinyV2ProductPayload {
  return {
    id: 744931523,
    nome: "Cílios Volume Russo",
    codigo: "CIL-001",
    preco: 49.9,
    estoque: 10,
    categoria: "Cílios",
    situacao: "A",
    ...overrides,
  };
}

describe("buildWritableProduct", () => {
  it("constrói um Product completo e válido quando nome e preço existem", () => {
    const mapped = mapTinyV2ProductToDomain(payload());
    const { product, blockers } = buildWritableProduct(mapped, "744931523");
    expect(blockers).toEqual([]);
    expect(product.name).toBe("Cílios Volume Russo");
    expect(product.slug).toBe("cilios-volume-russo");
    expect(product.price).toBe(49.9);
    expect(product.categorySlug).toBe("cilios");
    expect(product.externalRef).toEqual({ source: "tiny", id: "744931523" });
  });

  it("bloqueia a construção quando não há nome", () => {
    const mapped = mapTinyV2ProductToDomain(payload({ nome: undefined }));
    const { blockers } = buildWritableProduct(mapped, "744931523");
    expect(blockers.some((b) => b.includes("Nome"))).toBe(true);
  });

  it("bloqueia a construção quando não há preço", () => {
    const mapped = mapTinyV2ProductToDomain(payload({ preco: undefined }));
    const { blockers } = buildWritableProduct(mapped, "744931523");
    expect(blockers.some((b) => b.includes("Preço"))).toBe(true);
  });

  it("usa fallback honesto para categoria ausente, sem bloquear", () => {
    const mapped = mapTinyV2ProductToDomain(payload({ categoria: undefined }));
    const { product, blockers, fallbacksUsed } = buildWritableProduct(mapped, "744931523");
    expect(blockers).toEqual([]);
    expect(product.categorySlug).toBe("geral");
    expect(fallbacksUsed.some((f) => f.includes("categorySlug"))).toBe(true);
  });

  it("usa fallback honesto para estoque ausente (0), sem bloquear", () => {
    const mapped = mapTinyV2ProductToDomain(payload({ estoque: undefined }));
    const { product, fallbacksUsed } = buildWritableProduct(mapped, "744931523");
    expect(product.stock).toBe(0);
    expect(fallbacksUsed.some((f) => f.includes("stock"))).toBe(true);
  });

  it("usa o nome como descrição quando a Tiny não retorna descrição", () => {
    const mapped = mapTinyV2ProductToDomain(payload({ descricao: undefined, descricao_complementar: undefined }));
    const { product, fallbacksUsed } = buildWritableProduct(mapped, "744931523");
    expect(product.description).toBe("Cílios Volume Russo");
    expect(fallbacksUsed.some((f) => f.includes("descrição"))).toBe(true);
  });

  it("preserva variações com o externalRef de cada uma", () => {
    const mapped = mapTinyV2ProductToDomain(
      payload({ variacoes: [{ variacao: { id: 999, nome: "Curvatura C" } }] })
    );
    const { product } = buildWritableProduct(mapped, "744931523");
    expect(product.variants?.[0]).toMatchObject({
      id: "999",
      label: "Curvatura C",
      externalRef: { source: "tiny", id: "999" },
    });
  });
});
