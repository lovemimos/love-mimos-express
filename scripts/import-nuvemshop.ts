#!/usr/bin/env tsx
/**
 * Importação do catálogo a partir de um export da Nuvemshop.
 *
 * Uso:
 *   npm run import:nuvemshop -- <caminho-do-csv>              (pré-visualização — não altera nada)
 *   npm run import:nuvemshop -- <caminho-do-csv> --apply       (aplica de verdade em src/lib/data/products.ts)
 *
 * Sem --apply, este script NUNCA escreve em src/lib/data/products.ts —
 * só lê o CSV, roda o pipeline de mapeamento/diff, e escreve um
 * relatório em import-preview/nuvemshop-report.json para revisão. Ver
 * docs/features/nuvemshop-import.md para o mapeamento completo aplicado.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { runNuvemshopImport } from "../src/lib/import/nuvemshop/import";
import type { MappedProduct, MappedVariant } from "../src/lib/import/nuvemshop/types";
import { products as currentProducts } from "../src/lib/data/products";
import { buildCatalogFileContents } from "./lib/serialize-catalog";
import type { Product, ProductVariant } from "../src/types";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const csvPath = args.find((a) => !a.startsWith("--"));

if (!csvPath) {
  console.error("Uso: npm run import:nuvemshop -- <caminho-do-csv> [--apply]");
  process.exit(1);
}

// A planilha real da Nuvemshop vem em ISO-8859-1 (confirmado ao
// inspecionar o arquivo original), não UTF-8 — ler como latin1 e
// deixar o Node reinterpretar como string evita corromper acentos.
const csvText = readFileSync(csvPath, "latin1");

const report = runNuvemshopImport(csvText, currentProducts);

function printSection(title: string, count: number) {
  console.log(`\n${title}: ${count}`);
}

console.log("=== Relatório de importação — Nuvemshop → Love Mimos Express ===");
printSection("Produtos criados", report.created.length);
printSection("Produtos atualizados", report.updated.length);
printSection("Variações importadas", report.variantsImported);
printSection("Linhas ignoradas", report.ignored.length);
printSection("Erros", report.errors.length);

if (report.ignored.length > 0) {
  console.log("\n--- Motivos das linhas ignoradas (agrupado) ---");
  const byReason = new Map<string, number>();
  for (const item of report.ignored) {
    byReason.set(item.reason, (byReason.get(item.reason) ?? 0) + 1);
  }
  for (const [reason, count] of byReason) {
    console.log(`  ${count}x — ${reason}`);
  }
}

if (report.errors.length > 0) {
  console.log("\n--- Erros ---");
  for (const err of report.errors) {
    console.log(`  [linha ${err.rowIndex}] ${err.identifierUrl}: ${err.message}`);
  }
}

// Pré-visualização sempre escrita, com ou sem --apply — é o que "gerar
// uma pré-visualização antes da importação" pede; a decisão de aplicar
// (ou não) é sempre um passo separado e explícito (--apply).
const outDir = join(process.cwd(), "import-preview");
mkdirSync(outDir, { recursive: true });
const reportPath = join(outDir, "nuvemshop-report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
console.log(`\nRelatório completo salvo em: ${reportPath}`);

if (!apply) {
  console.log(
    "\nModo pré-visualização — nenhum arquivo do catálogo foi alterado. Rode novamente com --apply para aplicar de verdade."
  );
  process.exit(0);
}

console.log("\n--apply informado — aplicando alterações em src/lib/data/products.ts...");

function toProductVariant(v: MappedVariant): ProductVariant {
  return { id: v.id, label: v.label, priceModifier: v.priceModifier, attributes: v.attributes };
}

function nextId(existing: Product[]): () => string {
  let max = 0;
  for (const p of existing) {
    const match = /^p-(\d+)$/.exec(p.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  let counter = max;
  return () => {
    counter += 1;
    return `p-${String(counter).padStart(2, "0")}`;
  };
}

function mappedToProduct(mapped: MappedProduct, id: string): Product {
  return {
    id,
    sku: mapped.sku,
    barcode: mapped.barcode,
    manufacturer: mapped.manufacturer,
    slug: mapped.slug,
    name: mapped.name,
    shortDescription: mapped.shortDescription,
    description: mapped.description,
    price: mapped.price,
    compareAtPrice: mapped.compareAtPrice,
    stock: mapped.stock,
    categorySlug: mapped.categorySlug,
    brandSlug: mapped.brandSlug,
    attributes: mapped.attributes,
    tags: mapped.tags,
    images: mapped.images,
    badge: mapped.badge,
    variants: mapped.variants?.map(toProductVariant),
  };
}

const generateId = nextId(currentProducts);
const bySlug = new Map(currentProducts.map((p) => [p.slug, p]));

for (const mapped of report.updated) {
  const existing = bySlug.get(mapped.slug) ?? currentProducts.find((p) => p.sku && p.sku === mapped.sku);
  if (existing) bySlug.set(existing.slug, mappedToProduct(mapped, existing.id));
}
for (const mapped of report.created) {
  const product = mappedToProduct(mapped, generateId());
  bySlug.set(product.slug, product);
}

const finalCatalog = Array.from(bySlug.values());

const fileContents = buildCatalogFileContents(
  finalCatalog,
  '// Gerado/atualizado por scripts/import-nuvemshop.ts a partir de um\n// export da Nuvemshop — ver docs/features/nuvemshop-import.md para o\n// mapeamento completo aplicado. Produtos de categorias fora do escopo\n// desta importação (fora de "Extensão de Cílios") não foram tocados.'
);

const productsPath = join(process.cwd(), "src/lib/data/products.ts");
writeFileSync(productsPath, fileContents, "utf-8");
console.log(`Catálogo atualizado: ${productsPath}`);
console.log(`  ${report.created.length} produto(s) criado(s), ${report.updated.length} atualizado(s).`);
console.log("\nRode `npm run lint`, `npm test` e `npm run build` para validar antes de commitar.");
