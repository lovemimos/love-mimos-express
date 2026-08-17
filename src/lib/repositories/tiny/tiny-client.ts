import "server-only";
import { tinyEnv } from "@/lib/env";
import { TinyApiError } from "@/lib/repositories/tiny/tiny-client-errors";
import { withTinyRetry } from "@/lib/repositories/tiny/retry";
import {
  logConnectionStart,
  logAuthSuccess,
  logAuthFailure,
  logRequest,
  logTimeout,
  logNetworkError,
  logRateLimitLow,
} from "@/lib/repositories/tiny/logger";

export { TinyApiError };

const TOKEN_URL = "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/token";
const API_BASE_URL = "https://api.tiny.com.br/public-api/v3";

type TokenState = {
  accessToken: string;
  expiresAt: number; // epoch ms
};

/**
 * Minimal OAuth2 client for the Tiny ERP API v3.
 *
 * Real flow (see docs/API_TINY.md §2): the *first* refresh_token has to
 * be obtained via an interactive authorization_code grant (a human logs
 * in once in a browser). This client only ever does the *refresh_token*
 * grant — it never does the interactive authorization step — and holds
 * the resulting access_token in memory for the life of the server
 * process. Access tokens last ~4h per Tiny's docs; this client refreshes
 * proactively a little before expiry.
 */
class TinyClient {
  private tokenState: TokenState | null = null;
  private refreshInFlight: Promise<TokenState> | null = null;

  private async refreshAccessToken(): Promise<TokenState> {
    const startedAt = Date.now();
    logConnectionStart("renovação de token");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), tinyEnv.requestTimeoutMs);

    try {
      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: tinyEnv.clientId,
          client_secret: tinyEnv.clientSecret,
          refresh_token: tinyEnv.refreshToken,
        }),
        signal: controller.signal,
      });

      const durationMs = Date.now() - startedAt;

      if (!response.ok) {
        // Never log response body here — token endpoints echo back
        // request context that can include credential fragments.
        logAuthFailure(`HTTP ${response.status}`, durationMs);
        throw new TinyApiError(
          "Falha ao renovar o token de acesso da Tiny",
          "auth",
          response.status
        );
      }

      const body = (await response.json()) as {
        access_token: string;
        expires_in: number; // seconds
      };

      logAuthSuccess(durationMs);

      return {
        accessToken: body.access_token,
        // Refresh 60s before actual expiry to avoid using a token that
        // expires mid-request.
        expiresAt: Date.now() + (body.expires_in - 60) * 1000,
      };
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      if (err instanceof TinyApiError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        logAuthFailure("timeout", durationMs);
        throw new TinyApiError("Timeout ao renovar token da Tiny", "timeout");
      }
      logAuthFailure("erro de rede", durationMs);
      throw new TinyApiError("Erro de rede ao autenticar na Tiny", "network");
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenState && this.tokenState.expiresAt > now) {
      return this.tokenState.accessToken;
    }

    // Coalesce concurrent refreshes into a single in-flight request —
    // several requests hitting an expired token at once shouldn't each
    // trigger their own token refresh. Retry for this specific call is
    // intentionally NOT wrapped here — `get()`'s outer `withTinyRetry`
    // already retries the whole `getOnce()` (token + data) as one unit;
    // wrapping both layers would compound into up to 3×3 attempts on a
    // sustained failure instead of 3.
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.refreshAccessToken().finally(() => {
        this.refreshInFlight = null;
      });
    }

    this.tokenState = await this.refreshInFlight;
    return this.tokenState.accessToken;
  }

  /**
   * Performs an authenticated GET against the Tiny API v3, with timeout,
   * retry (for transient failures — see retry.ts), and rate-limit header
   * parsing. Never logs the Authorization header or any credential
   * value.
   */
  async get<T>(path: string, searchParams?: Record<string, string | number | undefined>): Promise<T> {
    return withTinyRetry(path, () => this.getOnce<T>(path, searchParams));
  }

  private async getOnce<T>(
    path: string,
    searchParams?: Record<string, string | number | undefined>
  ): Promise<T> {
    const token = await this.getAccessToken();

    const url = new URL(`${API_BASE_URL}${path}`);
    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), tinyEnv.requestTimeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const durationMs = Date.now() - startedAt;

      const remaining = response.headers.get("X-RateLimit-Remaining");
      const limit = response.headers.get("X-RateLimit-Limit");
      if (remaining !== null && Number(remaining) <= 5) {
        logRateLimitLow(remaining, limit);
      }

      if (response.status === 401 || response.status === 403) {
        logRequest(path, durationMs, response.status);
        throw new TinyApiError(
          "Tiny recusou a autenticação/permissão para este recurso",
          "auth",
          response.status
        );
      }

      if (!response.ok) {
        logRequest(path, durationMs, response.status);
        throw new TinyApiError(
          `Tiny retornou um erro HTTP ${response.status}`,
          "http",
          response.status
        );
      }

      logRequest(path, durationMs, response.status);
      return (await response.json()) as T;
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      if (err instanceof TinyApiError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        logTimeout(path, durationMs);
        throw new TinyApiError(`Timeout ao chamar ${path}`, "timeout");
      }
      logNetworkError(path, durationMs);
      throw new TinyApiError(`Erro de rede ao chamar ${path}`, "network");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const tinyClient = new TinyClient();
