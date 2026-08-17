import "server-only";

/**
 * Teste de conexão isolado para a API v2 da Tiny (token estático) —
 * deliberadamente separado de `tiny-client.ts` (que fala com a API v3,
 * OAuth2). São duas APIs diferentes: URL base diferente, mecanismo de
 * autenticação diferente (`token` numa query/form vs. Bearer OAuth2),
 * formato de resposta diferente. Ver docs/features/tiny-connection-test.md.
 *
 * Escopo deliberadamente mínimo — "rota temporária... somente teste de
 * conexão" (não é uma reescrita da integração real).
 */

const TINY_V2_BASE_URL = "https://api.tiny.com.br/api2";

export type TinyV2ConnectionResult =
  | { kind: "missing-token" }
  | { kind: "network-error"; message: string }
  | { kind: "auth-error"; message: string; rawCode?: string }
  | { kind: "permission-error"; message: string; rawCode?: string }
  | { kind: "not-found"; message: string; rawCode?: string }
  | { kind: "api-error"; message: string; rawCode?: string }
  | { kind: "success"; product: unknown };

/**
 * Palavras-chave observadas nas mensagens de erro da API v2 da Tiny que
 * indicam autenticação/permissão — usadas só para dar um rótulo mais
 * claro no relatório; a mensagem original da Tiny é sempre preservada
 * também, então nada fica escondido atrás de uma categorização errada.
 */
function classifyErrorMessage(message: string): "auth-error" | "permission-error" | "not-found" | "api-error" {
  const lower = message.toLowerCase();
  if (lower.includes("token") || lower.includes("autentic") || lower.includes("não autorizado")) {
    return "auth-error";
  }
  if (lower.includes("permiss") || lower.includes("não tem acesso") || lower.includes("bloqueado")) {
    return "permission-error";
  }
  if (lower.includes("não encontrad") || lower.includes("não existe") || lower.includes("inexistente")) {
    return "not-found";
  }
  return "api-error";
}

export async function testTinyV2Connection(productId: string): Promise<TinyV2ConnectionResult> {
  const token = process.env.TINY_API_TOKEN;

  if (!token || token.trim().length === 0) {
    return { kind: "missing-token" };
  }

  const body = new URLSearchParams({
    token,
    id: productId,
    formato: "json",
  });

  let response: Response;
  try {
    response = await fetch(`${TINY_V2_BASE_URL}/produto.obter.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha de rede desconhecida";
    return { kind: "network-error", message };
  }

  if (!response.ok) {
    return {
      kind: "api-error",
      message: `A API da Tiny respondeu com status HTTP ${response.status}`,
    };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { kind: "api-error", message: "Resposta da Tiny não é um JSON válido" };
  }

  const retorno = (json as { retorno?: Record<string, unknown> })?.retorno;

  if (!retorno) {
    return { kind: "api-error", message: "Resposta da Tiny não tem o formato esperado (sem campo 'retorno')" };
  }

  if (retorno.status === "OK" && retorno.produto) {
    return { kind: "success", product: retorno.produto };
  }

  const errosList = Array.isArray(retorno.erros) ? (retorno.erros as { erro?: string }[]) : [];
  const message = errosList.map((e) => e.erro).filter(Boolean).join("; ") || "Erro não especificado pela Tiny";
  const rawCode = typeof retorno.codigo_erro === "string" ? retorno.codigo_erro : undefined;

  const kind = classifyErrorMessage(message);
  return { kind, message, rawCode };
}
