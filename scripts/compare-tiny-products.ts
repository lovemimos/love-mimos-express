#!/usr/bin/env tsx
/**
 * Compara o JSON bruto de DOIS produtos da Tiny — pensado
 * especificamente para o caso "a maioria funciona, um produto não":
 * mostra os dois payloads lado a lado e destaca automaticamente
 * qualquer diferença nos campos relacionados a estoque/depósito.
 *
 * Uso:
 *   npm run compare-tiny-products -- <idFuncionando> <idComProblema>
 *
 * Exemplo:
 *   npm run compare-tiny-products -- <id-do-Misturador-de-Cola> 744931523
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { testTinyV2Connection } from "../src/lib/repositories/tiny/tiny-v2-connection-test";

const [idA, idB] = process.argv.slice(2);

if (!idA || !idB) {
  console.error("Uso: npm run compare-tiny-products -- <idProdutoQueFunciona> <idProdutoComProblema>");
  process.exit(1);
}

const STOCK_RELATED_KEYS = ["estoque", "deposito", "depositos", "saldo", "quantidade", "atual", "disponivel"];

function collectKeys(obj: unknown, prefix = "", into: Record<string, unknown> = {}): Record<string, unknown> {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    if (prefix) into[prefix] = obj;
    return into;
  }
  if (Array.isArray(obj)) {
    into[prefix || "(raiz)"] = `[array com ${obj.length} item(ns)]`;
    obj.forEach((item, i) => collectKeys(item, `${prefix}[${i}]`, into));
    return into;
  }
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      collectKeys(value, path, into);
    } else {
      into[path] = value;
    }
  }
  return into;
}

function isStockRelated(path: string): boolean {
  const lower = path.toLowerCase();
  return STOCK_RELATED_KEYS.some((k) => lower.includes(k));
}

async function fetchRaw(id: string): Promise<unknown> {
  const result = await testTinyV2Connection(id);
  if (result.kind !== "success") {
    console.log(`❌ Não foi possível buscar o produto ${id} (${result.kind}).`);
    process.exit(1);
  }
  return result.product;
}

async function main() {
  console.log(`=== Comparando produto "que funciona" (#${idA}) vs. "com problema" (#${idB}) ===\n`);

  const [rawA, rawB] = await Promise.all([fetchRaw(idA), fetchRaw(idB)]);

  const keysA = collectKeys(rawA);
  const keysB = collectKeys(rawB);

  const allPaths = Array.from(new Set([...Object.keys(keysA), ...Object.keys(keysB)])).sort();

  console.log("--- Todos os campos relacionados a estoque/depósito, lado a lado ---\n");
  const stockPaths = allPaths.filter(isStockRelated);
  if (stockPaths.length === 0) {
    console.log("Nenhum campo com nome relacionado a estoque/depósito encontrado em nenhum dos dois payloads.");
  } else {
    for (const path of stockPaths) {
      const valueA = keysA[path];
      const valueB = keysB[path];
      const differs = JSON.stringify(valueA) !== JSON.stringify(valueB);
      const bothPresent = path in keysA && path in keysB;
      console.log(`${differs ? "⚠️ " : "   "}${path}`);
      console.log(`     #${idA} (funciona):     ${path in keysA ? JSON.stringify(valueA) : "(campo ausente)"}`);
      console.log(`     #${idB} (com problema): ${path in keysB ? JSON.stringify(valueB) : "(campo ausente)"}`);
      if (!bothPresent) console.log("     ⚠️  este campo existe em um payload e não no outro — provável causa raiz");
      console.log("");
    }
  }

  console.log("--- Todos os outros campos que diferem entre os dois (contexto adicional) ---\n");
  const otherDiffs = allPaths.filter(
    (p) => !isStockRelated(p) && JSON.stringify(keysA[p]) !== JSON.stringify(keysB[p])
  );
  if (otherDiffs.length === 0) {
    console.log("Nenhuma outra diferença estrutural encontrada.");
  } else {
    for (const path of otherDiffs) {
      console.log(`   ${path}: #${idA}=${JSON.stringify(keysA[path])} | #${idB}=${JSON.stringify(keysB[path])}`);
    }
  }

  const outDir = join(process.cwd(), "import-preview");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `compare-${idA}-vs-${idB}.json`);
  writeFileSync(outPath, JSON.stringify({ [idA]: rawA, [idB]: rawB }, null, 2), "utf-8");
  console.log(`\nJSON bruto completo dos dois produtos salvo em: ${outPath}`);
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
