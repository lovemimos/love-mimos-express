#!/usr/bin/env tsx
/**
 * Comando de teste/diagnóstico da integração com a Tiny.
 *
 * Uso:
 *   npm run test:tiny-connection -- <idProdutoTiny>
 *
 * O que faz:
 *   1. Valida a autenticação (testAuthentication).
 *   2. Busca o produto pelo ID e imprime o JSON completo, cru — sem
 *      nenhum mapeamento para o domínio.
 *   3. Grava um log detalhado em import-preview/.
 *
 * Este comando NUNCA escreve no catálogo da aplicação — é só
 * diagnóstico. Para sincronizar de verdade, ver
 * `npm run sync:tiny-product` (docs/features/tiny-single-product-sync.md).
 *
 * Nunca loga TINY_CLIENT_SECRET/TINY_REFRESH_TOKEN nem o access_token
 * obtido — só o resultado (sucesso/falha) da autenticação, igual ao
 * resto do código de integração (ver src/lib/repositories/tiny/logger.ts).
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tinyIntegrationService } from "../src/lib/repositories/tiny/tiny-integration-service";

const tinyProductId = process.argv[2];

if (!tinyProductId) {
  console.error("Uso: npm run test:tiny-connection -- <idProdutoTiny>");
  process.exit(1);
}

type DiagnosticLog = {
  timestamp: string;
  tinyProductId: string;
  auth: { ok: boolean; durationMs: number; kind?: string; message?: string };
  product: { found: boolean; durationMs: number; raw?: unknown; error?: string };
};

async function main() {
  const timestamp = new Date().toISOString();
  console.log(`=== Teste de conexão com a Tiny — ${timestamp} ===\n`);

  console.log("1. Validando autenticação...");
  const authResult = await tinyIntegrationService.testAuthentication();
  const log: DiagnosticLog = {
    timestamp,
    tinyProductId: tinyProductId!,
    auth: authResult.ok
      ? { ok: true, durationMs: authResult.durationMs }
      : { ok: false, durationMs: authResult.durationMs, kind: authResult.kind, message: authResult.message },
    product: { found: false, durationMs: 0 },
  };

  if (!authResult.ok) {
    console.log(`❌ Falha na autenticação (${authResult.kind}): ${authResult.message}`);
    console.log("   Verifique TINY_CLIENT_ID / TINY_CLIENT_SECRET / TINY_REFRESH_TOKEN.");
    writeLog(log);
    process.exit(1);
  }
  console.log(`✅ Autenticação OK (${authResult.durationMs}ms)\n`);

  console.log(`2. Buscando produto #${tinyProductId}...`);
  const startedAt = Date.now();
  try {
    const raw = await tinyIntegrationService.getProductById(tinyProductId!);
    const durationMs = Date.now() - startedAt;
    log.product = { found: true, durationMs, raw };

    console.log(`✅ Produto encontrado (${durationMs}ms)\n`);
    console.log("--- JSON completo retornado pela Tiny ---");
    console.log(JSON.stringify(raw, null, 2));
    console.log("\n--- Chaves de topo (para conferir campos ainda não mapeados, ex.: marca) ---");
    console.log(Object.keys(raw as object).join(", "));
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : "erro desconhecido";
    log.product = { found: false, durationMs, error: message };
    console.log(`❌ Falha ao buscar o produto (${durationMs}ms): ${message}`);
    writeLog(log);
    process.exit(1);
  }

  writeLog(log);
}

function writeLog(log: DiagnosticLog) {
  const outDir = join(process.cwd(), "import-preview");
  mkdirSync(outDir, { recursive: true });
  const safeTimestamp = log.timestamp.replace(/[:.]/g, "-");
  const logPath = join(outDir, `tiny-connection-test-${safeTimestamp}.json`);
  writeFileSync(logPath, JSON.stringify(log, null, 2), "utf-8");
  console.log(`\nLog detalhado salvo em: ${logPath}`);
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
