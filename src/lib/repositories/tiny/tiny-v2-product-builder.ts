import { slugify } from "@/utils/slugify";
import type { Product } from "@/types";
import type { TinyV2MappingResult } from "@/lib/repositories/tiny/tiny-v2-mapper";

export type BuildResult = {
  product: Product;
  fallbacksUsed: string[];
  blockers: string[];
};

/**
 * `mapTinyV2ProductToDomain` deliberately only reports *status* per
 * field — it never invents a `slug`/`shortDescription` (concepts the
 * Tiny v2 payload has no direct field for at all) and never decides
 * what to do when a required domain field is missing. This function is
 * that decision, made once, explicitly, and reported honestly via
 * `fallbacksUsed` — never silent.
 */
export function buildWritableProduct(result: TinyV2MappingResult, tinyProductId: string): BuildResult {
  const fallbacksUsed: string[] = [];
  const blockers: string[] = [];
  const m = result.mapped;

  const name = typeof m.name === "string" ? m.name : undefined;
  if (!name) blockers.push("Nome ausente — não é possível gerar um produto sem nome.");

  const price = typeof m.price === "number" ? m.price : undefined;
  if (price === undefined) blockers.push("Preço ausente — não é possível gravar um produto sem preço.");

  if (blockers.length > 0) {
    return {
      product: {
        id: "",
        slug: "",
        name: name ?? "",
        shortDescription: "",
        description: "",
        price: price ?? 0,
        stock: 0,
        categorySlug: "",
        images: [],
      },
      fallbacksUsed,
      blockers,
    };
  }

  const slug = slugify(name!) || `tiny-produto-${tinyProductId}`;
  const finalPrice: number = price!;

  const description = typeof m.description === "string" ? m.description : name!;
  if (typeof m.description !== "string") {
    fallbacksUsed.push("shortDescription/description: Tiny não retornou descrição — usando o nome como texto.");
  }
  // shortDescription é sempre renderizada como texto puro (ver
  // ProductDetail.tsx), nunca via dangerouslySetInnerHTML — por isso
  // é derivada do texto SEM tags, nunca truncando o HTML já
  // sanitizado por contagem de caracteres (que poderia cortar uma tag
  // no meio e produzir HTML quebrado).
  const plainTextDescription = description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const shortDescription =
    plainTextDescription.length > 80 ? `${plainTextDescription.slice(0, 77)}...` : plainTextDescription;

  let categorySlug = typeof m.categorySlug === "string" ? m.categorySlug : undefined;
  if (!categorySlug) {
    categorySlug = "geral";
    fallbacksUsed.push('categorySlug: Tiny não retornou categoria — usando "geral" como fallback temporário.');
  }

  const stock = typeof m.stock === "number" ? m.stock : 0;
  if (typeof m.stock !== "number") {
    fallbacksUsed.push("stock: Tiny não retornou estoque — usando 0 (produto aparecerá como esgotado até confirmar).");
  }

  const product: Product = {
    id: "",
    slug,
    name: name!,
    shortDescription,
    description,
    price: finalPrice,
    compareAtPrice: typeof m.compareAtPrice === "number" ? m.compareAtPrice : undefined,
    stock,
    categorySlug,
    brandSlug: typeof m.brandSlug === "string" ? m.brandSlug : undefined,
    sku: typeof m.sku === "string" ? m.sku : undefined,
    barcode: typeof m.barcode === "string" ? m.barcode : undefined,
    unit: typeof m.unit === "string" ? m.unit : undefined,
    ncm: typeof m.ncm === "string" ? m.ncm : undefined,
    weight: typeof m.weight === "number" ? m.weight : undefined,
    dimensions:
      m.dimensions && typeof m.dimensions === "object" ? (m.dimensions as Product["dimensions"]) : undefined,
    images: Array.isArray(m.images) ? (m.images as string[]) : [],
    variants: Array.isArray(m.variants) ? (m.variants as Product["variants"]) : undefined,
    externalRef: m.externalRef as Product["externalRef"],
  };

  return { product, fallbacksUsed, blockers };
}
