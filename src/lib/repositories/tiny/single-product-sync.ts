import "server-only";
import { tinyIntegrationService } from "@/lib/repositories/tiny/tiny-integration-service";
import { mapTinyProduct, type TinyProductPayload } from "@/lib/repositories/tiny/tiny-mapper";
import { findExistingProduct, diffProductFields, type FieldDiff } from "@/lib/catalog/product-diff";
import type { Product } from "@/types";

export type { FieldDiff };

export type SingleProductSyncReport = {
  tinyProductId: string;
  found: boolean;
  mapped?: Product;
  /** Raw top-level keys Tiny actually sent, so a human can spot a field
   * we don't map yet (e.g. a brand-like key) without guessing. */
  rawKeysSeen?: string[];
  /** Fields the app's domain model expects but Tiny's response didn't
   * have anything for — not an error, just visibility (task 5). */
  missingFields: string[];
  /** Set only when a product with the same identifier already exists in
   * the current catalog AND at least one field actually differs — the
   * caller must not write over this without an explicit --force (task 6). */
  conflict?: {
    matchedBy: "externalRef" | "sku" | "slug";
    existing: Product;
    fieldDiffs: FieldDiff[];
  };
};

function findMissingFields(raw: TinyProductPayload): string[] {
  const missing: string[] = [];
  if (!raw.categoria?.nome) missing.push("categoria (Tiny não retornou categoria para este produto)");
  if (!raw.anexos || raw.anexos.length === 0) missing.push("imagens (nenhum anexo retornado)");
  if (!raw.variacoes || raw.variacoes.length === 0) missing.push("variações (produto sem variação na Tiny)");
  if (!raw.sku) missing.push("SKU (não informado na Tiny)");
  if (raw.precos?.precoPromocional === null || raw.precos?.precoPromocional === undefined) {
    missing.push("preço promocional (não informado na Tiny — normal se não houver promoção ativa)");
  }
  missing.push(
    'marca (sem campo confirmado no schema da Tiny — ver "rawKeysSeen" no relatório para conferir manualmente)'
  );
  missing.push(
    'peso e dimensões (sem nome de campo confirmado na Tiny ainda — ver "rawKeysSeen" para identificar)'
  );
  return missing;
}

/**
 * Fetches ONE product directly from `GET /produtos/{id}` — deliberately
 * bypasses `TinyProductRepository`'s cache and mock-fallback machinery.
 * This is an explicit, human-initiated action; if Tiny is unreachable or
 * the credentials are wrong, the caller needs to see that clearly, not
 * have it silently swallowed into "here's the mock catalog instead".
 */
export async function syncSingleTinyProduct(
  tinyProductId: string,
  currentCatalog: Product[]
): Promise<SingleProductSyncReport> {
  let raw: TinyProductPayload;
  try {
    raw = await tinyIntegrationService.getProductById(tinyProductId);
  } catch {
    return { tinyProductId, found: false, missingFields: [] };
  }

  const mapped = mapTinyProduct(raw);
  if (!mapped) {
    return { tinyProductId, found: true, rawKeysSeen: Object.keys(raw), missingFields: [] };
  }

  const existingMatch = findExistingProduct(currentCatalog, mapped);
  const report: SingleProductSyncReport = {
    tinyProductId,
    found: true,
    mapped,
    rawKeysSeen: Object.keys(raw),
    missingFields: findMissingFields(raw),
  };

  if (existingMatch) {
    const fieldDiffs = diffProductFields(existingMatch.product, mapped);
    if (fieldDiffs.length > 0) {
      report.conflict = { matchedBy: existingMatch.matchedBy, existing: existingMatch.product, fieldDiffs };
    }
  }

  return report;
}
