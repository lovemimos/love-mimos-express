import "server-only";
import { TinyApiError } from "@/lib/repositories/tiny/tiny-client-errors";
import { logRetry } from "@/lib/repositories/tiny/logger";

const MAX_ATTEMPTS = 3; // 1 tentativa original + 2 retries
const BASE_DELAY_MS = 300;

/**
 * Retries only failures that a second attempt could plausibly fix:
 * timeout, network errors, and HTTP 429/500-range (rate limit / transient
 * server error). Never retries `kind: "auth"` (401/403 — a fourth
 * attempt with the same bad credential fails the same way) or a 404
 * (the resource isn't there regardless of how many times we ask).
 *
 * Backoff is a simple fixed multiplier (300ms, 600ms) — this is a
 * request-scoped retry for a single user-facing read, not a background
 * job, so it needs to stay fast; it is not meant to out-wait a sustained
 * outage (the fallback to mock exists for that).
 */
export async function withTinyRetry<T>(path: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!shouldRetry(err) || attempt === MAX_ATTEMPTS) {
        throw err;
      }

      const reason = err instanceof TinyApiError ? describeReason(err) : "erro desconhecido";
      logRetry(path, attempt, MAX_ATTEMPTS, reason);
      await sleep(BASE_DELAY_MS * attempt);
    }
  }

  // Inalcançável na prática (o loop sempre retorna ou lança), mas
  // satisfaz o TypeScript quanto ao tipo de retorno.
  throw lastError;
}

function shouldRetry(err: unknown): boolean {
  if (!(err instanceof TinyApiError)) return false;
  if (err.kind === "timeout" || err.kind === "network") return true;
  if (err.kind === "http" && err.status && (err.status === 429 || err.status >= 500)) return true;
  return false; // "auth" (401/403) e 404 nunca são retentados
}

function describeReason(err: TinyApiError): string {
  return `${err.kind}${err.status ? ` HTTP ${err.status}` : ""}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
