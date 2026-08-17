#!/usr/bin/env tsx
/**
 * Prova de conceito: sincroniza UM produto da Tiny pelo ID, de ponta a
 * ponta, para o catálogo da aplicação.
 *
 * Uso:
 *   npm run sync:tiny-product -- <idProdutoTiny>                (relatório só — não escreve nada)
 *   npm run sync:tiny-product -- <idProdutoTiny> --apply         (grava se não houver conflito)
 *   npm run sync:tiny-product -- <idProdutoTiny> --apply --force (grava mesmo havendo conflito com dado já existente)
 *
 * Requer as variáveis de ambiente TINY_CLIENT_ID, TINY_CLIENT_SECRET,
 * TINY_REFRESH_TOKEN configuradas (ver .env.example e
 * docs/API_TINY.md §2) — nunca coloque esses valores em código.
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { syncSingleTinyProduct } from "../src/lib/repositories/tiny/single-product-sync";
import { products as currentProducts } from "../src/lib/data/products";
import { buildCatalogFileContents } from "./lib/serialize-catalog";
import type { Product } from "../src/types";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const force = args.includes("--force");
const tinyProductId = args.find((a) => !a.startsWith("--"));

if (!tinyProductId) {
  console.error("Uso: npm run sync:tiny-product -- <idProdutoTiny> [--apply] [--force]");
  process.exit(1);
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

async function main() {
  console.log(`=== Sincronização controlada — produto Tiny #${tinyProductId} ===\n`);

  const report = await syncSingleTinyProduct(tinyProductId!, currentProducts);

  const outDir = join(process.cwd(), "import-preview");
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, `tiny-product-${tinyProductId}-report.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Relatório completo salvo em: ${reportPath}\n`);

  if (!report.found) {
    console.log("❌ Produto não encontrado na Tiny (ID inválido, inacessível, ou falha de conexão/autenticação).");
    console.log("   Verifique TINY_CLIENT_ID/TINY_CLIENT_SECRET/TINY_REFRESH_TOKEN e o ID informado.");
    process.exit(1);
  }

  if (!report.mapped) {
    console.log("⚠️  Produto encontrado na Tiny, mas não pôde ser mapeado — provavelmente inativo/excluído,");
    console.log("   ou sem nome/preço válido (campos obrigatórios do domínio).");
    console.log(`   Chaves brutas recebidas: ${report.rawKeysSeen?.join(", ")}`);
    process.exit(1);
  }

  const p = report.mapped;
  console.log("✅ Produto encontrado e mapeado:");
  console.log(`   Nome: ${p.name}`);
  console.log(`   SKU: ${p.sku ?? "(nenhum)"}`);
  console.log(`   Categoria: ${p.categorySlug}`);
  console.log(`   Marca: ${p.brandSlug ?? "(nenhuma — ver missingFields abaixo)"}`);
  console.log(
    `   Preço: R$ ${p.price.toFixed(2)}${p.compareAtPrice ? ` (de R$ ${p.compareAtPrice.toFixed(2)})` : ""}`
  );
  console.log(`   Estoque: ${p.stock}`);
  console.log(`   Imagens: ${p.images.length}`);
  console.log(`   Variações: ${p.variants?.length ?? 0}`);
  console.log(`   ID Tiny registrado (externalRef): ${p.externalRef?.id}`);

  if (report.missingFields.length > 0) {
    console.log("\n--- Campos não encontrados / sem dado na Tiny ---");
    for (const field of report.missingFields) console.log(`   - ${field}`);
  }

  if (report.conflict) {
    console.log(`\n⚠️  CONFLITO — já existe um produto no catálogo (encontrado por: ${report.conflict.matchedBy}).`);
    console.log("   Campos diferentes:");
    for (const diff of report.conflict.fieldDiffs) {
      console.log(`   - ${diff.field}:`);
      console.log(`       atual (catálogo):  ${JSON.stringify(diff.currentValue)}`);
      console.log(`       novo (Tiny):       ${JSON.stringify(diff.incomingValue)}`);
    }

    if (!apply) {
      console.log("\nModo pré-visualização — nada foi escrito.");
      return;
    }
    if (!force) {
      console.log(
        "\n❌ NÃO gravado — há conflito com dado já existente. Rode novamente com --force para sobrescrever."
      );
      process.exit(1);
    }
    console.log("\n--force informado — sobrescrevendo o produto existente...");
  }

  if (!apply) {
    console.log("\nModo pré-visualização — nada foi escrito. Rode com --apply para gravar.");
    return;
  }

  const bySlug = new Map(currentProducts.map((existing) => [existing.slug, existing] as const));
  const targetId = report.conflict?.existing.id ?? nextId(currentProducts)();
  const finalProduct: Product = { ...p, id: targetId };

  if (report.conflict) {
    bySlug.delete(report.conflict.existing.slug);
  }
  bySlug.set(finalProduct.slug, finalProduct);

  const finalCatalog = Array.from(bySlug.values());
  const fileContents = buildCatalogFileContents(
    finalCatalog,
    `// Produto #${tinyProductId} sincronizado individualmente da Tiny via\n// scripts/sync-tiny-product.ts — ver docs/features/tiny-single-product-sync.md.`
  );

  const productsPath = join(process.cwd(), "src/lib/data/products.ts");
  writeFileSync(productsPath, fileContents, "utf-8");
  console.log(`\n✅ Catálogo atualizado: ${productsPath}`);
  console.log("\nRode `npm run lint`, `npm test` e `npm run build` para validar antes de commitar.");
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
