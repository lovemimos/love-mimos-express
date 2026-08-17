import type {
  NuvemshopProductGroup,
  NuvemshopRawRow,
  MappedProduct,
  MappedVariant,
  ImportIdentifierSource,
} from "@/lib/import/nuvemshop/types";
import { isImportableRootCategory, mapCategorySlug } from "@/lib/import/nuvemshop/nuvemshop-category-mapping";
import { stripHtmlToPlainText } from "@/lib/import/nuvemshop/sanitize-html";
import { slugify } from "@/utils/slugify";

export type MapResult =
  | { kind: "mapped"; product: MappedProduct }
  | { kind: "ignored"; reason: string }
  | { kind: "error"; message: string };

function toNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : null;
}

function isPublished(fields: NuvemshopRawRow): boolean {
  return fields["Exibir na loja"]?.trim() === "SIM" && fields.Visibilidade?.trim() === "Visível";
}

/** SKU when present; otherwise `identifierUrl` + the variant's own
 * value, so two different variants of the same SKU-less product still
 * get distinct identifiers (per the product decision on SKU-less rows). */
function resolveVariantIdentifier(
  row: NuvemshopRawRow,
  identifierUrl: string
): { identifier: string; source: ImportIdentifierSource } {
  const sku = row.SKU?.trim();
  if (sku) return { identifier: sku, source: "sku" };

  const variantValue = row["Valor da variação 1"]?.trim();
  const identifier = variantValue ? `${identifierUrl}:${variantValue}` : identifierUrl;
  return { identifier, source: "identifier-url+variant" };
}

function buildVariantLabel(row: NuvemshopRawRow): string {
  const name = row["Nome da variação 1"]?.trim();
  const value = row["Valor da variação 1"]?.trim();
  if (!value) return "Único";
  return name ? `${name}: ${value}` : value;
}

/**
 * Populates `Product.attributes` from real, structured columns only —
 * never inferred from free text (Tags/SEO/product name). Today that
 * means:
 * - `cor` ← the variation value, but ONLY when the variation dimension
 *   is literally named "Cor" AND the product has just one row (a
 *   single, non-varying color). When there are multiple real color
 *   variants, color lives per-variant instead — see
 *   `buildVariantAttributes` below, not here.
 *
 * `tecnica`/`efeito`/`curvatura`/`espessura`/`comprimento`/`linha`/
 * `material`/`volume` have no structured column in the real Nuvemshop
 * export (confirmed by analysis — see docs/features/nuvemshop-import.md)
 * and are deliberately left unpopulated rather than guessed from the
 * product name.
 */
function buildAttributes(variantRow: NuvemshopRawRow, isMultiColorVariant: boolean): Record<string, string> | undefined {
  const attributes: Record<string, string> = {};

  const variationName = variantRow["Nome da variação 1"]?.trim().toLowerCase();
  const variationValue = variantRow["Valor da variação 1"]?.trim();
  if (variationName === "cor" && variationValue && !isMultiColorVariant) {
    attributes.cor = variationValue;
  }

  return Object.keys(attributes).length > 0 ? attributes : undefined;
}

/**
 * Per-variant facet values — today only `cor`, and only when the
 * product genuinely has more than one real color (see
 * `mapNuvemshopGroup`). This is what fixes the case `buildAttributes`
 * deliberately excludes: a product available in 5 colors doesn't lie
 * about the other 4 by picking just one for the whole product.
 */
function buildVariantAttributes(row: NuvemshopRawRow, isMultiColorVariant: boolean): Record<string, string> | undefined {
  if (!isMultiColorVariant) return undefined;
  const value = row["Valor da variação 1"]?.trim();
  return value ? { cor: value } : undefined;
}

/** `Marca` → a brand *reference* (slug), not a generic attribute — see
 * the domain consolidation note on `Brand` in src/types/index.ts. The
 * slug is generated even if no curated `Brand` entity exists yet for it
 * in src/lib/data/brands.ts; a content editor can add the richer entity
 * (description/banner/SEO) later without touching any product. */
function resolveBrandSlug(productFields: NuvemshopRawRow): string | undefined {
  const marca = productFields.Marca?.trim();
  return marca ? slugify(marca) : undefined;
}

function buildTags(productFields: NuvemshopRawRow): string[] | undefined {
  const raw = productFields.Tags?.trim();
  if (!raw) return undefined;
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

/**
 * Maps one grouped Nuvemshop product to the app's `Product` shape, or
 * explains why it can't be imported. Never throws for expected data
 * issues (missing price, unmapped category, etc.) — those become
 * `ignored`/`error` results the caller aggregates into the report.
 */
export function mapNuvemshopGroup(group: NuvemshopProductGroup): MapResult {
  const { identifierUrl, productFields, variantRows } = group;
  const name = productFields.Nome?.trim();

  if (!name) {
    return { kind: "error", message: `Produto sem nome (Identificador URL: ${identifierUrl})` };
  }

  if (!isPublished(productFields)) {
    return { kind: "ignored", reason: "Produto não publicado na loja (Exibir na loja/Visibilidade)" };
  }

  if (!isImportableRootCategory(productFields.Categorias ?? "")) {
    return {
      kind: "ignored",
      reason: 'Categoria fora do escopo desta importação (raiz diferente de "Extensão de Cílios")',
    };
  }

  const categorySlug = mapCategorySlug(productFields.Categorias ?? "");
  if (!categorySlug) {
    return {
      kind: "ignored",
      reason: `Subcategoria sem mapeamento conhecido (Categorias: "${productFields.Categorias}")`,
    };
  }

  const parsedRows = variantRows.map((row) => {
    const listPrice = toNumber(row.Preço); // "Preço" = regular/list price
    const promoPrice = toNumber(row["Preço promocional"]); // when present and lower, this is what the customer actually pays
    const hasRealPromo = promoPrice !== null && listPrice !== null && promoPrice < listPrice;
    const effectivePrice = hasRealPromo ? promoPrice : listPrice;
    const stock = toNumber(row.Estoque) ?? 0;
    return { row, listPrice, promoPrice, hasRealPromo, effectivePrice, stock };
  });

  const validPriceRows = parsedRows.filter((r) => r.effectivePrice !== null);
  if (validPriceRows.length === 0) {
    return { kind: "error", message: `Nenhuma variação com preço válido (${identifierUrl})` };
  }

  const basePrice = Math.min(...validPriceRows.map((r) => r.effectivePrice!));
  const totalStock = parsedRows.reduce((sum, r) => sum + r.stock, 0);
  // Aggregate stock: `Product.stock` is a single number (the current
  // model has no per-variant stock) — using the sum across variants is
  // the most defensible aggregate ("is there anything at all to sell"),
  // see docs/features/nuvemshop-import.md for why this was a judgment
  // call, not a literal mapping.
  const hasRealVariants = variantRows.length > 1 || Boolean(variantRows[0]["Valor da variação 1"]?.trim());
  const isMultiColorVariant =
    variantRows.length > 1 && variantRows[0]["Nome da variação 1"]?.trim().toLowerCase() === "cor";

  const variants: MappedVariant[] | undefined = hasRealVariants
    ? parsedRows.map(({ row, effectivePrice, stock }) => {
        const { identifier, source } = resolveVariantIdentifier(row, identifierUrl);
        return {
          id: identifier,
          label: buildVariantLabel(row),
          priceModifier: effectivePrice !== null ? Number((effectivePrice - basePrice).toFixed(2)) : 0,
          stock,
          identifier,
          identifierSource: source,
          attributes: buildVariantAttributes(row, isMultiColorVariant),
        };
      })
    : undefined;

  const firstRowIdentifier = resolveVariantIdentifier(variantRows[0], identifierUrl);
  const singleSku = !hasRealVariants ? variantRows[0].SKU?.trim() || undefined : undefined;

  const rawDescription = productFields.Descrição?.trim();
  const description = rawDescription ? stripHtmlToPlainText(rawDescription) : name;
  const shortDescription = description.length > 80 ? `${description.slice(0, 77)}...` : description;

  const promoRow = validPriceRows.find((r) => r.hasRealPromo);

  const product: MappedProduct = {
    sku: singleSku,
    slug: identifierUrl,
    name,
    shortDescription,
    description,
    price: basePrice,
    compareAtPrice: promoRow?.listPrice ?? undefined,
    stock: totalStock,
    categorySlug,
    brandSlug: resolveBrandSlug(productFields),
    barcode: variantRows[0]["Código de barras"]?.trim() || undefined,
    attributes: buildAttributes(variantRows[0], isMultiColorVariant),
    tags: buildTags(productFields),
    images: [], // confirmed: no image URL column exists anywhere in this export
    badge: promoRow ? "promocao" : undefined,
    variants,
    identifier: firstRowIdentifier.identifier,
    identifierSource: firstRowIdentifier.source,
  };

  return { kind: "mapped", product };
}
