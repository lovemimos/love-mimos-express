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
    sku: row.sku ?? undefined,
    externalRef: row.tinyId
      ? { source: "tiny", id: row.tinyId }
      : undefined,
    categorySlug: row.category?.slug ?? "sem-categoria",
    brandSlug: row.brand?.slug ?? undefined,
    images: row.images
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((image) => image.url),
    variants: row.variants
      .filter((variant) => variant.active)
      .map((variant) => mapVariant(variant, price)),
  };
}

export class PrismaProductRepository implements ProductRepository {
  async query(params: ProductQuery): Promise<ProductQueryResult> {
    const rows = await prisma.product.findMany({
      where: {
        active: true,
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
    const rows = await prisma.product.findMany({
      where: { active: true },
      include: productInclude,
      orderBy: { name: "asc" },
    });

    return rows.map(mapProduct);
  }

  async findBySlug(slug: string): Promise<Product | undefined> {
    const row = await prisma.product.findFirst({
      where: { slug, active: true },
      include: productInclude,
    });

    return row ? mapProduct(row) : undefined;
  }

  async findByCategory(categorySlug: string): Promise<Product[]> {
    const rows = await prisma.product.findMany({
      where: {
        active: true,
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

