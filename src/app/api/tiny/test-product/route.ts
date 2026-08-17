import { NextResponse } from "next/server";
import { isProduction } from "@/lib/env";
import { testTinyV2Connection } from "@/lib/repositories/tiny/tiny-v2-connection-test";

export const dynamic = "force-dynamic";

// Mesmo produto fixo da página /dev/tiny-connection-test — ver
// docs/features/tiny-connection-test.md.
const TEST_PRODUCT_ID = "744931523";

/**
 * GET /api/tiny/test-product
 *
 * Atalho em formato de API para quem esperava esse caminho (a versão
 * "oficial" desta sprint é a página em /dev/tiny-connection-test) —
 * mesma lógica (`testTinyV2Connection`), mesmas garantias de segurança:
 * roda só no servidor, nunca inclui o token na resposta, 404 real em
 * produção.
 */
export async function GET() {
  if (isProduction) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const result = await testTinyV2Connection(TEST_PRODUCT_ID);

  const statusByKind: Record<string, number> = {
    "missing-token": 500,
    "network-error": 502,
    "auth-error": 401,
    "permission-error": 403,
    "not-found": 404,
    "api-error": 502,
    success: 200,
  };

  return NextResponse.json(result, { status: statusByKind[result.kind] });
}
