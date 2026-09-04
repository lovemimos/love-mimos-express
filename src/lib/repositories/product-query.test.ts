import { describe, it, expect } from "vitest";
import { applyProductQuery, normalizeProductQuery } from "./product-query";
import type { Product } from "@/types";
import { normalizeSearchText } from "@/utils/normalize-text";

function product(overrides: Partial<Product>): Product {
  return {
    id: overrides.id ?? "1",
    slug: overrides.slug ?? "produto",
    name: overrides.name ?? "Produto",
    shortDescription: overrides.shortDescription ?? "",
    description: overrides.description ?? "",
    price: overrides.price ?? 10,
    stock: overrides.stock ?? 5,
    categorySlug: overrides.categorySlug ?? "geral",
    images: overrides.images ?? [],
    ...overrides,
  };
}

const catalog: Product[] = [
  product({
    id: "1",
    slug: "cilios-marrom-fio-a-fio",
    name: "Cílios Marrom Fio a Fio",
    shortDescription: "Efeito natural em tom marrom",
    categorySlug: "cilios",
    price: 30,
    sku: "CIL-MAR-01",
  }),
  product({
    id: "2",
    slug: "cilios-volume-russo",
    name: "Cílios Volume Russo 0.07",
    shortDescription: "Fios ultra leves",
    categorySlug: "cilios",
    price: 42.9,
  }),
  product({
    id: "3",
    slug: "cola-secagem-rapida",
    name: "Cola Secagem Rápida",
    shortDescription: "Alta fixação",
    categorySlug: "colas",
    price: 38,
    badge: "mais-vendido",
  }),
  product({
    id: "4",
    slug: "removedor-gel",
    name: "Removedor em Gel",
    shortDescription: "Remoção segura",
    categorySlug: "removedores",
    price: 33.5,
    stock: 0,
  }),
];

describe("applyProductQuery — catálogo facetado: brandSlug, tags, attributes (produto e variante)", () => {
  it("filtra por brandSlug", () => {
    const items = [
      product({ id: "1", brandSlug: "maria-sasha" }),
      product({ id: "2", brandSlug: "fadvan" }),
    ];
    const result = applyProductQuery(items, { brandSlug: "maria-sasha", pageSize: 10 });
    expect(result.items.map((p) => p.id)).toEqual(["1"]);
  });

  it("filtra por tags (produto casa se tiver QUALQUER uma das tags pedidas)", () => {
    const items = [
      product({ id: "1", tags: ["premium", "volume-russo"] }),
      product({ id: "2", tags: ["basico"] }),
      product({ id: "3", tags: undefined }),
    ];
    const result = applyProductQuery(items, { tags: ["premium"], pageSize: 10 });
    expect(result.items.map((p) => p.id)).toEqual(["1"]);
  });

  it("filtra por atributo no nível do PRODUTO", () => {
    const items = [
      product({ id: "1", attributes: { cor: "Preto" } }),
      product({ id: "2", attributes: { cor: "Azul" } }),
    ];
    const result = applyProductQuery(items, { attributes: { cor: ["Preto"] }, pageSize: 10 });
    expect(result.items.map((p) => p.id)).toEqual(["1"]);
  });

  it("filtra por atributo no nível da VARIANTE — produto multi-cor deve aparecer mesmo sem attributes no produto", () => {
    const items = [
      product({
        id: "1",
        attributes: undefined,
        variants: [
          { id: "v1", label: "Preto", attributes: { cor: "Preto" } },
          { id: "v2", label: "Azul", attributes: { cor: "Azul" } },
        ],
      }),
      product({ id: "2", attributes: { cor: "Vermelho" } }),
    ];
    const result = applyProductQuery(items, { attributes: { cor: ["Azul"] }, pageSize: 10 });
    expect(result.items.map((p) => p.id)).toEqual(["1"]);
  });

  it("faceta com múltiplos valores selecionados usa OR dentro da faceta", () => {
    const items = [
      product({ id: "1", attributes: { cor: "Preto" } }),
      product({ id: "2", attributes: { cor: "Azul" } }),
      product({ id: "3", attributes: { cor: "Verde" } }),
    ];
    const result = applyProductQuery(items, { attributes: { cor: ["Preto", "Azul"] }, pageSize: 10 });
    expect(result.items.map((p) => p.id).sort()).toEqual(["1", "2"]);
  });

  it("duas facetas diferentes usam AND entre si", () => {
    const items = [
      product({ id: "1", attributes: { cor: "Preto", material: "Seda" } }),
      product({ id: "2", attributes: { cor: "Preto", material: "Sintético" } }),
    ];
    const result = applyProductQuery(items, {
      attributes: { cor: ["Preto"], material: ["Seda"] },
      pageSize: 10,
    });
    expect(result.items.map((p) => p.id)).toEqual(["1"]);
  });
});

describe("applyProductQuery — busca textual", () => {
  it("busca sem acento encontra produto com acento no nome", () => {
    const result = applyProductQuery(catalog, { search: "cilios" });
    expect(result.items.map((p) => p.id)).toEqual(expect.arrayContaining(["1", "2"]));
  });

  it("busca ignora acento também no termo digitado", () => {
    const result = applyProductQuery(catalog, { search: "cílios" });
    expect(result.items.map((p) => p.id)).toEqual(expect.arrayContaining(["1", "2"]));
  });

  it('"cilios marrom" encontra "Cílios Marrom Fio a Fio" (múltiplas palavras, ordem/acentos ignorados)', () => {
    const result = applyProductQuery(catalog, { search: "cilios marrom" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("1");
  });

  it("busca parcial: 'volu' encontra 'Volume Russo'", () => {
    const result = applyProductQuery(catalog, { search: "volu" });
    expect(result.items.map((p) => p.id)).toContain("2");
  });

  it("exige que TODAS as palavras do termo combinem em algum lugar (semântica E)", () => {
    // "marrom" só existe no produto 1; "gel" só no produto 4 — nenhum
    // produto tem os dois, então a combinação não deve retornar nada.
    const result = applyProductQuery(catalog, { search: "marrom gel" });
    expect(result.items).toHaveLength(0);
  });

  it("consulta sem resultado retorna lista vazia e total 0, sem lançar erro", () => {
    const result = applyProductQuery(catalog, { search: "produto-que-nao-existe-xyz" });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("não usa SKU isolado como atalho de busca comercial", () => {
    const result = applyProductQuery(catalog, { search: "CIL-MAR-01" });
    expect(result.items).toHaveLength(0);
  });

  it.each(["cola", "cílios", "removedor"])("busca comercial %s retorna somente conteúdo relevante", (term) => {
    const result = applyProductQuery(catalog, { search: term, pageSize: 20 });
    expect(result.items.length).toBeGreaterThan(0);
    for (const item of result.items) {
      expect(normalizeSearchText(`${item.name} ${item.brandName ?? ""} ${item.categorySlug} ${item.shortDescription} ${item.description}`)).toContain(normalizeSearchText(term));
    }
  });
});

describe("applyProductQuery — combinação de busca e categoria", () => {
  it("busca + categoria juntas restringem a interseção, não a união", () => {
    const result = applyProductQuery(catalog, { search: "cilios", categorySlug: "cilios" });
    expect(result.items.map((p) => p.id).sort()).toEqual(["1", "2"]);
  });

  it("categoria sem correspondência na busca retorna vazio", () => {
    const result = applyProductQuery(catalog, { search: "cilios", categorySlug: "colas" });
    expect(result.items).toHaveLength(0);
  });

  it("categoria inexistente retorna vazio, sem lançar erro (fallback seguro)", () => {
    const result = applyProductQuery(catalog, { categorySlug: "categoria-que-nao-existe" });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("applyProductQuery — ordenação", () => {
  it("ordena por menor preço", () => {
    const result = applyProductQuery(catalog, { sort: "menor-preco", pageSize: 10 });
    const prices = result.items.map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("ordena por maior preço", () => {
    const result = applyProductQuery(catalog, { sort: "maior-preco", pageSize: 10 });
    const prices = result.items.map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  it("ordena por nome de A a Z", () => {
    const result = applyProductQuery(catalog, { sort: "nome-asc", pageSize: 10 });
    const names = result.items.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
  });

  it("relevância, com termo de busca, prioriza correspondência no início do nome", () => {
    const result = applyProductQuery(catalog, { search: "cilios", sort: "relevancia" });
    // "Cílios Marrom..." e "Cílios Volume..." começam com "Cílios" — ambos
    // pontuam alto; nenhum outro produto do catálogo começa com "cilios".
    expect(result.items[0].name.toLowerCase()).toMatch(/^c[ií]lios/);
  });
});

describe("applyProductQuery — paginação", () => {
  it("respeita pageSize e retorna hasMore corretamente", () => {
    const page1 = applyProductQuery(catalog, { pageSize: 2, page: 1 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(4);
    expect(page1.hasMore).toBe(true);

    const page2 = applyProductQuery(catalog, { pageSize: 2, page: 2 });
    expect(page2.items).toHaveLength(2);
    expect(page2.hasMore).toBe(false);
  });

  it("páginas 1 e 2 não se sobrepõem", () => {
    const page1 = applyProductQuery(catalog, { pageSize: 2, page: 1 });
    const page2 = applyProductQuery(catalog, { pageSize: 2, page: 2 });
    const ids1 = page1.items.map((p) => p.id);
    const ids2 = page2.items.map((p) => p.id);
    expect(ids1.some((id) => ids2.includes(id))).toBe(false);
  });

  it("página além do total retorna lista vazia, não erro", () => {
    const result = applyProductQuery(catalog, { pageSize: 2, page: 99 });
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });
});

describe("applyProductQuery — filtros adicionais", () => {
  it("onlyAvailable exclui produtos sem estoque", () => {
    const result = applyProductQuery(catalog, { onlyAvailable: true, pageSize: 10 });
    expect(result.items.every((p) => p.stock > 0)).toBe(true);
    expect(result.items.map((p) => p.id)).not.toContain("4");
  });

  it("combina departamento, categoria, tipo, preço e disponibilidade com AND", () => {
    const item = product({ id: "and", departmentSlug: "lash-designer", categorySlug: "cilios", productType: "com-variacoes", price: 0, stock: 1, variants: [{ id: "v", label: "11mm", priceModifier: 35, stock: 1 }] });
    const result = applyProductQuery([item, ...catalog], { departmentSlug: "lash-designer", categorySlug: "cilios", productType: "com-variacoes", availability: "available", priceMin: 30, priceMax: 40, pageSize: 10 });
    expect(result.items.map((product) => product.id)).toEqual(["and"]);
  });

  it("availability=sold-out retorna apenas esgotados", () => {
    const result = applyProductQuery(catalog, { availability: "sold-out", pageSize: 10 });
    expect(result.items.map((item) => item.id)).toEqual(["4"]);
  });

  it("featuredOnly retorna só produtos com badge", () => {
    const result = applyProductQuery(catalog, { featuredOnly: true, pageSize: 10 });
    expect(result.items.map((p) => p.id)).toEqual(["3"]);
  });

  it("Sprint 9: badge específico filtra só por aquele tipo de badge (ex.: Mais Vendidos vs. Novidades)", () => {
    const bestSellers = applyProductQuery(catalog, { badge: "mais-vendido", pageSize: 10 });
    expect(bestSellers.items.map((p) => p.id)).toEqual(["3"]);

    const newArrivals = applyProductQuery(catalog, { badge: "novo", pageSize: 10 });
    expect(newArrivals.items).toEqual([]); // nenhum produto do catálogo de teste tem badge "novo"
  });
});

describe("normalizeProductQuery — parâmetros inválidos têm fallback seguro", () => {
  it("ordem desconhecida cai para 'relevancia'", () => {
    // @ts-expect-error propositalmente um valor inválido, simulando um parâmetro de URL malformado
    expect(normalizeProductQuery({ sort: "ordem-que-nao-existe" }).sort).toBe("relevancia");
  });

  it("página negativa ou zero cai para 1", () => {
    expect(normalizeProductQuery({ page: -5 }).page).toBe(1);
    expect(normalizeProductQuery({ page: 0 }).page).toBe(1);
  });

  it("página não numérica cai para 1", () => {
    // @ts-expect-error simulando um parâmetro de URL malformado (ex.: ?pagina=abc)
    expect(normalizeProductQuery({ page: "abc" }).page).toBe(1);
  });

  it("limite acima do permitido é reduzido ao máximo", () => {
    expect(normalizeProductQuery({ pageSize: 99999 }).pageSize).toBeLessThanOrEqual(100);
  });

  it("limite zero ou negativo cai para o padrão", () => {
    expect(normalizeProductQuery({ pageSize: 0 }).pageSize).toBeGreaterThan(0);
    expect(normalizeProductQuery({ pageSize: -10 }).pageSize).toBeGreaterThan(0);
  });

  it("aplicar a query com parâmetros inválidos nunca lança erro", () => {
    expect(() =>
      applyProductQuery(catalog, {
        // @ts-expect-error simulando parâmetros de URL malformados de ponta a ponta
        sort: "invalido",
        page: -1,
        pageSize: 999999,
        categorySlug: "categoria-inexistente",
      })
    ).not.toThrow();
  });
});
