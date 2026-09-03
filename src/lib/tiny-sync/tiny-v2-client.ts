import "server-only";

import type { TinyV2ProductPayload } from "@/lib/repositories/tiny/tiny-v2-mapper";

const BASE_URL = "https://api.tiny.com.br/api2";
// The configured Tiny account enforces the 30 requests/minute tier.
const MIN_INTERVAL_MS = 2100;
let nextRequestAt = 0;
let requestQueue = Promise.resolve();

type TinyEnvelope = { retorno?: { status?: string; codigo_erro?: number | string; erros?: { erro?: string }[]; produto?: TinyV2ProductPayload; produtos?: { produto?: TinyV2ProductPayload }[]; numero_paginas?: number } };

function errorMessage(json: TinyEnvelope): string {
  return json.retorno?.erros?.map((item) => item.erro).filter(Boolean).join("; ") || `Tiny API error ${json.retorno?.codigo_erro ?? "unknown"}`;
}

async function throttledRequest(endpoint: string, fields: Record<string, string>): Promise<TinyEnvelope> {
  const token = process.env.TINY_API_TOKEN?.trim();
  if (!token) throw new Error("TINY_API_TOKEN is not configured");

  const execute = async () => {
    const wait = Math.max(0, nextRequestAt - Date.now());
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    nextRequestAt = Date.now() + MIN_INTERVAL_MS;

    let lastError: unknown;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        const response = await fetch(`${BASE_URL}/${endpoint}`, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token, formato: "JSON", ...fields }),
          cache: "no-store",
          signal: AbortSignal.timeout(Number(process.env.TINY_REQUEST_TIMEOUT_MS || 20_000)),
        });
        if (!response.ok) {
          const retryAfter = response.headers.get("retry-after");
          const error = new Error(`Tiny HTTP ${response.status}`) as Error & { retryAfterMs?: number };
          if (response.status === 429) {
            const seconds = Number(retryAfter);
            error.retryAfterMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 65_000;
          }
          throw error;
        }
        const json = (await response.json()) as TinyEnvelope;
        if (json.retorno?.status === "Erro") {
          const code = Number(json.retorno.codigo_erro);
          if (code === 20) return json;
          throw new Error(errorMessage(json));
        }
        return json;
      } catch (error) {
        lastError = error;
        if (attempt < 4) {
          const message = error instanceof Error ? error.message : "";
          const retryAfterMs = (error as Error & { retryAfterMs?: number })?.retryAfterMs;
          const delay = retryAfterMs ?? (/API Bloqueada|número de acessos|HTTP 429/i.test(message) ? 65_000 : 500 * 2 ** (attempt - 1));
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  };

  const result = requestQueue.then(execute, execute);
  requestQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function listTinyProducts(page: number, changedSince?: Date) {
  const fields: Record<string, string> = { pagina: String(page) };
  if (changedSince) fields.dataAlteracao = changedSince.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const json = await throttledRequest("produtos.pesquisa.php", fields);
  return {
    products: (json.retorno?.produtos ?? []).map((item) => item.produto).filter(Boolean) as TinyV2ProductPayload[],
    pages: Number(json.retorno?.numero_paginas || 0),
    end: Number(json.retorno?.codigo_erro) === 20,
  };
}

export async function getTinyProduct(id: string): Promise<TinyV2ProductPayload | null> {
  const json = await throttledRequest("produto.obter.php", { id });
  if (Number(json.retorno?.codigo_erro) === 20) return null;
  return json.retorno?.produto ?? null;
}

export async function getTinyStock(id: string): Promise<number> {
  const json = await throttledRequest("produto.obter.estoque.php", { id });
  if (Number(json.retorno?.codigo_erro) === 20) return 0;
  const product = json.retorno?.produto as Record<string, unknown> | undefined;
  const direct = Number(product?.saldo ?? 0);
  return Number.isFinite(direct) ? Math.trunc(direct) : 0;
}
