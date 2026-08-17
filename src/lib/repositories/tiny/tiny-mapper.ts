import type { Category, Product, ProductVariant } from "@/types";
import { slugify } from "@/utils/slugify";

/**
 * Raw shapes as documented by the official Tiny/Olist ERP API v3
 * (https://api-docs.erp.olist.com/api-reference/produtos/obter-produto).
 * Only the fields Love Mimos actually consumes are typed here — the real
 * payload has more fields (dimensões, tributação, fornecedores, etc.)
 * that we deliberately don't map. See docs/API_TINY.md §5 for the full
 * field-by-field mapping table and §10 for what Tiny does NOT provide
 * (rating, reviewCount, marketing badge).
 */
export type TinyProductPayload = {
  id: number | string;
  sku: string | null;
  descricao: string | null;
  descricaoComplementar?: string | null;
  situacao?: string | null; // "A" (Ativo) / "I" (Inativo) / "E" (Excluído) — see toSituacao()
  categoria?: { id: number | string | null; nome: string | null; caminhoCompleto: string | null } | null;
  precos?: {
    preco: number | string | null;
    precoPromocional: number | string | null;
  } | null;
  estoque?: {
    quantidade: number | string | null;
  } | null;
  gtin?: string | null; // código de barras — presente no schema real (ver docs/API_TINY.md §4)
  anexos?: { id: number | string; url: string | null; externo: boolean | null }[];
  variacoes?: {
    id: number | string;
    descricao: string | null;
    precos?: { preco: number | string | null } | null;
  }[];
  seo?: { slug: string | null } | null;
};

export type TinyCategoryNode = {
  id: number | string;
  descricao: string;
  filhas: TinyCategoryNode[];
};

/**
 * Real API responses aren't always as clean as an OpenAPI spec promises
 * — some ERPs (Tiny included, historically, in parts of its V2 API) send
 * decimal fields as numeric strings (`"42.90"`) rather than JSON numbers
 * to sidestep float precision issues. This coerces either shape to a
 * `number`, and returns `null` for anything that isn't a valid finite
 * number (rather than propagating `NaN` into a price shown to a
 * customer).
 */
function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalizes `situacao` defensively — trims whitespace and uppercases,
 * in case a real response sends `"a"`, `" A"`, etc. instead of the
 * documented exact `"A"`.
 */
function normalizeSituacao(value: string | null | undefined): "A" | "I" | "E" | null {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "A" || normalized === "I" || normalized === "E") return normalized;
  return null;
}

/**
 * Maps one Tiny product payload to our internal `Product`.
 *
 * Returns `null` for products that shouldn't appear in the public
 * catalog: `situacao !== "A"` (inactive/deleted — Tiny's own
 * documented enum) or a missing name/price, which would otherwise
 * produce a broken card in the UI. Callers (TinyProductRepository)
 * filter these out of list results and treat them as "not found" for
 * direct lookups — see docs/API_TINY.md §5 and §10.
 */
export function mapTinyProduct(raw: TinyProductPayload): Product | null {
  const situacao = normalizeSituacao(raw.situacao);
  if (situacao && situacao !== "A") return null;

  const basePrice = toNumber(raw.precos?.preco);
  if (!raw.descricao || basePrice === null) return null;

  const name = raw.descricao;
  const slugBase = raw.seo?.slug?.trim() || slugify(name);
  // Tiny's `seo.slug` is optional/nullable and not guaranteed unique
  // across the catalog — appending the product id keeps every slug
  // unique regardless of what's filled in on the Tiny side.
  const slug = `${slugBase}-${raw.id}`;

  const images = (raw.anexos ?? [])
    .map((a) => a.url)
    .filter((url): url is string => Boolean(url));

  const compareAtPrice = toNumber(raw.precos?.precoPromocional) ?? undefined;
  const stock = toNumber(raw.estoque?.quantidade) ?? 0;

  const variants: ProductVariant[] | undefined = raw.variacoes?.length
    ? raw.variacoes
        .filter((v) => v.descricao)
        .map((v) => {
          const variantPrice = toNumber(v.precos?.preco);
          return {
            id: String(v.id),
            label: v.descricao as string,
            priceModifier: variantPrice !== null ? variantPrice - basePrice : 0,
            externalRef: { source: "tiny", id: String(v.id) },
          };
        })
    : undefined;

  return {
    id: String(raw.id),
    sku: raw.sku ?? undefined,
    slug,
    name,
    shortDescription: raw.descricao, // Tiny has no separate short/long pair — see §10
    description: raw.descricaoComplementar || raw.descricao,
    price: basePrice,
    compareAtPrice,
    stock,
    categorySlug: raw.categoria?.nome ? slugify(raw.categoria.nome) : "geral",
    // brandSlug/attributes/tags/weight/dimensions: sem campo
    // equivalente confirmado na Tiny hoje — deliberadamente não
    // populados (ver docs/features/tiny-single-product-sync.md) em vez
    // de adivinhados. `npm run test:tiny-connection` imprime o JSON
    // bruto de um produto real para confirmar os nomes de campo reais
    // antes de completar este mapeamento.
    barcode: raw.gtin?.trim() || undefined,
    externalRef: { source: "tiny", id: String(raw.id) },
    images,
    // Tiny has no marketing-badge concept — the only signal we can
    // honestly derive from real fields is "has a promo price".
    badge: compareAtPrice !== undefined ? "promocao" : undefined,
    // rating/reviewCount: intentionally omitted — not available via the
    // Tiny API. See docs/API_TINY.md §10.
    variants,
  };
}

/**
 * Flattens Tiny's category tree into the flat `Category[]` our UI
 * expects. `GET /categorias/todas` returns a single root node (per the
 * official schema) whose `filhas` holds the merchant's actual top-level
 * categories — the root itself is not a real category and is never
 * included in the result. Only top-level nodes become categories — Love
 * Mimos' category pills are single-level by design (see
 * docs/DESIGN_SYSTEM.md), so deeper nesting (grandchildren) is
 * intentionally collapsed rather than represented. Tiny provides no icon
 * per category (see docs/API_TINY.md §10), so every mapped category gets
 * the same neutral fallback icon until a manual icon-mapping table
 * exists.
 */
export function mapTinyCategoryTree(root: TinyCategoryNode): Category[] {
  return root.filhas.map((node) => ({
    id: String(node.id),
    name: node.descricao,
    slug: slugify(node.descricao),
    icon: "Sparkles",
  }));
}
