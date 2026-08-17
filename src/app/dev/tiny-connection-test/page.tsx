import { notFound } from "next/navigation";
import { isProduction } from "@/lib/env";
import { testTinyV2Connection } from "@/lib/repositories/tiny/tiny-v2-connection-test";

export const dynamic = "force-dynamic";

// ID fixo pedido para este teste — ver docs/features/tiny-connection-test.md.
const TEST_PRODUCT_ID = "744931523";

/**
 * Página de diagnóstico temporária, só para desenvolvimento —
 * `npm run dev` → http://localhost:3000/dev/tiny-connection-test
 *
 * Retorna 404 real em produção (`notFound()`), mesmo padrão de
 * `/dev/tiny-status`. A chamada à Tiny acontece inteiramente no
 * servidor (Server Component, sem `"use client"`, sem fetch no
 * navegador) — o token (`TINY_API_TOKEN`) nunca é enviado para o
 * cliente, nunca aparece nesta página, e nunca é logado em nenhum
 * `console.log`/erro em nenhum lugar deste fluxo.
 */
export default async function TinyConnectionTestPage() {
  if (isProduction) notFound();

  const result = await testTinyV2Connection(TEST_PRODUCT_ID);

  return (
    <div className="mx-auto max-w-2xl p-6 font-sans text-sm text-ink">
      <div className="mb-4 rounded-lg bg-alert-50 p-3 text-xs text-alert-700">
        ⚠️ Página de diagnóstico temporária, só para desenvolvimento
        (<code>NODE_ENV !== &quot;production&quot;</code>). Testa a API
        v2 da Tiny (token estático em <code>TINY_API_TOKEN</code>) —
        diferente da integração v3/OAuth2 usada pelo resto do app. O
        token nunca é exibido nesta página.
      </div>

      <h1 className="mb-4 font-display text-lg font-semibold text-plum">
        Teste de conexão — Tiny API v2 (produto #{TEST_PRODUCT_ID})
      </h1>

      <ResultCard result={result} />
    </div>
  );
}

function ResultCard({ result }: { result: Awaited<ReturnType<typeof testTinyV2Connection>> }) {
  switch (result.kind) {
    case "missing-token":
      return (
        <Banner tone="error" title="❌ TINY_API_TOKEN não foi carregado">
          A variável de ambiente não está definida (ou está vazia).
          Confirme que ela existe em <code>.env.local</code> e reinicie
          o servidor (<code>npm run dev</code>) — variáveis de ambiente
          só são lidas na inicialização.
        </Banner>
      );

    case "network-error":
      return (
        <Banner tone="error" title="❌ Falha de rede ao chamar a Tiny">
          {result.message}
        </Banner>
      );

    case "auth-error":
      return (
        <Banner tone="error" title="❌ Erro de autenticação">
          A Tiny recusou o token — provavelmente inválido ou expirado.
          <br />
          Mensagem da Tiny: <em>{result.message}</em>
          {result.rawCode && <> (código: {result.rawCode})</>}
        </Banner>
      );

    case "permission-error":
      return (
        <Banner tone="error" title="❌ Erro de permissão">
          O token é válido, mas não tem permissão para este recurso.
          <br />
          Mensagem da Tiny: <em>{result.message}</em>
          {result.rawCode && <> (código: {result.rawCode})</>}
        </Banner>
      );

    case "not-found":
      return (
        <Banner tone="alert" title="⚠️ Produto não encontrado">
          O produto #{TEST_PRODUCT_ID} não existe na sua conta Tiny, ou
          foi excluído.
          <br />
          Mensagem da Tiny: <em>{result.message}</em>
          {result.rawCode && <> (código: {result.rawCode})</>}
        </Banner>
      );

    case "api-error":
      return (
        <Banner tone="error" title="❌ Erro da API da Tiny">
          {result.message}
          {result.rawCode && <> (código: {result.rawCode})</>}
        </Banner>
      );

    case "success":
      return (
        <div>
          <Banner tone="success" title="✅ Conexão validada com sucesso">
            Autenticação OK, produto encontrado. Dados brutos recebidos
            abaixo (exatamente como a Tiny devolveu — nenhum
            mapeamento aplicado ainda).
          </Banner>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-plum/5 p-4 text-xs">
            {JSON.stringify(result.product, null, 2)}
          </pre>
        </div>
      );
  }
}

function Banner({
  tone,
  title,
  children,
}: {
  tone: "success" | "error" | "alert";
  title: string;
  children: React.ReactNode;
}) {
  const toneClasses = {
    success: "bg-success-50 text-success-700 border-success-500",
    error: "bg-error-50 text-error-700 border-error-500",
    alert: "bg-alert-50 text-alert-700 border-alert-500",
  }[tone];

  return (
    <div className={`rounded-lg border p-4 ${toneClasses}`}>
      <p className="mb-1 font-semibold">{title}</p>
      <p className="text-xs leading-relaxed">{children}</p>
    </div>
  );
}
