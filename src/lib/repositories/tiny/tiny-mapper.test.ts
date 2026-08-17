import { describe, it, expect } from "vitest";
import { mapTinyProduct, mapTinyCategoryTree, type TinyProductPayload, type TinyCategoryNode } from "./tiny-mapper";

function baseProduct(overrides: Partial<TinyProductPayload> = {}): TinyProductPayload {
  return {
    id: 123,
    sku: "SKU-1",
    descricao: "Cílios Volume Russo 0.07",
    descricaoComplementar: "Descrição completa do produto.",
    situacao: "A",
    categoria: { id: 5, nome: "Cílios", caminhoCompleto: "Produtos >> Cílios" },
    precos: { preco: 42.9, precoPromocional: null },
    estoque: { quantidade: 38 },
    anexos: [{ id: 1, url: "https://cdn.tiny.com.br/img1.jpg", externo: false }],
    variacoes: [],
    seo: { slug: "cilios-volume-russo" },
    ...overrides,
  };
}

describe("mapTinyProduct", () => {
  it("mapeia um produto completo corretamente", () => {
    const result = mapTinyProduct(baseProduct());
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      id: "123",
      sku: "SKU-1",
      name: "Cílios Volume Russo 0.07",
      description: "Descrição completa do produto.",
      price: 42.9,
      stock: 38,
      categorySlug: "cilios",
      images: ["https://cdn.tiny.com.br/img1.jpg"],
    });
    expect(result?.slug).toBe("cilios-volume-russo-123");
  });

  it("produto sem imagem: retorna images como array vazio, não quebra", () => {
    const result = mapTinyProduct(baseProduct({ anexos: [] }));
    expect(result).not.toBeNull();
    expect(result?.images).toEqual([]);
  });

  it("produto sem imagem: também funciona quando 'anexos' está ausente (undefined)", () => {
    const result = mapTinyProduct(baseProduct({ anexos: undefined }));
    expect(result).not.toBeNull();
    expect(result?.images).toEqual([]);
  });

  it("produto sem estoque: quantidade null vira 0, produto continua válido", () => {
    const result = mapTinyProduct(baseProduct({ estoque: { quantidade: null } }));
    expect(result).not.toBeNull();
    expect(result?.stock).toBe(0);
  });

  it("produto sem estoque: bloco 'estoque' ausente também vira 0", () => {
    const result = mapTinyProduct(baseProduct({ estoque: undefined }));
    expect(result).not.toBeNull();
    expect(result?.stock).toBe(0);
  });

  it("produto inativo (situacao 'I') é excluído do catálogo (retorna null)", () => {
    const result = mapTinyProduct(baseProduct({ situacao: "I" }));
    expect(result).toBeNull();
  });

  it("produto excluído (situacao 'E') também é excluído do catálogo", () => {
    const result = mapTinyProduct(baseProduct({ situacao: "E" }));
    expect(result).toBeNull();
  });

  it("produto sem preço não é mapeável (retorna null em vez de quebrar a UI)", () => {
    const result = mapTinyProduct(baseProduct({ precos: { preco: null, precoPromocional: null } }));
    expect(result).toBeNull();
  });

  it("produto sem nome (descricao) não é mapeável", () => {
    const result = mapTinyProduct(baseProduct({ descricao: null }));
    expect(result).toBeNull();
  });

  it("preço promocional presente vira badge 'promocao' automaticamente", () => {
    const result = mapTinyProduct(baseProduct({ precos: { preco: 42.9, precoPromocional: 35.0 } }));
    expect(result?.badge).toBe("promocao");
    expect(result?.compareAtPrice).toBe(35.0);
  });

  it("sem preço promocional, não recebe badge", () => {
    const result = mapTinyProduct(baseProduct());
    expect(result?.badge).toBeUndefined();
  });

  it("mapeia variações com priceModifier relativo ao preço base", () => {
    const result = mapTinyProduct(
      baseProduct({
        variacoes: [
          { id: 1, descricao: "Curvatura D", precos: { preco: 45.9 } },
          { id: 2, descricao: "Curvatura C", precos: { preco: null } },
        ],
      })
    );
    expect(result?.variants).toEqual([
      { id: "1", label: "Curvatura D", priceModifier: 3.0, externalRef: { source: "tiny", id: "1" } },
      { id: "2", label: "Curvatura C", priceModifier: 0, externalRef: { source: "tiny", id: "2" } },
    ]);
  });

  it("registra o externalRef do produto (id da Tiny) para futuras atualizações", () => {
    const result = mapTinyProduct(baseProduct({ id: 42 }));
    expect(result?.externalRef).toEqual({ source: "tiny", id: "42" });
  });

  it("rating e reviewCount nunca são preenchidos (não existem na API da Tiny)", () => {
    const result = mapTinyProduct(baseProduct());
    expect(result?.rating).toBeUndefined();
    expect(result?.reviewCount).toBeUndefined();
  });

  it("usa 'geral' como categorySlug de fallback quando o produto não tem categoria", () => {
    const result = mapTinyProduct(baseProduct({ categoria: null }));
    expect(result?.categorySlug).toBe("geral");
  });

  it("Sprint 5A: tolera preço enviado como string numérica (ex.: '42.90')", () => {
    const result = mapTinyProduct(baseProduct({ precos: { preco: "42.90" as unknown as number, precoPromocional: null } }));
    expect(result).not.toBeNull();
    expect(result?.price).toBe(42.9);
  });

  it("Sprint 5A: tolera estoque enviado como string numérica", () => {
    const result = mapTinyProduct(baseProduct({ estoque: { quantidade: "38" as unknown as number } }));
    expect(result?.stock).toBe(38);
  });

  it("Sprint 5A: preço como string não-numérica (ex.: 'sob consulta') vira produto não mapeável", () => {
    const result = mapTinyProduct(
      baseProduct({ precos: { preco: "sob consulta" as unknown as number, precoPromocional: null } })
    );
    expect(result).toBeNull();
  });

  it("Sprint 5A: tolera 'situacao' com espaço/caixa diferente (' a ', 'i')", () => {
    expect(mapTinyProduct(baseProduct({ situacao: " a " as "A" }))).not.toBeNull();
    expect(mapTinyProduct(baseProduct({ situacao: "i" as "A" }))).toBeNull();
  });

  it("Sprint 5A: id do produto/variação como string numérica também funciona", () => {
    const result = mapTinyProduct(
      baseProduct({ id: "123" as unknown as number, variacoes: [{ id: "9" as unknown as number, descricao: "Único", precos: { preco: 42.9 } }] })
    );
    expect(result?.id).toBe("123");
    expect(result?.variants?.[0].id).toBe("9");
  });
});

describe("mapTinyCategoryTree", () => {
  it("achata apenas o primeiro nível (filhas do nó raiz), ignorando netos", () => {
    const root: TinyCategoryNode = {
      id: 0,
      descricao: "Raiz",
      filhas: [
        {
          id: 10,
          descricao: "Cílios",
          filhas: [{ id: 11, descricao: "Volume Russo", filhas: [] }],
        },
        { id: 20, descricao: "Colas", filhas: [] },
      ],
    };

    const result = mapTinyCategoryTree(root);
    expect(result).toEqual([
      { id: "10", name: "Cílios", slug: "cilios", icon: "Sparkles" },
      { id: "20", name: "Colas", slug: "colas", icon: "Sparkles" },
    ]);
  });
});

describe("caracteres especiais e acentuação", () => {
  it("nome com acentos, símbolos e pontuação gera slug ASCII limpo, sem quebrar", () => {
    const result = mapTinyProduct(
      baseProduct({ descricao: "Cílios & Colas – Edição Ñatal 100% Vegana!", seo: null })
    );
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("cilios-colas-edicao-natal-100-vegana-123");
    // O nome exibido na UI preserva os acentos originais — só o slug é normalizado.
    expect(result?.name).toBe("Cílios & Colas – Edição Ñatal 100% Vegana!");
  });
});
