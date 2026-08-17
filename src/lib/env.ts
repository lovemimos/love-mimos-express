import "server-only";

/**
 * Central place that reads process.env for the data-layer config.
 * Marked `server-only` on purpose: if any Client Component ever imports
 * this (even transitively), the build fails immediately instead of
 * silently bundling credentials. See docs/ARCHITECTURE.md.
 */

export type DataSource = "mock" | "tiny";

function readDataSource(): DataSource {
  const raw = process.env.DATA_SOURCE?.trim().toLowerCase();
  if (raw === "tiny") return "tiny";
  return "mock"; // default — always safe, never requires credentials
}

export const dataSourceConfig = {
  source: readDataSource(),
};

export const isProduction = process.env.NODE_ENV === "production";

export const tinyEnv = {
  clientId: process.env.TINY_CLIENT_ID ?? "",
  clientSecret: process.env.TINY_CLIENT_SECRET ?? "",
  refreshToken: process.env.TINY_REFRESH_TOKEN ?? "",
  get requestTimeoutMs() {
    return resolveRequestTimeoutMs();
  },
};

export type EnvValidationResult =
  | { ok: true }
  | { ok: false; missing: string[]; invalid: string[]; message: string };

const PLACEHOLDER_VALUES = new Set([
  "changeme",
  "change_me",
  "your_client_id",
  "your_client_secret",
  "your_refresh_token",
  "xxx",
  "xxxx",
  "todo",
  "test",
]);

/**
 * A credential is "invalid" (as opposed to simply missing) when it's
 * present but obviously wrong: contains whitespace (a common copy-paste
 * mistake), is suspiciously short for an OAuth2 client id/secret/token,
 * or matches a well-known placeholder string people sometimes leave in
 * by accident. This can never be a definitive check (we don't have
 * Tiny's exact format spec), but it catches the mistakes that would
 * otherwise surface as a confusing 401 with no clue why.
 */
function looksInvalid(value: string): boolean {
  if (!value) return false; // handled separately as "missing"
  if (/\s/.test(value)) return true;
  if (value.length < 8) return true;
  if (PLACEHOLDER_VALUES.has(value.trim().toLowerCase())) return true;
  return false;
}

/**
 * Centralized validation for the Tiny credentials. Deliberately reports
 * only variable NAMES, never values — this result is safe to log or to
 * include in an internal status object (see
 * src/lib/repositories/tiny/status.ts) without any risk of leaking a
 * credential, even a fragment of one.
 */
export function validateTinyEnv(): EnvValidationResult {
  const missing: string[] = [];
  const invalid: string[] = [];

  const fields: [string, string][] = [
    ["TINY_CLIENT_ID", tinyEnv.clientId],
    ["TINY_CLIENT_SECRET", tinyEnv.clientSecret],
    ["TINY_REFRESH_TOKEN", tinyEnv.refreshToken],
  ];

  for (const [name, value] of fields) {
    if (!value) missing.push(name);
    else if (looksInvalid(value)) invalid.push(name);
  }

  if (missing.length === 0 && invalid.length === 0) return { ok: true };

  const parts: string[] = [];
  if (missing.length > 0) parts.push(`ausente(s): ${missing.join(", ")}`);
  if (invalid.length > 0) parts.push(`com formato suspeito (curto demais, com espaço, ou placeholder): ${invalid.join(", ")}`);

  return {
    ok: false,
    missing,
    invalid,
    message:
      `Configuração da Tiny incompleta ou inválida — ${parts.join("; ")}. ` +
      "Configure-as em .env (nunca em arquivo versionado) — ver .env.example.",
  };
}

/**
 * `TINY_REQUEST_TIMEOUT_MS` is optional (has a safe default), so an
 * invalid value here is a warning, not a blocking error — this returns
 * the value to use, falling back to the default and logging why if the
 * configured value doesn't make sense.
 */
export function resolveRequestTimeoutMs(): number {
  const raw = process.env.TINY_REQUEST_TIMEOUT_MS;
  const DEFAULT_MS = 8000;
  if (!raw) return DEFAULT_MS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(
      `[config] TINY_REQUEST_TIMEOUT_MS="${raw}" não é um número positivo válido — usando o padrão de ${DEFAULT_MS}ms.`
    );
    return DEFAULT_MS;
  }
  return parsed;
}
