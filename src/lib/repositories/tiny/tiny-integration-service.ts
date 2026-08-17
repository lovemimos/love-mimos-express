import "server-only";
import { tinyClient, TinyApiError } from "@/lib/repositories/tiny/tiny-client";
import type { TinyProductPayload } from "@/lib/repositories/tiny/tiny-mapper";

export type TinyAuthTestResult =
  | { ok: true; durationMs: number }
  | { ok: false; durationMs: number; kind: TinyApiError["kind"]; message: string };

/**
 * The single point of contact with the Tiny API — everything this
 * module does is "how do I talk to Tiny", never "what does this mean
 * for our catalog". That second question belongs entirely to
 * `tiny-mapper.ts` (Tiny payload → `Product`) and
 * `single-product-sync.ts` (comparing a mapped product against our
 * current catalog) — neither of which this file imports or knows
 * about, on purpose. `TinyIntegrationService` only ever returns raw
 * Tiny shapes (`TinyProductPayload`, etc.), never a `Product`.
 *
 * Built on top of `tiny-client.ts` (OAuth2 token handling, retry,
 * timeout, rate-limit logging — see docs/API_TINY.md) rather than
 * duplicating any of that; this class exists to give the integration a
 * clear, named, purpose-specific surface (`getProductById`,
 * `testAuthentication`) instead of every caller reaching for the
 * generic `tinyClient.get<T>(path)`.
 */
export class TinyIntegrationService {
  /**
   * Confirms the OAuth2 credentials work and the API is reachable,
   * without needing to know any specific product ID — requests a
   * single record from the lightweight listing endpoint. Never throws;
   * failures come back as `{ ok: false, kind, message }` so a caller
   * (like the test command) can report a clean pass/fail instead of
   * crashing.
   */
  async testAuthentication(): Promise<TinyAuthTestResult> {
    const startedAt = Date.now();
    try {
      await tinyClient.get("/produtos", { limit: 1, offset: 0 });
      return { ok: true, durationMs: Date.now() - startedAt };
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      if (err instanceof TinyApiError) {
        return { ok: false, durationMs, kind: err.kind, message: err.message };
      }
      return { ok: false, durationMs, kind: "network", message: "Erro inesperado ao conectar à Tiny" };
    }
  }

  /**
   * Fetches ONE product's full detail payload, exactly as Tiny returns
   * it — no mapping, no field selection. `GET /produtos/{idProduto}`
   * (see docs/API_TINY.md §3) is the only endpoint that includes
   * categoria/anexos/variações/preços/estoque all in one response.
   */
  async getProductById(id: string): Promise<TinyProductPayload> {
    return tinyClient.get<TinyProductPayload>(`/produtos/${id}`);
  }

  /**
   * Chamada complementar real e confirmada (ver docs/API_TINY.md §3):
   * `GET /produtos/{idProduto}/anexos` — endpoint dedicado de anexos/
   * imagens da API v3. Útil quando o payload principal (de qualquer
   * fonte, v2 ou v3) só trouxe IDs de anexo, sem URL utilizável.
   * Requer as credenciais v3 (TINY_CLIENT_ID/SECRET/REFRESH_TOKEN) —
   * diferente do TINY_API_TOKEN da v2.
   */
  async getProductAttachments(id: string): Promise<{ id: string; url: string; externo?: boolean }[]> {
    const response = await tinyClient.get<{
      itens?: { id: number | string; url: string | null; externo?: boolean }[];
    }>(`/produtos/${id}/anexos`);
    return (response.itens ?? [])
      .filter((item): item is { id: number | string; url: string; externo?: boolean } => Boolean(item.url))
      .map((item) => ({ id: String(item.id), url: item.url, externo: item.externo }));
  }
}

export const tinyIntegrationService = new TinyIntegrationService();
