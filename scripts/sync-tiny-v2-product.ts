#!/usr/bin/env tsx
/**
 * Grava UM produto da Tiny (API v2) no catálogo — controlado, com
 * pré-visualização por padrão e confirmação interativa obrigatória
 * antes de qualquer gravação real. Ver
 * docs/features/tiny-v2-single-product-write.md.
 *
 * Uso:
 *   npm run write:tiny-v2-product -- <idProdutoTiny>                (só relatório — nunca pede confirmação)
 *   npm run write:tiny-v2-product -- <idProdutoTiny> --apply         (mostra resumo, pede para digitar o ID da Tiny, só então grava)
 *   npm run write:tiny-v2-product -- <idProdutoTiny> --apply --force (idem, mas sobrescreve um conflito conscientemente)
 *
 * A confirmação interativa só aparece com --apply — o modo de
 * pré-visualização (padrão, sem --apply) nunca escreve nada e nunca
 * pede nada, então pode ser rodado livremente quantas vezes quiser.
 */
import { loadEnvConfig } from "@next/env";

// CAUSA RAIZ de um bug real: `next dev`/`next build`/`next start`
// carregam `.env.local` automaticamente por dentro — um script rodado
// via `tsx` puro NÃO faz isso sozinho. Sem esta linha, o script só
// enxerga `TINY_API_TOKEN` se a variável já estiver no ambiente do
// shell (ex.: definida manualmente com `$env:TINY_API_TOKEN=...` no
// PowerShell), o que se perde a cada nova sessão de terminal — é
// exatamente esse o comportamento intermitente relatado. Silencioso
// de propósito (`log` com funções vazias): nunca imprime nada,
// nem o caminho do arquivo .env.local, nem muito menos o token.
loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });

import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { testTinyV2Connection } from "../src/lib/repositories/tiny/tiny-v2-connection-test";
import { mapTinyV2ProductToDomain, type TinyV2ProductPayload } from "../src/lib/repositories/tiny/tiny-v2-mapper";
import { buildWritableProduct } from "../src/lib/repositories/tiny/tiny-v2-product-builder";
import { resolveProductImages } from "../src/lib/repositories/tiny/tiny-v2-image-resolution";
import { findExistingProduct, diffProductFields } from "../src/lib/catalog/product-diff";
import { products as currentProducts } from "../src/lib/data/products";
import { buildCatalogFileContents } from "./lib/serialize-catalog";
import type { Product } from "../src/types";

const PRODUCTS_FILE_PATH = join(process.cwd(), "src/lib/data/products.ts");

/**
 * Confirma, em tempo de execução, qual fonte de dados o próprio
 * frontend vai usar para servir a página do produto — não presume.
 * `DATA_SOURCE` (ver src/lib/env.ts / src/lib/repositories/index.ts) é
 * o único interruptor: "mock" (padrão) lê exatamente
 * src/lib/data/products.ts; "tiny" ignora esse arquivo por completo e
 * fala com a API v3 ao vivo. Se estiver "tiny" sem querer, gravar
 * neste arquivo não teria efeito nenhum na página real — por isso
 * isso é checado e reportado explicitamente, nunca assumido.
 */
function describeFrontendDataSource(): string {
  const raw = (process.env.DATA_SOURCE ?? "mock").trim().toLowerCase();
  if (raw === "tiny") {
    return "⚠️ DATA_SOURCE=tiny — o frontend NÃO lê src/lib/data/products.ts; ele fala direto com a API v3 da Tiny (credenciais diferentes, TINY_CLIENT_ID/SECRET/REFRESH_TOKEN). Gravar neste arquivo não teria efeito na página real enquanto isso estiver assim.";
  }
  return `src/lib/data/products.ts (MockProductRepository, DATA_SOURCE="${raw}") — mesmo arquivo que este script grava.`;
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const force = args.includes("--force");
const tinyProductId = args.find((a) => !a.startsWith("--")) ?? "744931523";

function nextId(existing: Product[]): string {
  let max = 0;
  for (const p of existing) {
    const match = /^p-(\d+)$/.exec(p.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `p-${String(max + 1).padStart(2, "0")}`;
}

/** Imprime exatamente os campos pedidos: ID Tiny, SKU, Nome, array
 * completo de images, e quantidade — usado antes E depois de gravar,
 * para comparação lado a lado no terminal. */
function printProductSnapshot(label: string, product: Pick<Product, "id" | "sku" | "name" | "images"> & { externalRef?: Product["externalRef"] }) {
  console.log(`\n--- ${label} ---`);
  console.log(`ID:            ${product.id}`);
  console.log(`ID Tiny:       ${product.externalRef?.id ?? "(nenhum)"}`);
  console.log(`SKU:           ${product.sku ?? "(nenhum)"}`);
  console.log(`Nome:          ${product.name}`);
  console.log(`images[]:      ${JSON.stringify(product.images)}`);
  console.log(`Qtd. imagens:  ${product.images.length}`);
}

/**
 * Relê o produto DIRETO DO ARQUIVO em disco — sem importar/executar
 * nada, sem subprocesso, portanto sem nenhuma dependência de como
 * `npx`/`tsx` são resolvidos no PATH do sistema operacional (a causa
 * do `spawnSync npx ENOENT` no Windows: lá o executável real é
 * `npx.cmd`, e chamar "npx" sem `shell: true` não resolve isso).
 *
 * Em vez de reimportar o módulo TypeScript (o que exigiria executar
 * código — e já confirmamos antes, testando de verdade, que um
 * `import()` com cache-busting não força uma releitura real neste
 * ambiente), lemos o TEXTO bruto do arquivo (`fs.readFileSync`, sempre
 * uma leitura nova, nunca cacheada) e extraímos o bloco do produto
 * pelo `slug`, com contagem de chaves para respeitar objetos
 * aninhados (`externalRef`, `dimensions`, etc.) — sem nunca precisar
 * rodar o arquivo como código.
 */
function readPersistedProductFromDisk(
  slug: string
): { id: string; sku?: string; name: string; images: string[]; externalRef?: { source: string; id: string } } | undefined {
  const fileText = readFileSync(PRODUCTS_FILE_PATH, "utf-8");

  const marker = `slug: ${JSON.stringify(slug)}`;
  const markerIndex = fileText.indexOf(marker);
  if (markerIndex === -1) return undefined;

  // Volta até o "{" que abre o objeto deste produto.
  let start = markerIndex;
  while (start > 0 && fileText[start] !== "{") start--;
  if (fileText[start] !== "{") return undefined;

  // Avança contando profundidade de chaves até achar o "}" que fecha
  // ESTE objeto (não um objeto aninhado como externalRef/dimensions).
  let depth = 0;
  let end = -1;
  for (let i = start; i < fileText.length; i++) {
    if (fileText[i] === "{") depth++;
    else if (fileText[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return undefined;

  const block = fileText.slice(start, end + 1);

  function extractString(field: string): string | undefined {
    const m = block.match(new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    return m ? JSON.parse(`"${m[1]}"`) : undefined;
  }
  function extractArray(field: string): string[] {
    const m = block.match(new RegExp(`${field}:\\s*(\\[[^\\]]*\\])`));
    if (!m) return [];
    try {
      return JSON.parse(m[1]);
    } catch {
      return [];
    }
  }

  const id = extractString("id");
  const name = extractString("name");
  if (!id || !name) return undefined;

  const externalRefMatch = block.match(/externalRef:\s*\{\s*source:\s*"([^"]*)",\s*id:\s*"([^"]*)"/);
  const externalRef = externalRefMatch ? { source: externalRefMatch[1], id: externalRefMatch[2] } : undefined;

  return { id, sku: extractString("sku"), name, images: extractArray("images"), externalRef };
}

/** O resumo final pedido — nome, SKU, preço, imagens, estoque,
 * variações, e quais campos serão criados/alterados. */
function printPreWriteSummary(product: Product, existingMatch: ReturnType<typeof findExistingProduct>) {
  console.log("\n" + "=".repeat(60));
  console.log("RESUMO ANTES DE GRAVAR");
  console.log("=".repeat(60));
  console.log(`Nome:       ${product.name}`);
  console.log(`SKU:        ${product.sku ?? "(nenhum)"}`);
  console.log(
    `Preço:      R$ ${product.price.toFixed(2)}${product.compareAtPrice ? ` (de R$ ${product.compareAtPrice.toFixed(2)})` : ""}`
  );
  console.log(
    `Imagens:    ${product.images.length > 0 ? product.images.join(", ") : "nenhuma (placeholder será exibido)"}`
  );
  console.log(`Estoque:    ${product.stock}`);
  console.log(
    `Variações:  ${
      product.variants?.length
        ? `${product.variants.length} — ${product.variants.map((v) => v.label).join(", ")}`
        : "nenhuma"
    }`
  );
  console.log(`ID Tiny:    ${product.externalRef?.id}`);

  if (existingMatch) {
    const diffs = diffProductFields(existingMatch.product, product);
    console.log(
      `\nAção: ATUALIZAR produto existente (id: ${existingMatch.product.id}, encontrado por: ${existingMatch.matchedBy})`
    );
    if (diffs.length > 0) {
      console.log("Campos que serão alterados:");
      for (const d of diffs) {
        console.log(`  - ${d.field}: ${JSON.stringify(d.currentValue)} → ${JSON.stringify(d.incomingValue)}`);
      }
    } else {
      console.log("Nenhum campo mudou — gravação não alteraria nada.");
    }
  } else {
    console.log("\nAção: CRIAR produto novo (nenhuma correspondência no catálogo atual)");
  }
  console.log("=".repeat(60));
}

/** Exige que a pessoa digite o ID da Tiny exatamente, como segunda
 * confirmação explícita antes de qualquer escrita — além do --apply. */
async function confirmTinyId(expectedId: string): Promise<boolean> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(
      `\nDigite o ID da Tiny (${expectedId}) para confirmar e prosseguir com a gravação, ou qualquer outra coisa para cancelar: `
    );
    return answer.trim() === expectedId;
  } finally {
    rl.close();
  }
}

async function main() {
  console.log(`=== Gravação controlada — produto Tiny v2 #${tinyProductId} ===\n`);

  const connection = await testTinyV2Connection(tinyProductId);
  if (connection.kind !== "success") {
    console.log(`❌ Não foi possível buscar o produto (${connection.kind}).`);
    process.exit(1);
  }

  const mapping = mapTinyV2ProductToDomain(connection.product as TinyV2ProductPayload);
  const { product: builtProduct, fallbacksUsed, blockers } = buildWritableProduct(mapping, tinyProductId);

  if (blockers.length > 0) {
    console.log("❌ Não é possível gravar — faltam campos obrigatórios:");
    for (const b of blockers) console.log(`   - ${b}`);
    process.exit(1);
  }

  console.log("\nResolvendo imagens (v2 → varredura ampla → chamada complementar v3, se disponível)...");
  const imageResolution = await resolveProductImages(tinyProductId, mapping);
  console.log(`Fonte das imagens: ${imageResolution.source}`);
  console.log(`  ${imageResolution.note}`);
  if (imageResolution.validations.length > 0) {
    console.log("  Acessibilidade (sem login):");
    for (const v of imageResolution.validations) {
      console.log(`    - ${v.url}: ${v.accessible ? `✅ acessível (HTTP ${v.status})` : `❌ inacessível${v.status ? ` (HTTP ${v.status})` : ""}${v.error ? ` — ${v.error}` : ""}`}`);
    }
  }

  const product: Product = { ...builtProduct, images: imageResolution.urls };

  if (fallbacksUsed.length > 0) {
    console.log("\n⚠️  Usando fallback para os seguintes campos (Tiny não os retornou):");
    for (const f of fallbacksUsed) console.log(`   - ${f}`);
  }

  const existingMatch = findExistingProduct(currentProducts, product);
  const fieldDiffs = existingMatch ? diffProductFields(existingMatch.product, product) : [];

  printPreWriteSummary(product, existingMatch);

  if (existingMatch && fieldDiffs.length > 0) {
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
  }

  if (!apply) {
    console.log("\nModo pré-visualização — nada foi escrito. Rode com --apply para gravar.");
    return;
  }

  if (existingMatch && fieldDiffs.length === 0) {
    console.log("\n✅ Produto já está idêntico ao catálogo — nada para gravar.");
    return;
  }

  const confirmed = await confirmTinyId(tinyProductId);
  if (!confirmed) {
    console.log("\n❌ Confirmação não recebida (ID digitado não bateu) — gravação cancelada, nada foi escrito.");
    process.exit(1);
  }

  const outDir = join(process.cwd(), "import-preview");
  mkdirSync(outDir, { recursive: true });

  const finalId = existingMatch?.product.id ?? nextId(currentProducts);
  const finalProduct: Product = { ...product, id: finalId };

  console.log(`\nAÇÃO: ${existingMatch ? "UPDATE" : "CREATE"}`);
  if (existingMatch) {
    console.log(`  (produto existente encontrado por: ${existingMatch.matchedBy}, id interno: ${existingMatch.product.id} — mesmo id será reaproveitado, nenhuma duplicata será criada)`);
  }
  console.log(`ARQUIVO ALTERADO: ${PRODUCTS_FILE_PATH}`);
  console.log(`IMAGENS ANTES: ${JSON.stringify(existingMatch?.product.images ?? [])}`);

  printProductSnapshot("ANTES DE GRAVAR (objeto que será persistido)", finalProduct);

  const bySlug = new Map(currentProducts.map((p) => [p.slug, p] as const));
  if (existingMatch) bySlug.delete(existingMatch.product.slug);
  bySlug.set(finalProduct.slug, finalProduct);

  const fileContents = buildCatalogFileContents(
    Array.from(bySlug.values()),
    `// Produto #${tinyProductId} gravado via scripts/sync-tiny-v2-product.ts\n// (Tiny API v2) — ver docs/features/tiny-v2-single-product-write.md.\n// Gravação controlada de UM produto, confirmada interativamente —\n// os demais produtos do catálogo não foram tocados.`
  );

  writeFileSync(PRODUCTS_FILE_PATH, fileContents, "utf-8");
  console.log(`\n✅ Catálogo atualizado — produto "${finalProduct.name}" (id: ${finalId}) gravado.`);

  console.log("\nRelendo o produto DIRETO DO ARQUIVO em disco (leitura de texto pura, sem subprocesso, sem importar código)...");
  const persisted = readPersistedProductFromDisk(finalProduct.slug);
  if (!persisted) {
    console.log("❌ ALERTA: o produto não foi encontrado ao reler o arquivo gravado — algo está errado na escrita.");
    process.exit(1);
  }
  console.log(`IMAGENS DEPOIS: ${JSON.stringify(persisted.images)}`);
  printProductSnapshot("DEPOIS DE GRAVAR (lido de volta do arquivo)", persisted);

  const imagesMatch = JSON.stringify(persisted.images) === JSON.stringify(finalProduct.images);
  const noDuplicate = !currentProducts.some(
    (p) => p.slug !== existingMatch?.product.slug && p.externalRef?.source === "tiny" && p.externalRef?.id === tinyProductId
  );
  console.log(
    `\n${imagesMatch ? "✅" : "❌"} Array de imagens persistido ${imagesMatch ? "bate exatamente" : "NÃO bate"} com o que foi gravado.`
  );
  console.log(`${noDuplicate ? "✅" : "❌"} Nenhuma duplicata para este ID Tiny no catálogo (verificado antes da escrita).`);

  console.log(`\nFONTE LIDA PELO FRONTEND: ${describeFrontendDataSource()}`);

  if (imagesMatch && persisted.images.length === 4) {
    console.log(
      "\n✅ As 4 URLs estão persistidas corretamente no arquivo. Se a página ainda não mostrar as fotos:" +
        "\n   - confirme que DATA_SOURCE não está como \"tiny\" (ver mensagem acima)" +
        "\n   - a rota /produto/[slug] usa revalidate=60 (ISR) — a primeira visita após gravar pode ainda mostrar" +
        " o HTML antigo; rode `npm run build` de novo para ver a mudança na hora, ou espere até 60s."
    );
  }

  console.log("\nRode `npm run lint`, `npm test` e `npm run build` para validar antes de commitar.");
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
