import type { Product, ProductVariant } from "../../src/types";
import { normalizeImageUrls } from "../../src/utils/normalize-image-url";

/**
 * Serializes the full catalog to valid TypeScript source for
 * `src/lib/data/products.ts`. Shared by every script that writes the
 * catalog (Nuvemshop importer, Tiny single-product sync) so there is
 * exactly one place this format is defined — a bug here (a field
 * silently dropped) previously existed *only* in `import-nuvemshop.ts`'s
 * own copy of this logic; extracting it is what surfaced that bug.
 */
export function buildCatalogFileContents(products: Product[], generatedByComment: string): string {
  return `import type { Product } from "@/types";

${generatedByComment}
export const products: Product[] = [
${products.map(serializeProduct).join("\n")}
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
`;
}

function serializeExternalRef(ref: Product["externalRef"], indent: string): string | null {
  if (!ref) return null;
  return `${indent}externalRef: { source: ${JSON.stringify(ref.source)}, id: ${JSON.stringify(ref.id)} },`;
}

function serializeVariant(v: ProductVariant): string {
  const parts = [`id: ${JSON.stringify(v.id)}`, `label: ${JSON.stringify(v.label)}`];
  if (v.priceModifier !== undefined) parts.push(`priceModifier: ${v.priceModifier}`);
  if (v.attributes && Object.keys(v.attributes).length > 0) {
    parts.push(`attributes: ${JSON.stringify(v.attributes)}`);
  }
  if (v.externalRef) {
    parts.push(
      `externalRef: { source: ${JSON.stringify(v.externalRef.source)}, id: ${JSON.stringify(v.externalRef.id)} }`
    );
  }
  return `      { ${parts.join(", ")} },`;
}

function serializeProduct(p: Product): string {
  const lines: string[] = ["  {"];
  lines.push(`    id: ${JSON.stringify(p.id)},`);
  if (p.sku) lines.push(`    sku: ${JSON.stringify(p.sku)},`);
  if (p.barcode) lines.push(`    barcode: ${JSON.stringify(p.barcode)},`);
  if (p.manufacturer) lines.push(`    manufacturer: ${JSON.stringify(p.manufacturer)},`);
  if (p.weight !== undefined) lines.push(`    weight: ${p.weight},`);
  if (p.dimensions) lines.push(`    dimensions: ${JSON.stringify(p.dimensions)},`);
  lines.push(`    slug: ${JSON.stringify(p.slug)},`);
  lines.push(`    name: ${JSON.stringify(p.name)},`);
  lines.push(`    shortDescription: ${JSON.stringify(p.shortDescription)},`);
  lines.push(`    description: ${JSON.stringify(p.description)},`);
  lines.push(`    price: ${p.price},`);
  if (p.compareAtPrice !== undefined) lines.push(`    compareAtPrice: ${p.compareAtPrice},`);
  lines.push(`    stock: ${p.stock},`);
  lines.push(`    categorySlug: ${JSON.stringify(p.categorySlug)},`);
  if (p.brandSlug) lines.push(`    brandSlug: ${JSON.stringify(p.brandSlug)},`);
  if (p.attributes && Object.keys(p.attributes).length > 0) {
    lines.push(`    attributes: ${JSON.stringify(p.attributes)},`);
  }
  if (p.tags && p.tags.length > 0) lines.push(`    tags: ${JSON.stringify(p.tags)},`);
  lines.push(`    images: ${JSON.stringify(normalizeImageUrls(p.images))},`);
  if (p.badge) lines.push(`    badge: ${JSON.stringify(p.badge)},`);
  if (p.variants && p.variants.length > 0) {
    lines.push("    variants: [");
    for (const v of p.variants) lines.push(serializeVariant(v));
    lines.push("    ],");
  }
  const externalRefLine = serializeExternalRef(p.externalRef, "    ");
  if (externalRefLine) lines.push(externalRefLine);
  lines.push("  },");
  return lines.join("\n");
}
