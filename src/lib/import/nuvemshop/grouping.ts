import type { NuvemshopRawRow, NuvemshopProductGroup } from "@/lib/import/nuvemshop/types";

/**
 * Product-level columns — only ever filled on the first row of a group
 * in the real export, blank on every subsequent variant row. Everything
 * NOT in this list (Preço, Estoque, SKU, variação, etc.) is a per-row
 * (per-variant) field and is read straight off each raw row instead.
 */
const PRODUCT_LEVEL_FIELDS: (keyof NuvemshopRawRow)[] = [
  "Nome",
  "Categorias",
  "Descrição",
  "Tags",
  "Título para SEO",
  "Descrição para SEO",
  "Marca",
  "Produto Físico",
  "Sexo",
  "Faixa etária",
  "Exibir na loja",
  "Frete gratis",
  "Visibilidade",
];

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

/**
 * Groups rows by `Identificador URL` (the true product-grouping key —
 * NOT the SKU, which is often absent) and forward-fills every
 * product-level field from whichever row in the group has it filled
 * (in practice always the first, but this doesn't assume that).
 */
export function groupNuvemshopRows(rows: NuvemshopRawRow[]): NuvemshopProductGroup[] {
  const order: string[] = [];
  const groups = new Map<string, NuvemshopRawRow[]>();

  for (const row of rows) {
    const id = row["Identificador URL"];
    if (!groups.has(id)) {
      groups.set(id, []);
      order.push(id);
    }
    groups.get(id)!.push(row);
  }

  return order.map((identifierUrl) => {
    const variantRows = groups.get(identifierUrl)!;

    const productFields = { ...variantRows[0] };
    for (const field of PRODUCT_LEVEL_FIELDS) {
      if (isBlank(productFields[field])) {
        const filled = variantRows.find((r) => !isBlank(r[field]));
        if (filled) productFields[field] = filled[field];
      }
    }

    return { identifierUrl, productFields, variantRows };
  });
}
