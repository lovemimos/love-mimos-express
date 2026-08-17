import { notFound } from "next/navigation";
import { isProduction } from "@/lib/env";
import { testTinyV2Connection } from "@/lib/repositories/tiny/tiny-v2-connection-test";
import { mapTinyV2ProductToDomain, type TinyV2ProductPayload } from "@/lib/repositories/tiny/tiny-v2-mapper";
import { buildWritableProduct } from "@/lib/repositories/tiny/tiny-v2-product-builder";
import { resolveProductImages } from "@/lib/repositories/tiny/tiny-v2-image-resolution";
import { findExistingProduct, diffProductFields } from "@/lib/catalog/product-diff";
import { products as currentProducts } from "@/lib/data/products";
import type { Product } from "@/types";

export const dynamic = "force-dynamic";

const TEST_PRODUCT_ID = "744931523";

/**
 * Página de validação do ciclo completo: Tiny API → Mapper → Catálogo
 * Love Mimos → Exibição. NUNCA escreve nada — só lê e compara.
 */
export default async function TinyV2ProductValidationPage() {
  if (isProduction) notFound();

  const connection = await testTinyV2Connection(TEST_PRODUCT_ID);
  if (connection.kind !== "success") {
    return (
      <Page>
        <ErrorBanner>
          Não foi possível buscar o produto na Tiny agora ({connection.kind}). A validação abaixo depende de uma
          conexão bem-sucedida.
        </ErrorBanner>
      </Page>
    );
  }

  const mapping = mapTinyV2ProductToDomain(connection.product as TinyV2ProductPayload);
  const { product: builtProduct, blockers } = buildWritableProduct(mapping, TEST_PRODUCT_ID);

  if (blockers.length > 0) {
    return (
      <Page>
        <ErrorBanner>Produto não pôde ser mapeado: {blockers.join("; ")}</ErrorBanner>
      </Page>
    );
  }

  const imageResolution = await resolveProductImages(TEST_PRODUCT_ID, mapping);
  const liveProduct: Product = { ...builtProduct, images: imageResolution.urls };

  const existingMatch = findExistingProduct(currentProducts, liveProduct);

  return (
    <Page>
      {!existingMatch ? (
        <div className="rounded-lg border border-alert-500 bg-alert-50 p-4 text-alert-700">
          <p className="mb-1 font-semibold">⚠️ Este produto ainda não foi gravado no catálogo</p>
          <p className="text-xs">
            Rode <code>npm run write:tiny-v2-product -- {TEST_PRODUCT_ID} --apply</code> para gravar, depois
            recarregue esta página para ver a comparação completa. Abaixo, o que a Tiny retorna agora mesmo.
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-success-500 bg-success-50 p-3 text-xs text-success-700">
          ✅ Produto encontrado no catálogo (id: {existingMatch.product.id}, correspondência por{" "}
          {existingMatch.matchedBy}).
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Column title="Produto vindo da Tiny (agora)">
          <ProductSummary product={liveProduct} />
        </Column>
        <Column title="Produto salvo no catálogo Love Mimos">
          {existingMatch ? (
            <ProductSummary product={existingMatch.product} />
          ) : (
            <p className="text-xs text-ink/50">Ainda não gravado — ver aviso acima.</p>
          )}
        </Column>
      </div>

      {existingMatch && (
        <div className="mt-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">
            Diferenças (Tiny agora vs. catálogo salvo)
          </h2>
          <DiffTable existing={existingMatch.product} incoming={liveProduct} />
        </div>
      )}

      <div className="mt-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">
          Exibição no site (com os dados salvos, se houver)
        </h2>
        <SiteDisplayPreview product={existingMatch?.product ?? liveProduct} saved={Boolean(existingMatch)} />
      </div>
    </Page>
  );
}

function DiffTable({ existing, incoming }: { existing: Product; incoming: Product }) {
  const diffs = diffProductFields(existing, incoming);
  if (diffs.length === 0) {
    return <p className="text-xs text-success-700">Nenhuma diferença — o catálogo está atualizado com a Tiny.</p>;
  }
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="border-b border-rose-100 text-left">
          <th className="py-1.5 pr-2">Campo</th>
          <th className="py-1.5 pr-2">Salvo no catálogo</th>
          <th className="py-1.5">Vindo da Tiny agora</th>
        </tr>
      </thead>
      <tbody>
        {diffs.map((d) => (
          <tr key={d.field} className="border-b border-rose-100/60">
            <td className="py-1.5 pr-2 font-medium">{d.field}</td>
            <td className="py-1.5 pr-2 text-ink/70">{JSON.stringify(d.currentValue)}</td>
            <td className="py-1.5 text-alert-700">{JSON.stringify(d.incomingValue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProductSummary({ product }: { product: Product }) {
  return (
    <div className="space-y-1 text-xs">
      <p>
        <strong>Nome:</strong> {product.name}
      </p>
      <p>
        <strong>Preço:</strong> R$ {product.price.toFixed(2)}
        {product.compareAtPrice ? ` (de R$ ${product.compareAtPrice.toFixed(2)})` : ""}
      </p>
      <p>
        <strong>Estoque:</strong> {product.stock}
      </p>
      <p>
        <strong>Categoria:</strong> {product.categorySlug}
      </p>
      <p>
        <strong>Imagens:</strong>{" "}
        {product.images.length > 0 ? product.images.join(", ") : "nenhuma (placeholder será exibido)"}
      </p>
      <p>
        <strong>Variações:</strong>{" "}
        {product.variants?.length
          ? `${product.variants.length} — ${product.variants.map((v) => v.label).join(", ")}`
          : "nenhuma"}
      </p>
      <p>
        <strong>ID externo (Tiny):</strong> {product.externalRef?.id ?? "—"}
      </p>
    </div>
  );
}

function SiteDisplayPreview({ product, saved }: { product: Product; saved: boolean }) {
  return (
    <div className="rounded-lg border border-rose-100 bg-neutral-0 p-4">
      <p className="mb-2 text-[11px] text-ink/50">
        {saved
          ? `Prévia com os dados já gravados no catálogo — é isso que aparece em /produto/${product.slug}`
          : "Prévia com os dados da Tiny (ainda não gravados) — apenas ilustrativo."}
      </p>
      <div className="flex gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-plum/10 text-[10px] text-ink/40">
          {product.images.length > 0 ? "foto" : "placeholder"}
        </div>
        <div className="text-xs">
          <p className="font-semibold text-plum">{product.name}</p>
          <p className="text-ink/70">R$ {product.price.toFixed(2)}</p>
          <p className="text-ink/50">{product.stock > 0 ? `${product.stock} em estoque` : "Esgotado"}</p>
          {product.variants?.length ? (
            <p className="text-ink/50">Variações: {product.variants.map((v) => v.label).join(" · ")}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl p-6 font-sans text-sm text-ink">
      <div className="mb-4 rounded-lg bg-alert-50 p-3 text-xs text-alert-700">
        ⚠️ Página temporária, só para desenvolvimento. Não escreve nada — só lê e compara.
      </div>
      <h1 className="mb-4 font-display text-lg font-semibold text-plum">
        Validação do ciclo completo — produto Tiny #{TEST_PRODUCT_ID}
      </h1>
      {children}
    </div>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-error-500 bg-error-50 p-4 text-xs text-error-700">{children}</div>;
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">{title}</h2>
      {children}
    </div>
  );
}
