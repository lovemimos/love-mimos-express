import { notFound } from "next/navigation";
import { isProduction } from "@/lib/env";
import { testTinyV2Connection } from "@/lib/repositories/tiny/tiny-v2-connection-test";
import {
  mapTinyV2ProductToDomain,
  type TinyV2ProductPayload,
  type FieldStatus,
} from "@/lib/repositories/tiny/tiny-v2-mapper";
import { resolveProductImages, type ImageResolutionResult } from "@/lib/repositories/tiny/tiny-v2-image-resolution";

export const dynamic = "force-dynamic";

const TEST_PRODUCT_ID = "744931523";

const FIELD_ORDER = [
  "name",
  "description",
  "sku",
  "barcode",
  "price",
  "compareAtPrice",
  "stock",
  "unit",
  "categorySlug",
  "brandSlug",
  "images",
  "weight",
  "dimensions",
  "ncm",
  "situacao",
  "variants",
  "externalRef",
];

/**
 * Página de validação temporária, só para desenvolvimento — mostra lado
 * a lado o JSON bruto da Tiny, o produto mapeado, e uma tabela de
 * status para cada um dos 17 campos de negócio pedidos. NUNCA escreve
 * no catálogo, nunca altera nada na Tiny.
 */
export default async function TinyV2ProductMappingPage() {
  if (isProduction) notFound();

  const connection = await testTinyV2Connection(TEST_PRODUCT_ID);

  return (
    <div className="mx-auto max-w-6xl p-6 font-sans text-sm text-ink">
      <div className="mb-4 rounded-lg bg-alert-50 p-3 text-xs text-alert-700">
        ⚠️ Página temporária, só para desenvolvimento. Mostra o
        mapeamento Tiny → Love Mimos para conferência — nada aqui é
        gravado no catálogo. Nada é alterado na Tiny.
      </div>

      <h1 className="mb-4 font-display text-lg font-semibold text-plum">
        Validação de mapeamento — produto Tiny #{TEST_PRODUCT_ID}
      </h1>

      {connection.kind !== "success" ? (
        <div className="rounded-lg border border-error-500 bg-error-50 p-4 text-error-700">
          <p className="mb-1 font-semibold">❌ Não foi possível buscar o produto</p>
          <p className="text-xs">
            {connection.kind === "missing-token"
              ? "TINY_API_TOKEN não foi carregado."
              : "message" in connection
                ? connection.message
                : "Erro desconhecido"}
          </p>
        </div>
      ) : (
        <MappingReport raw={connection.product as TinyV2ProductPayload} />
      )}
    </div>
  );
}

async function MappingReport({ raw }: { raw: TinyV2ProductPayload }) {
  const result = mapTinyV2ProductToDomain(raw);
  const imageResolution = await resolveProductImages(TEST_PRODUCT_ID, result);
  const orderedStatuses = FIELD_ORDER.map((key) => result.fieldStatuses.find((s) => s.key === key)).filter(
    (s): s is FieldStatus => Boolean(s)
  );
  const mappedCount = orderedStatuses.filter((s) => s.status === "mapped").length;
  const missingCount = orderedStatuses.filter((s) => s.status === "missing").length;
  const incompatibleCount = orderedStatuses.filter((s) => s.status === "incompatible").length;

  return (
    <div>
      <div className="mb-4 rounded-lg border border-success-500 bg-success-50 p-3 text-xs text-success-700">
        ✅ Produto encontrado e mapeado — {mappedCount} campo(s) mapeado(s),{" "}
        {missingCount} ausente(s), {incompatibleCount} incompatível(is)/precisa(m) de atenção.
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">
        Status de cada campo pedido
      </h2>
      <table className="mb-6 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-rose-100 text-left">
            <th className="py-1.5 pr-2">Campo</th>
            <th className="py-1.5 pr-2">Status</th>
            <th className="py-1.5">Valor / observação</th>
          </tr>
        </thead>
        <tbody>
          {orderedStatuses.map((s) => (
            <tr key={s.key} className="border-b border-rose-100/60">
              <td className="py-1.5 pr-2 font-medium">{s.label}</td>
              <td className="py-1.5 pr-2">
                {s.status === "mapped" && <span className="text-success-700">✅ Mapeado</span>}
                {s.status === "missing" && <span className="text-ink/50">❌ Ausente</span>}
                {s.status === "incompatible" && <span className="text-alert-700">⚠️ Incompatível</span>}
              </td>
              <td className="py-1.5 text-ink/70">
                {s.status === "mapped" && JSON.stringify(s.value)}
                {(s.status === "missing" || s.status === "incompatible") && s.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Column title="Dados brutos da Tiny">
          <pre className="overflow-x-auto rounded-lg bg-plum/5 p-3 text-xs">{JSON.stringify(raw, null, 2)}</pre>
        </Column>
        <Column title="Produto mapeado (Love Mimos)">
          <pre className="overflow-x-auto rounded-lg bg-plum/5 p-3 text-xs">
            {JSON.stringify(result.mapped, null, 2)}
          </pre>
        </Column>
      </div>

      <div className="mt-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">
          Resolução completa de imagens
        </h2>
        <ImageResolutionPanel resolution={imageResolution} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Column title="Estoque — chamada complementar?">
          <p className="text-xs leading-relaxed">{result.stockNote}</p>
        </Column>
        <Column title="Variações — chamada complementar?">
          <p className="text-xs leading-relaxed">{result.variantsNote}</p>
        </Column>
      </div>
    </div>
  );
}

function ImageResolutionPanel({ resolution }: { resolution: ImageResolutionResult }) {
  const sourceLabel: Record<ImageResolutionResult["source"], string> = {
    "v2-direto": "✅ Encontrada diretamente no payload v2 (campo esperado)",
    "v2-varredura": "⚠️ Encontrada por varredura ampla do payload v2 (estrutura inesperada)",
    "v3-complementar": "✅ Obtida via chamada complementar GET /produtos/{id}/anexos (API v3)",
    "nenhuma-fonte": "❌ Nenhuma imagem encontrada em nenhuma fonte tentada",
  };

  return (
    <div className="rounded-lg border border-rose-100 p-3 text-xs">
      <p className="mb-2">
        <strong>Fonte:</strong> {sourceLabel[resolution.source]}
      </p>
      <p className="mb-2 text-ink/70">{resolution.note}</p>
      {resolution.urls.length > 0 && (
        <div>
          <p className="mb-1 font-semibold">
            {resolution.urls.length} imagem(ns) encontrada(s) — a primeira é a principal:
          </p>
          <ul className="space-y-1">
            {resolution.validations.map((v, i) => (
              <li key={v.url} className="flex items-center gap-2">
                <span>{i === 0 ? "🖼️ (principal)" : "🖼️"}</span>
                <span className="break-all">{v.url}</span>
                <span className={v.accessible ? "text-success-700" : "text-error-700"}>
                  {v.accessible ? `✅ acessível (HTTP ${v.status}, sem login)` : `❌ inacessível${v.status ? ` (HTTP ${v.status})` : ""}${v.error ? ` — ${v.error}` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">{title}</h2>
      {children}
    </div>
  );
}
