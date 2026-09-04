import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Product, ProductVariant } from "@/types";
import type { ProductRepository } from "@/lib/repositories/contracts";
import {
  applyProductQuery,
  type ProductQuery,
  type ProductQueryResult,
} from "@/lib/repositories/product-query";

const productInclude = {
  category: true,
  brand: true,
  department: true,
  images: true,
  variants: true,
} satisfies Prisma.ProductInclude;

type DbProduct = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

function parseAttributes(
  value: Prisma.JsonValue | null
): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const out: Record<string, string> = {};

  for (const [key, raw] of Object.entries(value)) {
    if (
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean"
    ) {
      out[key] = String(raw);
    }
  }

  return Object.keys(out).length ? out : undefined;
}

function mapVariant(
  variant: DbProduct["variants"][number],
  basePrice: number
): ProductVariant {
  const variantPrice =
    variant.price == null ? undefined : Number(variant.price);

  return {
    id: variant.id,
    label: variant.name?.trim() || variant.sku?.trim() || "Variação",
    priceModifier:
      variantPrice == null ? undefined : variantPrice - basePrice,
    externalRef: variant.tinyId
      ? { source: "tiny", id: variant.tinyId }
      : undefined,
    attributes: parseAttributes(variant.attributes),
    stock: variant.stock,
    active: variant.active,
  };
}

function mapProduct(row: DbProduct): Product {
  const price = Number(row.price);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription ?? "",
    description: row.description ?? "",
    price,
    compareAtPrice:
      row.compareAtPrice == null ? undefined : Number(row.compareAtPrice),
    stock: row.stock,
    active: row.active,
    sku: row.sku ?? undefined,
    externalRef: row.tinyId
      ? { source: "tiny", id: row.tinyId }
      : undefined,
    categorySlug: row.category?.slug ?? "sem-categoria",
    brandSlug: row.brand?.slug ?? undefined,
    brandName: row.brand?.name ?? undefined,
    images: row.images
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((image) => image.url),
    variants: row.variants.map((variant) => mapVariant(variant, price)),
  };
}

/**
 * Tiny variation children may still exist historically in Product, while the
 * canonical sellable representation is now ProductVariant. Excluding by the
 * shared Tiny identity keeps those rows for history without ever exposing a
 * variation child as an independent storefront product.
 */
export async function catalogVisibilityWhere(): Promise<Prisma.ProductWhereInput> {
  const variantIdentities = await prisma.productVariant.findMany({
    where: { tinyId: { not: null } },
    select: { tinyId: true },
  });
  const legacyTinyIds = variantIdentities
    .map((variant) => variant.tinyId)
    .filter((tinyId): tinyId is string => Boolean(tinyId));

  return {
    active: true,
    classificationStatus: "CLASSIFIED",
    ...(legacyTinyIds.length ? { tinyId: { notIn: legacyTinyIds } } : {}),
  };
}

export class PrismaProductRepository implements ProductRepository {
  async query(params: ProductQuery): Promise<ProductQueryResult> {
    const visibility = await catalogVisibilityWhere();
    const rows = await prisma.product.findMany({
      where: {
        ...visibility,
        ...(params.productIds?.length ? { id: { in: params.productIds } } : {}),
        ...(params.departmentSlug
          ? {
              department: {
                is: { slug: params.departmentSlug },
              },
            }
          : {}),
      },
      include: productInclude,
      orderBy: { name: "asc" },
    });

    return applyProductQuery(rows.map(mapProduct), params);
  }

  async findAll(): Promise<Product[]> {
    const visibility = await catalogVisibilityWhere();
    const rows = await prisma.product.findMany({
      where: visibility,
      include: productInclude,
      orderBy: { name: "asc" },
    });

    return rows.map(mapProduct);
  }

  async findBySlug(slug: string): Promise<Product | undefined> {
    const visibility = await catalogVisibilityWhere();
    const row = await prisma.product.findFirst({
      where: { slug, ...visibility },
      include: productInclude,
    });

    return row ? mapProduct(row) : undefined;
  }

  async findByCategory(categorySlug: string): Promise<Product[]> {
    const visibility = await catalogVisibilityWhere();
    const rows = await prisma.product.findMany({
      where: {
        ...visibility,
        category: { is: { slug: categorySlug } },
      },
      include: productInclude,
      orderBy: { name: "asc" },
    });

    return rows.map(mapProduct);
  }

  async search(query: string): Promise<Product[]> {
    const result = await this.query({
      search: query,
      page: 1,
      pageSize: 500,
    });

    return result.items;
  }
}

