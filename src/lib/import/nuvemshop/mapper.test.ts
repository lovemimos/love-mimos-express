import { describe, it, expect } from "vitest";
import { mapNuvemshopGroup } from "./mapper";
import { publishedCiliosRow, row, group } from "./test-fixtures";

describe("mapNuvemshopGroup — marca, código de barras e tags", () => {
  it("Marca vira brandSlug (slugificado), não um atributo genérico", () => {
    const result = mapNuvemshopGroup(group([publishedCiliosRow({ Marca: "Maria Sasha" })]));
    if (result.kind === "mapped") {
      expect(result.product.brandSlug).toBe("maria-sasha");
      expect(result.product.attributes?.marca).toBeUndefined();
    }
  });

  it("sem Marca preenchida, brandSlug fica indefinido", () => {
    const result = mapNuvemshopGroup(group([publishedCiliosRow({ Marca: "" })]));
    if (result.kind === "mapped") expect(result.product.brandSlug).toBeUndefined();
  });

  it("Código de barras vira barcode", () => {
    const result = mapNuvemshopGroup(group([publishedCiliosRow({ "Código de barras": "7898757770184" })]));
    if (result.kind === "mapped") expect(result.product.barcode).toBe("7898757770184");
  });

  it("Tags vira um array, separado por vírgula e sem espaços extras", () => {
    const result = mapNuvemshopGroup(group([publishedCiliosRow({ Tags: "cilios, volume russo ,  premium" })]));
    if (result.kind === "mapped") expect(result.product.tags).toEqual(["cilios", "volume russo", "premium"]);
  });
});

describe("mapNuvemshopGroup — cor: produto único vs. multi-variante (bug real corrigido)", () => {
  it("produto de UMA cor só: o valor vai para attributes.cor do produto", () => {
    const result = mapNuvemshopGroup(
      group([publishedCiliosRow({ "Nome da variação 1": "Cor", "Valor da variação 1": "Preto" })])
    );
    if (result.kind === "mapped") {
      expect(result.product.attributes?.cor).toBe("Preto");
    }
  });

  it("produto com VÁRIAS cores reais: cada variante carrega seu próprio attributes.cor, nada é perdido", () => {
    const rows = [
      publishedCiliosRow({
        "Identificador URL": "cola-colorida",
        "Nome da variação 1": "Cor",
        "Valor da variação 1": "Preto",
      }),
      row({
        "Identificador URL": "cola-colorida",
        "Nome da variação 1": "Cor",
        "Valor da variação 1": "Azul",
        Preço: "50.00",
        "Exibir na loja": "SIM",
        Visibilidade: "Visível",
      }),
    ];
    const result = mapNuvemshopGroup(group(rows));
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") {
      // Antes da correção, isso era apagado do produto E nunca escrito
      // na variante — a cor simplesmente desaparecia.
      expect(result.product.attributes?.cor).toBeUndefined();
      expect(result.product.variants?.map((v) => v.attributes?.cor)).toEqual(["Preto", "Azul"]);
    }
  });
});

describe("mapNuvemshopGroup — regras de escopo", () => {
  it("ignora produto não publicado (Exibir na loja != SIM)", () => {
    const result = mapNuvemshopGroup(group([publishedCiliosRow({ "Exibir na loja": "NÃO" })]));
    expect(result.kind).toBe("ignored");
    if (result.kind === "ignored") expect(result.reason).toMatch(/não publicado/i);
  });

  it("ignora produto não visível (Visibilidade != Visível)", () => {
    const result = mapNuvemshopGroup(group([publishedCiliosRow({ Visibilidade: "Oculto" })]));
    expect(result.kind).toBe("ignored");
  });

  it("ignora produto de categoria fora do escopo (NAIL DESIGNER)", () => {
    const result = mapNuvemshopGroup(
      group([publishedCiliosRow({ Categorias: "NAIL DESIGNER > Esmaltes" })])
    );
    expect(result.kind).toBe("ignored");
    if (result.kind === "ignored") expect(result.reason).toMatch(/fora do escopo/i);
  });

  it("ignora produto de subcategoria sem mapeamento", () => {
    const result = mapNuvemshopGroup(
      group([publishedCiliosRow({ Categorias: "Extensão de Cílios > Subcategoria Inexistente" })])
    );
    expect(result.kind).toBe("ignored");
    if (result.kind === "ignored") expect(result.reason).toMatch(/subcategoria/i);
  });

  it("erro quando não há nenhuma variação com preço válido", () => {
    const result = mapNuvemshopGroup(group([publishedCiliosRow({ Preço: "" })]));
    expect(result.kind).toBe("error");
  });

  it("erro quando o produto não tem nome", () => {
    const result = mapNuvemshopGroup(group([publishedCiliosRow({ Nome: "" })]));
    expect(result.kind).toBe("error");
  });
});

describe("mapNuvemshopGroup — mapeamento de campos", () => {
  it("mapeia nome, preço e categoria corretamente", () => {
    const result = mapNuvemshopGroup(
      group([publishedCiliosRow({ Nome: "Cílios Volume Russo", Preço: "42.90" })])
    );
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") {
      expect(result.product.name).toBe("Cílios Volume Russo");
      expect(result.product.price).toBe(42.9);
      expect(result.product.categorySlug).toBe("cilios");
    }
  });

  it("sanitiza HTML da Descrição", () => {
    const result = mapNuvemshopGroup(
      group([publishedCiliosRow({ Descrição: "<p>Cílios &oacute;timos</p>" })])
    );
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") {
      expect(result.product.description).toBe("Cílios ótimos");
      expect(result.product.description).not.toContain("<p>");
    }
  });

  it("preço promocional vira price (o que a cliente paga) + compareAtPrice (o preço riscado) + badge 'promocao'", () => {
    const result = mapNuvemshopGroup(
      group([publishedCiliosRow({ Preço: "50.00", "Preço promocional": "39.90" })])
    );
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") {
      expect(result.product.price).toBe(39.9);
      expect(result.product.compareAtPrice).toBe(50);
      expect(result.product.badge).toBe("promocao");
    }
  });

  it("sem preço promocional, não define badge", () => {
    const result = mapNuvemshopGroup(group([publishedCiliosRow()]));
    if (result.kind === "mapped") expect(result.product.badge).toBeUndefined();
  });
});

describe("mapNuvemshopGroup — identificador (SKU ou fallback)", () => {
  it("usa o SKU como identificador quando presente", () => {
    const result = mapNuvemshopGroup(group([publishedCiliosRow({ SKU: "ABC123" })]));
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") {
      expect(result.product.identifier).toBe("ABC123");
      expect(result.product.identifierSource).toBe("sku");
      expect(result.product.sku).toBe("ABC123");
    }
  });

  it("usa Identificador URL como fallback quando não há SKU nem variação", () => {
    const result = mapNuvemshopGroup(
      group([publishedCiliosRow({ "Identificador URL": "produto-sem-sku", SKU: "" })])
    );
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") {
      expect(result.product.identifier).toBe("produto-sem-sku");
      expect(result.product.identifierSource).toBe("identifier-url+variant");
    }
  });

  it("usa Identificador URL + valor da variação como fallback quando há variação sem SKU", () => {
    const rows = [
      publishedCiliosRow({
        "Identificador URL": "cilios-mix",
        "Nome da variação 1": "Tamanho",
        "Valor da variação 1": "Mix 8-12",
        SKU: "",
      }),
    ];
    const result = mapNuvemshopGroup(group(rows));
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") {
      expect(result.product.variants?.[0].identifier).toBe("cilios-mix:Mix 8-12");
      expect(result.product.variants?.[0].identifierSource).toBe("identifier-url+variant");
    }
  });
});

describe("mapNuvemshopGroup — variações e agregação", () => {
  it("produto de uma linha só (sem valor de variação) não tem array de variants", () => {
    const result = mapNuvemshopGroup(group([publishedCiliosRow()]));
    if (result.kind === "mapped") expect(result.product.variants).toBeUndefined();
  });

  it("produto com múltiplas linhas de variação gera um variant por linha", () => {
    const rows = [
      publishedCiliosRow({
        "Identificador URL": "cilios-6d",
        "Nome da variação 1": "Tamanho",
        "Valor da variação 1": "8mm",
        Estoque: "3",
      }),
      row({
        "Identificador URL": "cilios-6d",
        "Nome da variação 1": "Tamanho",
        "Valor da variação 1": "9mm",
        Preço: "43.90",
        Estoque: "2",
        "Exibir na loja": "SIM",
        Visibilidade: "Visível",
      }),
    ];
    const result = mapNuvemshopGroup(group(rows));
    expect(result.kind).toBe("mapped");
    if (result.kind === "mapped") {
      expect(result.product.variants).toHaveLength(2);
      expect(result.product.variants?.map((v) => v.label)).toEqual([
        "Tamanho: 8mm",
        "Tamanho: 9mm",
      ]);
    }
  });

  it("o preço base do produto é o menor preço entre as variações", () => {
    const rows = [
      publishedCiliosRow({ "Identificador URL": "p", "Valor da variação 1": "A", Preço: "60.00" }),
      row({
        "Identificador URL": "p",
        "Valor da variação 1": "B",
        Preço: "50.00",
        "Exibir na loja": "SIM",
        Visibilidade: "Visível",
      }),
    ];
    const result = mapNuvemshopGroup(group(rows));
    if (result.kind === "mapped") {
      expect(result.product.price).toBe(50);
      const expensive = result.product.variants?.find((v) => v.label.includes("A"));
      expect(expensive?.priceModifier).toBe(10);
    }
  });

  it("o estoque do produto é a soma do estoque de todas as variações", () => {
    const rows = [
      publishedCiliosRow({ "Identificador URL": "p", "Valor da variação 1": "A", Estoque: "3" }),
      row({
        "Identificador URL": "p",
        "Valor da variação 1": "B",
        Preço: "50.00",
        Estoque: "5",
        "Exibir na loja": "SIM",
        Visibilidade: "Visível",
      }),
    ];
    const result = mapNuvemshopGroup(group(rows));
    if (result.kind === "mapped") expect(result.product.stock).toBe(8);
  });

  it("nunca define images (nenhuma URL de imagem existe na planilha real)", () => {
    const result = mapNuvemshopGroup(group([publishedCiliosRow()]));
    if (result.kind === "mapped") expect(result.product.images).toEqual([]);
  });
});
