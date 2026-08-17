import type { Product, ProductVariant } from "@/types";

/**
 * The exact 31 columns of a real Nuvemshop "Relatório de produtos"
 * export (semicolon-delimited, ISO-8859-1 encoded) — confirmed by
 * inspecting the actual file, not guessed. Column names in Portuguese,
 * exactly as Nuvemshop names them. See
 * docs/features/nuvemshop-import.md for the full analysis this was
 * built from.
 */
export type NuvemshopRawRow = {
  "Identificador URL": string;
  Nome: string;
  Categorias: string;
  "Nome da variação 1": string;
  "Valor da variação 1": string;
  "Nome da variação 2": string;
  "Valor da variação 2": string;
  "Nome da variação 3": string;
  "Valor da variação 3": string;
  Preço: string;
  "Preço promocional": string;
  "Peso (kg)": string;
  "Altura (cm)": string;
  "Largura (cm)": string;
  "Comprimento (cm)": string;
  Estoque: string;
  SKU: string;
  "Código de barras": string;
  "Exibir na loja": string;
  "Frete gratis": string;
  Descrição: string;
  Tags: string;
  "Título para SEO": string;
  "Descrição para SEO": string;
  Marca: string;
  "Produto Físico": string;
  "MPN (Cód. Exclusivo Modelo Fabricante)": string;
  Sexo: string;
  "Faixa etária": string;
  Custo: string;
  Visibilidade: string;
};

/**
 * A Nuvemshop export has one row per *variant* — product-level fields
 * (Nome, Categorias, Descrição, ...) are only filled on the first row
 * of each `Identificador URL` group, blank on the rest. This is the
 * shape after grouping + forward-filling those product-level fields —
 * one entry per product, with all its raw variant rows attached.
 */
export type NuvemshopProductGroup = {
  identifierUrl: string;
  productFields: NuvemshopRawRow; // forward-filled product-level fields, taken from the group's first non-blank values
  variantRows: NuvemshopRawRow[]; // every raw row in the group, in original order
};

export type ImportIdentifierSource = "sku" | "identifier-url+variant";

export type MappedVariant = ProductVariant & {
  stock: number;
  identifier: string;
  identifierSource: ImportIdentifierSource;
};

export type MappedProduct = Omit<Product, "id" | "variants"> & {
  /** Present only when every variant shares one SKU (single-variant
   * product) — matches `Product.sku`. */
  sku?: string;
  variants?: MappedVariant[];
  /** The identifier used to match against the current catalog — the
   * product's own SKU if it has exactly one variant with a SKU, or
   * (when the product has real variants) the identifier of its first
   * variant, for diffing purposes only. */
  identifier: string;
  identifierSource: ImportIdentifierSource;
};

export type IgnoredRow = {
  identifierUrl: string;
  name: string;
  reason: string;
};

export type ImportError = {
  rowIndex: number;
  identifierUrl: string;
  message: string;
};

export type ImportReport = {
  created: MappedProduct[];
  updated: MappedProduct[];
  variantsImported: number;
  ignored: IgnoredRow[];
  errors: ImportError[];
};
