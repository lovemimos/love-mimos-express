import "server-only";

/**
 * Single place responsible for every log line the Tiny integration
 * emits. Centralizing this (instead of scattering `console.*` calls
 * across tiny-client.ts/tiny-product-repository.ts) makes the "never log
 * a secret" rule enforceable by reading one file, and keeps the log
 * format consistent enough to grep/alert on in production.
 *
 * Every function here takes only non-sensitive, already-safe values
 * (paths, durations, counts, error *kinds*) — never a header, a token,
 * or a raw response/request body.
 */

const PREFIX = "[tiny]";

export function logConnectionStart(operation: string): void {
  console.info(`${PREFIX} iniciando conexão (${operation})`);
}

export function logAuthSuccess(durationMs: number): void {
  console.info(`${PREFIX} autenticação renovada com sucesso (${durationMs}ms)`);
}

export function logAuthFailure(reason: string, durationMs: number): void {
  console.error(`${PREFIX} falha de autenticação (${reason}, ${durationMs}ms)`);
}

export function logRequest(path: string, durationMs: number, status: number): void {
  console.info(`${PREFIX} GET ${path} -> HTTP ${status} (${durationMs}ms)`);
}

export function logRecordCount(operation: string, count: number): void {
  console.info(`${PREFIX} ${operation} retornou ${count} registro(s)`);
}

export function logTimeout(path: string, durationMs: number): void {
  console.error(`${PREFIX} timeout em ${path} (${durationMs}ms)`);
}

export function logNetworkError(path: string, durationMs: number): void {
  console.error(`${PREFIX} erro de rede em ${path} (${durationMs}ms)`);
}

export function logRetry(path: string, attempt: number, maxAttempts: number, reason: string): void {
  console.warn(`${PREFIX} tentativa ${attempt}/${maxAttempts} para ${path} após ${reason} — tentando novamente`);
}

export function logRateLimitLow(remaining: string, limit: string | null): void {
  console.warn(`${PREFIX} rate limit quase esgotado: ${remaining}/${limit ?? "?"} restantes neste minuto`);
}

export function logFallback(operation: string, reason: string): void {
  console.error(`${PREFIX} ${operation} falhou (${reason}) — usando catálogo mock como fallback`);
}
