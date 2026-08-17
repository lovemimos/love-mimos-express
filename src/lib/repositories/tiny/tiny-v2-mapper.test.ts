import { describe, it, expect } from "vitest";
import { mapTinyV2ProductToDomain, type TinyV2ProductPayload, type FieldStatus } from "./tiny-v2-mapper";

function basePayload(overrides: Partial<TinyV2ProductPayload> = {}): TinyV2ProductPayload {
  return {
    id: 744931523,
    nome: "Cílios Volume Russo",
    codigo: "CIL-001",
    unidade: "UN",
    preco: 49.9,
    estoque: 10,
    situacao: "A",
    ...overrides,
  };
}

function statusOf(statuses: FieldStatus[], key: string): FieldStatus {
  const found = statuses.find((s) => s.key === key);
  if (!found) throw new Error(`Campo "${key}" não está em fieldStatuses`);
  return found;
}

describe("mapTinyV2ProductToDomain — os 17 campos, sempre presentes na lista de status", () => {
  it("todos os 17 campos pedidos aparecem em fieldStatuses, mapeado ou não", () => {
    const result = mapTinyV2ProductToDomain(basePayload());
    const expectedKeys = [
      "externalRef",
      "name",
      "description",
      "sku",
      "barcode",
      "price",
      "compareAtPrice",
      "stock",
      "unit",
      "categorySlug",
      "brandSlug",
      "images",
      "weight",
      "dimensions",
      "ncm",
      "situacao",
      "variants",
    ];
    const actualKeys = result.fieldStatuses.map((s) => s.key);
    for (const key of expectedKeys) expect(actualKeys).toContain(key);
  });

  it("ID externo do Tiny sempre vem 'mapped', com o id preservado", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ id: 744931523 }));
    const status = statusOf(result.fieldStatuses, "externalRef");
    expect(status.status).toBe("mapped");
    expect(status.value).toEqual({ source: "tiny", id: "744931523" });
  });
});

describe("mapTinyV2ProductToDomain — campos básicos mapeados com sucesso", () => {
  it("nome, SKU, unidade, preço e estoque", () => {
    const result = mapTinyV2ProductToDomain(basePayload());
    expect(statusOf(result.fieldStatuses, "name")).toMatchObject({ status: "mapped", value: "Cílios Volume Russo" });
    expect(statusOf(result.fieldStatuses, "sku")).toMatchObject({ status: "mapped", value: "CIL-001" });
    expect(statusOf(result.fieldStatuses, "unit")).toMatchObject({ status: "mapped", value: "UN" });
    expect(statusOf(result.fieldStatuses, "price")).toMatchObject({ status: "mapped", value: 49.9 });
    expect(statusOf(result.fieldStatuses, "stock")).toMatchObject({ status: "mapped", value: 10 });
  });

  it("GTIN mapeado quando presente; EAN como alternativa", () => {
    const withGtin = mapTinyV2ProductToDomain(basePayload({ gtin: "789" }));
    expect(statusOf(withGtin.fieldStatuses, "barcode")).toMatchObject({ status: "mapped", value: "789" });

    const withEan = mapTinyV2ProductToDomain(basePayload({ gtin: undefined, ean: "654" }));
    expect(statusOf(withEan.fieldStatuses, "barcode")).toMatchObject({ status: "mapped", value: "654" });
  });

  it("NCM mapeado quando presente", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ ncm: "96162000" }));
    expect(statusOf(result.fieldStatuses, "ncm")).toMatchObject({ status: "mapped", value: "96162000" });
  });

  it("preço promocional: o menor valor vira 'price', o maior vira 'compareAtPrice'", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ preco: 50, preco_promocional: 39.9 }));
    expect(statusOf(result.fieldStatuses, "price").value).toBe(39.9);
    expect(statusOf(result.fieldStatuses, "compareAtPrice")).toMatchObject({ status: "mapped", value: 50 });
  });
});

describe("mapTinyV2ProductToDomain — preço e estoque em formato ANINHADO (bug real corrigido)", () => {
  it("preço aninhado como { preco: X } é reconhecido", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ preco: { preco: 49.9 } }));
    expect(statusOf(result.fieldStatuses, "price")).toMatchObject({ status: "mapped", value: 49.9 });
  });

  it("preço aninhado como { venda: X } é reconhecido (nome alternativo)", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ preco: { venda: 49.9 } }));
    expect(statusOf(result.fieldStatuses, "price")).toMatchObject({ status: "mapped", value: 49.9 });
  });

  it("preço aninhado como { valor: X } é reconhecido (outro nome alternativo)", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ preco: { valor: 49.9 } }));
    expect(statusOf(result.fieldStatuses, "price")).toMatchObject({ status: "mapped", value: 49.9 });
  });

  it("preço promocional aninhado também é reconhecido, mantendo a regra do menor valor", () => {
    const result = mapTinyV2ProductToDomain(
      basePayload({ preco: { preco: 50 }, preco_promocional: { preco: 39.9 } })
    );
    expect(statusOf(result.fieldStatuses, "price").value).toBe(39.9);
    expect(statusOf(result.fieldStatuses, "compareAtPrice")).toMatchObject({ status: "mapped", value: 50 });
  });

  it("estoque aninhado como { saldo: X } é reconhecido", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ estoque: { saldo: 25 } }));
    expect(statusOf(result.fieldStatuses, "stock")).toMatchObject({ status: "mapped", value: 25 });
  });

  it("estoque aninhado como { quantidade: X } é reconhecido (mesmo padrão já confirmado na API v3)", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ estoque: { quantidade: 25 } }));
    expect(statusOf(result.fieldStatuses, "stock")).toMatchObject({ status: "mapped", value: 25 });
  });

  it("estoque aninhado como { atual: X } ou { disponivel: X } é reconhecido", () => {
    expect(
      statusOf(mapTinyV2ProductToDomain(basePayload({ estoque: { atual: 25 } })).fieldStatuses, "stock").value
    ).toBe(25);
    expect(
      statusOf(mapTinyV2ProductToDomain(basePayload({ estoque: { disponivel: 25 } })).fieldStatuses, "stock").value
    ).toBe(25);
  });

  it("continua ausente (não inventa 0) quando nem o formato plano nem o aninhado trazem um valor válido", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ preco: {}, estoque: {} }));
    expect(statusOf(result.fieldStatuses, "price").status).toBe("missing");
    expect(statusOf(result.fieldStatuses, "stock").status).toBe("missing");
  });
});

describe("mapTinyV2ProductToDomain — estoque com múltiplos depósitos (produto com esse caso específico)", () => {
  it("estoque como array de depósitos: soma o saldo de todos", () => {
    const result = mapTinyV2ProductToDomain(
      basePayload({
        estoque: [
          { deposito: "Principal", saldo: 15 },
          { deposito: "Filial", saldo: 10 },
        ],
      })
    );
    expect(statusOf(result.fieldStatuses, "stock")).toMatchObject({ status: "mapped", value: 25 });
  });

  it("estoque como array usando 'quantidade' em vez de 'saldo'", () => {
    const result = mapTinyV2ProductToDomain(
      basePayload({ estoque: [{ quantidade: 5 }, { quantidade: 3 }, { quantidade: 2 }] })
    );
    expect(statusOf(result.fieldStatuses, "stock")).toMatchObject({ status: "mapped", value: 10 });
  });

  it("estoque não veio, mas 'depositos' (campo separado no nível raiz) sim: usa como alternativa", () => {
    const result = mapTinyV2ProductToDomain(
      basePayload({ estoque: undefined, depositos: [{ saldo: 12 }, { saldo: 8 }] })
    );
    expect(statusOf(result.fieldStatuses, "stock")).toMatchObject({ status: "mapped", value: 20 });
  });

  it("array de depósitos vazio não é confundido com 'tem estoque zero real' — continua ausente", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ estoque: [] }));
    expect(statusOf(result.fieldStatuses, "stock").status).toBe("missing");
  });

  it("um depósito com saldo zero e outro com saldo real soma corretamente (não trava no primeiro zero)", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ estoque: [{ saldo: 0 }, { saldo: 7 }] }));
    expect(statusOf(result.fieldStatuses, "stock")).toMatchObject({ status: "mapped", value: 7 });
  });
});

describe("mapTinyV2ProductToDomain — campos ausentes reportados corretamente", () => {
  it("marca ausente quando não preenchida", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ marca: undefined }));
    expect(statusOf(result.fieldStatuses, "brandSlug").status).toBe("missing");
  });

  it("peso e dimensões ausentes quando nenhum campo relacionado vem preenchido", () => {
    const result = mapTinyV2ProductToDomain(basePayload());
    expect(statusOf(result.fieldStatuses, "weight").status).toBe("missing");
    expect(statusOf(result.fieldStatuses, "dimensions").status).toBe("missing");
  });

  it("peso e dimensões mapeados quando presentes", () => {
    const result = mapTinyV2ProductToDomain(
      basePayload({ peso_bruto: 0.1, altura_embalagem: 5, largura_embalagem: 8, comprimento_embalagem: 16 })
    );
    expect(statusOf(result.fieldStatuses, "weight")).toMatchObject({ status: "mapped", value: 0.1 });
    expect(statusOf(result.fieldStatuses, "dimensions")).toMatchObject({
      status: "mapped",
      value: { height: 5, width: 8, length: 16 },
    });
  });

  it("preço promocional ausente é esperado (não é um erro) quando não há promoção", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ preco_promocional: undefined }));
    const status = statusOf(result.fieldStatuses, "compareAtPrice");
    expect(status.status).toBe("missing");
    expect(status.note).toContain("esperado");
  });
});

describe("mapTinyV2ProductToDomain — categoria e status incompatíveis, sem descartar o valor bruto", () => {
  it("categoria reconhecida é mapeada sem incompatibilidade", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ categoria: "Cílios" }));
    expect(statusOf(result.fieldStatuses, "categorySlug")).toMatchObject({ status: "mapped", value: "cilios" });
  });

  it("categoria não reconhecida vira 'incompatible', preservando o valor bruto", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ categoria: "Categoria Inventada" }));
    const status = statusOf(result.fieldStatuses, "categorySlug");
    expect(status.status).toBe("incompatible");
    expect(status.rawValue).toBe("Categoria Inventada");
    expect(result.mapped.categorySlug).toBe("categoria-inventada");
  });

  it("produto inativo vira 'incompatible' no status, não 'missing'", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ situacao: "I" }));
    const status = statusOf(result.fieldStatuses, "situacao");
    expect(status.status).toBe("incompatible");
    expect(status.rawValue).toBe("I");
  });

  it("produto ativo não gera incompatibilidade", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ situacao: "A" }));
    expect(statusOf(result.fieldStatuses, "situacao").status).toBe("mapped");
  });
});

describe("mapTinyV2ProductToDomain — imagens, estoque e variações: notas de chamada complementar", () => {
  it("imagens: formato PLANO confirmado (anexos[].url, igual à v3) é reconhecido diretamente", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ anexos: [{ url: "https://tiny.com.br/a.jpg" }] }));
    expect(statusOf(result.fieldStatuses, "images")).toMatchObject({
      status: "mapped",
      value: ["https://tiny.com.br/a.jpg"],
    });
    expect(result.imagesNote).toContain("nenhuma chamada complementar necessária");
  });

  it("imagens: formato ANINHADO (anexos[].anexo.url) continua funcionando como fallback", () => {
    const result = mapTinyV2ProductToDomain(
      basePayload({ anexos: [{ anexo: { url: "https://tiny.com.br/aninhado.jpg" } }] })
    );
    expect(statusOf(result.fieldStatuses, "images").value).toEqual(["https://tiny.com.br/aninhado.jpg"]);
  });

  it("imagens: quando 'anexos' só tem IDs, a varredura completa do payload encontra imagem em outro lugar", () => {
    const result = mapTinyV2ProductToDomain(
      basePayload({ anexos: [{ anexo_id: 999 }], midia: { link: "https://outrocampo.com/foto.png" } })
    );
    const status = statusOf(result.fieldStatuses, "images");
    expect(status.status).toBe("incompatible");
    expect(result.mapped.images).toEqual(["https://outrocampo.com/foto.png"]);
    expect(result.imagesNote).toContain("outro lugar do JSON");
  });

  it("imagens: quando 'anexos' só tem IDs e a varredura não encontra nada, pede a chamada complementar real (GET /produtos/{id}/anexos)", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ anexos: [{ anexo_id: 999 }] }));
    expect(result.imagesNote).toContain("GET /produtos/{id}/anexos");
  });

  it("imagens: ausente quando não há nenhum anexo", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ anexos: undefined }));
    expect(statusOf(result.fieldStatuses, "images").status).toBe("missing");
  });

  it("imagens: avisa sobre chamada complementar quando anexos não têm URL utilizável", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ anexos: [{ anexo: {} }] }));
    expect(statusOf(result.fieldStatuses, "images").status).toBe("incompatible");
    expect(result.imagesNote).toContain("GET /produtos/{id}/anexos");
  });

  it("estoque: avisa sobre múltiplos depósitos quando o payload sinaliza isso", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ depositos: [{}, {}] }));
    expect(result.stockNote).toContain("depósito");
    expect(result.stockNote).toContain("somado");
  });

  it("estoque: nota mais confiante quando não há sinal de múltiplos depósitos", () => {
    const result = mapTinyV2ProductToDomain(basePayload());
    expect(result.stockNote).toContain("provavelmente é confiável");
  });

  it("variações: preserva o id da Tiny em cada uma quando nome/grade vem legível", () => {
    const result = mapTinyV2ProductToDomain(
      basePayload({ variacoes: [{ variacao: { id: 999, nome: "Curvatura C" } }] })
    );
    const status = statusOf(result.fieldStatuses, "variants");
    expect(status.status).toBe("mapped");
    const variants = status.value as { id: string; label: string; externalRef: unknown }[];
    expect(variants[0]).toEqual({ id: "999", label: "Curvatura C", externalRef: { source: "tiny", id: "999" } });
    expect(result.variantsNote).toContain("id da Tiny preservado");
  });

  it("variações: avisa sobre chamada complementar quando não há nome/grade legível", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ variacoes: [{ variacao: { id: 999 } }] }));
    expect(statusOf(result.fieldStatuses, "variants").status).toBe("incompatible");
    expect(result.variantsNote).toContain("chamada complementar");
  });

  it("variações: ausente quando não há nenhuma no payload, com nota sobre produtos filhos", () => {
    const result = mapTinyV2ProductToDomain(basePayload({ variacoes: undefined }));
    expect(statusOf(result.fieldStatuses, "variants").status).toBe("missing");
    expect(result.variantsNote).toContain("produtos filhos");
  });
});
