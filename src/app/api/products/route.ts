import { NextResponse } from "next/server";
import { catalogService } from "@/services/catalog-service";
import type { ProductQuery, ProductSortOrder } from "@/lib/repositories/product-query";
import { FACET_KEYS } from "@/lib/facets/registry";

export const dynamic = "force-dynamic";

const SORT_PARAM_VALUES: ProductSortOrder[] = ["relevancia", "menor-preco", "maior-preco", "nome-asc"];
const BADGE_PARAM_VALUES = ["novo", "mais-vendido", "promocao"] as const;

function parseIntParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseFloatParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * GET /api/products?q=cola&categoria=adesivos&ordem=menor-preco&pagina=1&limite=12&badge=mais-vendido
 *   &atributo_marca=Maria+Sasha,Fadvan&precoMin=20&precoMax=80
 *
 * This route exists so Client Components (Home, Busca) can read the
 * catalog without ever importing `catalogService`/Tiny code into the
 * browser bundle â€” see docs/ARCHITECTURE.md. It's a thin pass-through:
 * all the actual query logic lives in `catalogService` â†’
 * `ProductRepository.query()` â†’ the shared engine in
 * src/lib/repositories/product-query.ts. Parameter *names* here are
 * Love Mimos' own (Portuguese, URL-friendly) vocabulary â€” never Tiny's
 * â€” see docs/features/home-and-search.md.
 *
 * Facet params are `atributo_{chave}=valor1,valor2` â€” one param per
 * facet key from `FACET_REGISTRY` (src/lib/facets/registry.ts). Adding
 * a new facet to the registry makes it filterable here automatically,
 * no route change needed.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const sortParam = searchParams.get("ordem");
  const badgeParam = searchParams.get("badge");

  const attributes: Record<string, string[]> = {};
  for (const key of FACET_KEYS) {
    const raw = searchParams.get(`atributo_${key}`);
    if (raw) attributes[key] = raw.split(",").filter(Boolean);
  }

  const query: ProductQuery = {
    search: searchParams.get("q") ?? undefined,
    categorySlug: searchParams.get("categoria") ?? undefined,
    departmentSlug: searchParams.get("departamento") ?? undefined,
    brandSlug: searchParams.get("marca") ?? undefined,
    sort: sortParam && (SORT_PARAM_VALUES as string[]).includes(sortParam) ? (sortParam as ProductSortOrder) : undefined,
    page: parseIntParam(searchParams.get("pagina")),
    pageSize: parseIntParam(searchParams.get("limite")),
    onlyAvailable: searchParams.get("disponivel") === "1",
    featuredOnly: searchParams.get("destaque") === "1",
    badge:
      badgeParam && (BADGE_PARAM_VALUES as readonly string[]).includes(badgeParam)
        ? (badgeParam as ProductQuery["badge"])
        : undefined,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    priceMin: parseFloatParam(searchParams.get("precoMin")),
    priceMax: parseFloatParam(searchParams.get("precoMax")),
  };

  try {
    const result = await catalogService.queryProducts(query);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/products] falha ao carregar catÃ¡logo:", err);
    return NextResponse.json(
      { items: [], total: 0, page: 1, pageSize: 12, hasMore: false, error: "NÃ£o foi possÃ­vel carregar o catÃ¡logo." },
      { status: 502 }
    );
  }
}

