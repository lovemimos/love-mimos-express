import { describe, it, expect } from "vitest";
import { runNuvemshopImport } from "./import";
import type { Product } from "@/types";

const HEADER =
  '"Identificador URL";Nome;Categorias;"Nome da variação 1";"Valor da variação 1";"Nome da variação 2";"Valor da variação 2";"Nome da variação 3";"Valor da variação 3";Preço;"Preço promocional";"Peso (kg)";"Altura (cm)";"Largura (cm)";"Comprimento (cm)";Estoque;SKU;"Código de barras";"Exibir na loja";"Frete gratis";Descrição;Tags;"Título para SEO";"Descrição para SEO";Marca;"Produto Físico";"MPN (Cód. Exclusivo Modelo Fabricante)";Sexo;"Faixa etária";Custo;Visibilidade';

function csvRow(fields: Partial<Record<string, string>>): string {
  const defaults: Record<string, string> = {
    "Identificador URL": "",
    Nome: "",
    Categorias: "",
    "Nome da variação 1": "",
    "Valor da variação 1": "",
    "Nome da variação 2": "",
    "Valor da variação 2": "",
    "Nome da variação 3": "",
    "Valor da variação 3": "",
    Preço: "",
    "Preço promocional": "",
    "Peso (kg)": "",
    "Altura (cm)": "",
    "Largura (cm)": "",
    "Comprimento (cm)": "",
    Estoque: "",
    SKU: "",
    "Código de barras": "",
    "Exibir na loja": "",
    "Frete gratis": "",
    Descrição: "",
    Tags: "",
    "Título para SEO": "",
    "Descrição para SEO": "",
    Marca: "",
    "Produto Físico": "",
    "MPN (Cód. Exclusivo Modelo Fabricante)": "",
    Sexo: "",
    "Faixa etária": "",
    Custo: "",
    Visibilidade: "",
    ...fields,
  };
  const cols = HEADER.split(";").map((h) => h.replace(/"/g, ""));
  return cols.map((c) => `"${(defaults[c] ?? "").replace(/"/g, '""')}"`).join(";");
}

const fakeCatalog: Product[] = [
  {
    id: "existing-1",
    slug: "cilios-ja-cadastrado",
    sku: "SKU-EXISTENTE",
    name: "Cílios Já Cadastrado",
    shortDescription: "x",
    description: "x",
    price: 30,
    stock: 5,
    categorySlug: "cilios",
    images: [],
  },
];

describe("runNuvemshopImport — relatório de ponta a ponta", () => {
  it("classifica produto novo (identificador não existe no catálogo atual) como 'created'", () => {
    const csv = [
      HEADER,
      csvRow({
        "Identificador URL": "cilios-novo",
        Nome: "Cílios Novo",
        Categorias: "Extensão de Cílios > CÍLIOS",
        Preço: "50.00",
        Estoque: "10",
        "Exibir na loja": "SIM",
        Visibilidade: "Visível",
      }),
    ].join("\n");

    const report = runNuvemshopImport(csv, fakeCatalog);
    expect(report.created).toHaveLength(1);
    expect(report.created[0].name).toBe("Cílios Novo");
    expect(report.updated).toHaveLength(0);
  });

  it("classifica produto com SKU já existente no catálogo como 'updated'", () => {
    const csv = [
      HEADER,
      csvRow({
        "Identificador URL": "outro-slug",
        Nome: "Cílios Já Cadastrado (nome atualizado)",
        Categorias: "Extensão de Cílios > CÍLIOS",
        Preço: "35.00",
        Estoque: "8",
        SKU: "SKU-EXISTENTE",
        "Exibir na loja": "SIM",
        Visibilidade: "Visível",
      }),
    ].join("\n");

    const report = runNuvemshopImport(csv, fakeCatalog);
    expect(report.updated).toHaveLength(1);
    expect(report.created).toHaveLength(0);
  });

  it("classifica produto com mesmo slug (Identificador URL) já existente como 'updated'", () => {
    const csv = [
      HEADER,
      csvRow({
        "Identificador URL": "cilios-ja-cadastrado",
        Nome: "Cílios Já Cadastrado",
        Categorias: "Extensão de Cílios > CÍLIOS",
        Preço: "32.00",
        Estoque: "6",
        "Exibir na loja": "SIM",
        Visibilidade: "Visível",
      }),
    ].join("\n");

    const report = runNuvemshopImport(csv, fakeCatalog);
    expect(report.updated).toHaveLength(1);
  });

  it("conta variantsImported corretamente para produtos com e sem variação", () => {
    const csv = [
      HEADER,
      csvRow({
        "Identificador URL": "produto-simples",
        Nome: "Produto Simples",
        Categorias: "Extensão de Cílios > CÍLIOS",
        Preço: "20.00",
        "Exibir na loja": "SIM",
        Visibilidade: "Visível",
      }),
      csvRow({
        "Identificador URL": "produto-com-variacao",
        Nome: "Produto Com Variação",
        Categorias: "Extensão de Cílios > CÍLIOS",
        "Valor da variação 1": "P",
        Preço: "20.00",
        "Exibir na loja": "SIM",
        Visibilidade: "Visível",
      }),
      csvRow({
        "Identificador URL": "produto-com-variacao",
        "Valor da variação 1": "G",
        Preço: "22.00",
      }),
    ].join("\n");

    const report = runNuvemshopImport(csv, []);
    expect(report.created).toHaveLength(2);
    expect(report.variantsImported).toBe(1 + 2);
  });

  it("registra linhas ignoradas com o motivo (categoria fora do escopo)", () => {
    const csv = [
      HEADER,
      csvRow({
        "Identificador URL": "esmalte-x",
        Nome: "Esmalte X",
        Categorias: "NAIL DESIGNER > Esmaltes",
        Preço: "15.00",
        "Exibir na loja": "SIM",
        Visibilidade: "Visível",
      }),
    ].join("\n");

    const report = runNuvemshopImport(csv, []);
    expect(report.ignored).toHaveLength(1);
    expect(report.ignored[0].name).toBe("Esmalte X");
    expect(report.ignored[0].reason).toMatch(/fora do escopo/i);
    expect(report.created).toHaveLength(0);
  });

  it("registra erros sem derrubar o processamento dos demais produtos", () => {
    const csv = [
      HEADER,
      csvRow({
        "Identificador URL": "produto-sem-preco",
        Nome: "Produto Sem Preço",
        Categorias: "Extensão de Cílios > CÍLIOS",
        Preço: "",
        "Exibir na loja": "SIM",
        Visibilidade: "Visível",
      }),
      csvRow({
        "Identificador URL": "produto-valido",
        Nome: "Produto Válido",
        Categorias: "Extensão de Cílios > CÍLIOS",
        Preço: "25.00",
        "Exibir na loja": "SIM",
        Visibilidade: "Visível",
      }),
    ].join("\n");

    const report = runNuvemshopImport(csv, []);
    expect(report.errors).toHaveLength(1);
    expect(report.created).toHaveLength(1);
  });

  it("não altera o array de catálogo recebido (só lê, nunca modifica)", () => {
    const catalogCopy = JSON.parse(JSON.stringify(fakeCatalog));
    const csv = [
      HEADER,
      csvRow({
        "Identificador URL": "cilios-novo",
        Nome: "Cílios Novo",
        Categorias: "Extensão de Cílios > CÍLIOS",
        Preço: "50.00",
        "Exibir na loja": "SIM",
        Visibilidade: "Visível",
      }),
    ].join("\n");

    runNuvemshopImport(csv, fakeCatalog);
    expect(fakeCatalog).toEqual(catalogCopy);
  });
});
