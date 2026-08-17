// @ts-nocheck
import { loadEnvConfig } from "@next/env";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";

loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });

const token = process.env.TINY_API_TOKEN;
if (!token) throw new Error("TINY_API_TOKEN ausente");

const DELAY_MS = 800;
const CHECKPOINT_FILE = "./reports/tiny-sync-checkpoint.json";
const REPORT_FILE = "./reports/tiny-sync-final.json";
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function tiny(endpoint: string, data: Record<string, string>) {
  const body = new URLSearchParams({ token, formato: "JSON", ...data });
  const res = await fetch(`https://api.tiny.com.br/api2/${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Tiny HTTP ${res.status}`);
  return res.json();
}

async function collectAllActiveIds(): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  console.log("Coletando produtos ativos...");
  while (true) {
    const json: any = await tiny("produtos.pesquisa.php", {
      pagina: String(page),
      situacao: "A",
    });
    const retorno = json?.retorno;
    if (retorno?.status === "Erro") {
      if (retorno?.codigo_erro === 20) break;
      throw new Error(JSON.stringify(retorno));
    }
    const produtos = retorno?.produtos ?? [];
    if (!produtos.length) break;
    for (const item of produtos) {
      const id = item?.produto?.id;
      if (id) ids.push(String(id));
    }
    console.log(`Pagina ${page}: ${produtos.length}`);
    if (produtos.length < 100) break;
    page++;
    await sleep(DELAY_MS);
  }
  return [...new Set(ids)];
}

async function loadCheckpoint() {
  try {
    return JSON.parse(await fs.readFile(CHECKPOINT_FILE, "utf8"));
  } catch {
    return { completed: [], failed: [], startedAt: new Date().toISOString() };
  }
}

async function saveCheckpoint(data: any) {
  await fs.mkdir("./reports", { recursive: true });
  await fs.writeFile(CHECKPOINT_FILE, JSON.stringify(data, null, 2), "utf8");
}

function runSync(id: string) {
  return new Promise<{ id: string; ok: boolean; output: string }>((resolve) => {
    const command = `npx tsx --conditions=react-server "./scripts/sync-tiny-v2-to-db.ts" ${id}`;
    const child = spawn(command, { cwd: process.cwd(), shell: true });
    let output = "";
    child.stdout.on("data", data => { const text = data.toString(); output += text; process.stdout.write(text); });
    child.stderr.on("data", data => { const text = data.toString(); output += text; process.stderr.write(text); });
    child.on("close", code => resolve({ id, ok: code === 0 && output.includes("SYNC_OK"), output }));
  });
}

async function main() {
  console.log("\n======================================");
  console.log(" LOVE MIMOS - SYNC COMPLETO TINY");
  console.log("======================================");
  await fs.mkdir("./reports", { recursive: true });
  const ids = await collectAllActiveIds();
  console.log(`\nTOTAL ATIVOS: ${ids.length}`);
  const checkpoint = await loadCheckpoint();
  const completed = new Set<string>(checkpoint.completed ?? []);
  const failures = new Map<string, string>((checkpoint.failed ?? []).map((x: any) => [x.id, x.output]));
  const pending = ids.filter(id => !completed.has(id));
  console.log(`JA CONCLUIDOS: ${completed.size}`);
  console.log(`PENDENTES: ${pending.length}`);

  for (const id of pending) {
    console.log(`\n===== ${completed.size + 1}/${ids.length} | Tiny ${id} =====`);
    const result = await runSync(id);
    if (result.ok) {
      completed.add(id);
      failures.delete(id);
      console.log(`OK Tiny ${id}`);
    } else {
      failures.set(id, result.output.slice(-4000));
      console.log(`ERRO Tiny ${id}`);
    }
    await saveCheckpoint({
      startedAt: checkpoint.startedAt,
      updatedAt: new Date().toISOString(),
      totalCatalog: ids.length,
      completed: [...completed],
      failed: [...failures.entries()].map(([id, output]) => ({ id, output })),
    });
    await sleep(DELAY_MS);
  }

  const report = {
    startedAt: checkpoint.startedAt,
    finishedAt: new Date().toISOString(),
    totalCatalog: ids.length,
    success: completed.size,
    failed: failures.size,
    failures: [...failures.entries()].map(([id, output]) => ({ id, output })),
  };
  await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), "utf8");

  console.log("\n======================================");
  console.log(" RESULTADO FINAL");
  console.log("======================================");
  console.log(`TOTAL: ${ids.length}`);
  console.log(`OK: ${completed.size}`);
  console.log(`ERROS: ${failures.size}`);
  console.log(`RELATORIO: ${REPORT_FILE}`);
  console.log(`CHECKPOINT: ${CHECKPOINT_FILE}`);
  console.log(failures.size === 0 ? "SYNC COMPLETO APROVADO." : "SYNC CONCLUIDO COM PENDENCIAS.");
  if (failures.size > 0) process.exitCode = 1;
}

main().catch(err => {
  console.error("SYNC_CATALOG_FATAL_ERROR");
  console.error(err);
  process.exit(1);
});

