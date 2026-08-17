import "server-only";
import { dataSourceConfig, isProduction } from "@/lib/env";

/**
 * In-memory, per-process record of the Tiny integration's health.
 *
 * This exists so the *origin* of the data being served (real Tiny vs.
 * mock fallback) is always identifiable internally, even though the
 * public API routes never expose it to the browser (see
 * docs/ARCHITECTURE_REVIEW_SPRINT_5.md item 10). There is currently no
 * route that reads this — it's meant for server logs and as the natural
 * data source for a future internal/admin status page (see
 * docs/ADMIN_PANEL.md), not a public surface.
 *
 * Deliberately stores only non-sensitive facts: timestamps and an error
 * *kind* (e.g. "auth", "timeout") — never a message, header, or anything
 * that could contain a credential fragment.
 */
export type IntegrationStatus = {
  dataSource: "mock" | "tiny";
  lastSuccessAt: string | null;
  lastFallbackAt: string | null;
  lastFallbackKind: string | null;
  fallbackActive: boolean;
};

const state: IntegrationStatus = {
  dataSource: dataSourceConfig.source,
  lastSuccessAt: null,
  lastFallbackAt: null,
  lastFallbackKind: null,
  fallbackActive: false,
};

export function recordTinySuccess(): void {
  state.lastSuccessAt = new Date().toISOString();
  state.fallbackActive = false;
}

/**
 * Records that a read fell back to the mock repository. In production,
 * this is logged with a distinct, greppable prefix — a fallback in prod
 * is a signal worth alerting on, not routine noise (see requirement
 * "o fallback para mock não pode acontecer silenciosamente em produção").
 */
export function recordTinyFallback(kind: string): void {
  state.lastFallbackAt = new Date().toISOString();
  state.lastFallbackKind = kind;
  state.fallbackActive = true;

  if (isProduction) {
    console.error(
      `[tiny][PROD-FALLBACK] servindo catálogo mock em produção — motivo: ${kind}. ` +
        "Verifique a integração com a Tiny."
    );
  }
}

export function getIntegrationStatus(): Readonly<IntegrationStatus> {
  return { ...state };
}
