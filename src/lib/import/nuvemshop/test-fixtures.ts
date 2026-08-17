import type { NuvemshopRawRow, NuvemshopProductGroup } from "./types";

const BLANK_ROW: NuvemshopRawRow = {
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
};

export function row(overrides: Partial<NuvemshopRawRow>): NuvemshopRawRow {
  return { ...BLANK_ROW, ...overrides };
}

/** A published, Extensão de Cílios > CÍLIOS row — the common case most
 * tests build on top of, so each test only overrides what it cares about. */
export function publishedCiliosRow(overrides: Partial<NuvemshopRawRow> = {}): NuvemshopRawRow {
  return row({
    "Identificador URL": "produto-teste",
    Nome: "Produto Teste",
    Categorias: "Extensão de Cílios > CÍLIOS",
    Preço: "50.00",
    Estoque: "10",
    "Exibir na loja": "SIM",
    Visibilidade: "Visível",
    ...overrides,
  });
}

export function group(rows: NuvemshopRawRow[]): NuvemshopProductGroup {
  return {
    identifierUrl: rows[0]["Identificador URL"],
    productFields: rows[0],
    variantRows: rows,
  };
}
