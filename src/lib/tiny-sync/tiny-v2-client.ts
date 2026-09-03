import "server-only";
import type { TinyV2ProductPayload } from "@/lib/repositories/tiny/tiny-v2-mapper";
import { batchContext, BatchPause, checkBudget, REQUEST_MS } from "./batch-context";

const BASE_URL = "https://api.tiny.com.br/api2";
const MIN_INTERVAL_MS = 2100;
let nextRequestAt = 0;
let requestQueue = Promise.resolve();
type TinyEnvelope = { retorno?: { status?: string; codigo_erro?: number | string; erros?: { erro?: string }[]; produto?: TinyV2ProductPayload; produtos?: { produto?: TinyV2ProductPayload }[]; numero_paginas?: number } };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function throttledRequest(endpoint: string, fields: Record<string, string>, sequence?: number): Promise<TinyEnvelope> {
  const context = batchContext.getStore();
  const key = JSON.stringify(sequence === undefined ? [endpoint, fields] : [endpoint, fields, sequence]);
  if (context && key in context.progress.responses) return context.progress.responses[key] as TinyEnvelope;
  const token = process.env.TINY_API_TOKEN?.trim();
  if (!token) throw new Error("TINY_API_TOKEN is not configured");
  const execute = async () => {
    for (let attempt = 1; attempt <= 4; attempt++) {
      const wait = Math.max(0, nextRequestAt - Date.now(), (context?.progress.nextRequestAt ?? 0) - Date.now());
      checkBudget(wait + REQUEST_MS + 10_000);
      if (wait) await sleep(wait);
      nextRequestAt = Date.now() + MIN_INTERVAL_MS;
      if (context) { context.progress.nextRequestAt = nextRequestAt; await context.save(); }
      let json: TinyEnvelope;
      try {
        const response = await fetch(`${BASE_URL}/${endpoint}`, {
          method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token, formato: "JSON", ...fields }),
          cache: "no-store", signal: AbortSignal.timeout(REQUEST_MS),
        });
        if (!response.ok) {
          const error = new Error(`Tiny HTTP ${response.status}`) as Error & { retryAfterMs?: number };
          if (response.status === 429) {
            const header = response.headers.get("retry-after");
            const seconds = Number(header);
            error.retryAfterMs = Math.max(65_000, Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header ?? "") - Date.now() || 0);
          }
          throw error;
        }
        json = await response.json() as TinyEnvelope;
        if (!json.retorno?.status) throw new Error("Tiny malformed response");
        if (json.retorno.status === "Erro" && Number(json.retorno.codigo_erro) !== 20) {
          const error = new Error(`Tiny API error ${Number(json.retorno.codigo_erro)}`) as Error & { retryAfterMs?: number };
          const message = json.retorno.erros?.map((item) => item.erro).join(" ") ?? "";
          if (/bloquead|acessos|limite/i.test(message)) error.retryAfterMs = 65_000;
          throw error;
        }
      } catch (error) {
        const blocked = (error as Error & { retryAfterMs?: number }).retryAfterMs;
        nextRequestAt = Math.max(nextRequestAt, Date.now() + (blocked ?? 500 * 2 ** (attempt - 1)));
        if (context) { context.progress.nextRequestAt = nextRequestAt; await context.save(); }
        if (attempt === 4) { if (blocked && context) throw new BatchPause(); throw error; }
        continue;
      }
      // DB failures are fatal, not HTTP retries. No credentials are persisted.
      if (context) { context.progress.responses[key] = json; await context.save(); }
      return json;
    }
    throw new Error("Tiny retries exhausted");
  };
  const result = requestQueue.then(execute, execute);
  requestQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function listTinyProducts(page: number, changedSince?: Date) {
  if (changedSince) throw new Error("Use the Tiny change feeds for incremental discovery");
  const fields: Record<string, string> = { pagina: String(page) };
  const json = await throttledRequest("produtos.pesquisa.php", fields);
  return { products: (json.retorno?.produtos ?? []).map((item) => item.produto).filter(Boolean) as TinyV2ProductPayload[], pages: Number(json.retorno?.numero_paginas || 0), end: Number(json.retorno?.codigo_erro) === 20 };
}
export async function listTinyChanges(kind: "produtos" | "estoque", changedSince: Date, sequence: number) {
  const date = changedSince.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour12: false }).replace(",", "");
  // These feeds consume returned records. Drain page one, caching every response
  // under a distinct durable sequence before asking for the next page.
  const json = await throttledRequest(`lista.atualizacoes.${kind}`, { dataAlteracao: date, pagina: "1" }, sequence);
  return (json.retorno?.produtos ?? []).map((item) => item.produto).filter(Boolean) as TinyV2ProductPayload[];
}
export async function getTinyProduct(id: string): Promise<TinyV2ProductPayload | null> {
  const json = await throttledRequest("produto.obter.php", { id });
  if (Number(json.retorno?.codigo_erro) === 20) return null;
  if (!json.retorno?.produto) throw new Error("Tiny missing product");
  return json.retorno.produto;
}
export async function getTinyStock(id: string): Promise<number> {
  const json = await throttledRequest("produto.obter.estoque.php", { id });
  if (Number(json.retorno?.codigo_erro) === 20) throw new Error("Tiny missing stock");
  const value = (json.retorno?.produto as Record<string, unknown> | undefined)?.saldo;
  const stock = Number(value);
  if (value === undefined || value === null || !Number.isFinite(stock)) throw new Error("Tiny invalid stock");
  return Math.trunc(stock);
}
