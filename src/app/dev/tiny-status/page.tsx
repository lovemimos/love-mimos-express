import { notFound } from "next/navigation";
import { dataSourceConfig, tinyEnv, validateTinyEnv, isProduction } from "@/lib/env";
import { getIntegrationStatus } from "@/lib/repositories/tiny/status";

export const dynamic = "force-dynamic";

/**
 * Development-only diagnostic page — `npm run dev` → http://localhost:3000/dev/tiny-status
 *
 * Never renders in production (returns a real 404 via `notFound()`
 * rather than just hiding a link to it) — this page reads server
 * config, and even though it never prints a credential value, an
 * internal diagnostic route has no business being reachable in a
 * production deployment at all.
 *
 * Shows only booleans and non-sensitive metadata — no credential value,
 * masked or otherwise, is ever rendered here. See docs/API_TINY.md and
 * docs/SPRINT_5A_REPORT.md.
 */
export default function TinyStatusPage() {
  if (isProduction) notFound();

  const validation = validateTinyEnv();
  const status = getIntegrationStatus();

  const credentialRows: { name: string; configured: boolean }[] = [
    { name: "TINY_CLIENT_ID", configured: Boolean(tinyEnv.clientId) },
    { name: "TINY_CLIENT_SECRET", configured: Boolean(tinyEnv.clientSecret) },
    { name: "TINY_REFRESH_TOKEN", configured: Boolean(tinyEnv.refreshToken) },
  ];

  return (
    <div className="mx-auto max-w-md p-6 font-sans text-sm text-ink">
      <div className="mb-4 rounded-lg bg-alert-50 p-3 text-xs text-alert-700">
        ⚠️ Página de diagnóstico interno — só existe em desenvolvimento
        (<code>NODE_ENV !== &quot;production&quot;</code>). Nunca exibe
        valores de credencial, só se cada uma está configurada.
      </div>

      <h1 className="mb-4 font-display text-lg font-semibold text-plum">
        Status da integração Tiny
      </h1>

      <Section title="Fonte de dados ativa">
        <Row label="DATA_SOURCE configurado" value={process.env.DATA_SOURCE ?? "(não definido → mock)"} />
        <Row label="Fonte efetivamente em uso" value={status.dataSource} />
      </Section>

      <Section title="Credenciais (só presença, nunca o valor)">
        {credentialRows.map((row) => (
          <Row key={row.name} label={row.name} value={row.configured ? "✅ configurado" : "❌ ausente"} />
        ))}
        {!validation.ok && (
          <p className="mt-2 text-xs text-error-700">{validation.message}</p>
        )}
      </Section>

      <Section title="Saúde da integração (em memória, desde o último start do servidor)">
        <Row label="Último sucesso na Tiny" value={status.lastSuccessAt ?? "nunca"} />
        <Row label="Fallback ativo agora" value={status.fallbackActive ? "sim" : "não"} />
        <Row label="Último fallback" value={status.lastFallbackAt ?? "nunca"} />
        <Row label="Motivo do último fallback" value={status.lastFallbackKind ?? "—"} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-rose-100 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink/70">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
