import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

function humanizeSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function main() {
  loadEnvLocal();

  const ids = process.argv.slice(2).filter(Boolean);
  if (ids.length === 0) {
    throw new Error(
      "Informe ao menos um ID Tiny. Ex.: npx tsx --conditions=react-server scripts/sync-tiny-to-db.ts 744931523"
    );
  }

  const [{ prisma }, { tinyClient }, { mapTinyProduct }] = await Promise.all([
    import("../src/lib/db/prisma"),
    import("../src/lib/repositories/tiny/tiny-client"),
    import("../src/lib/repositories/tiny/tiny-mapper"),
  ]);

  for (const tinyId of ids) {
    console.log(`\n[Tiny ${tinyId}] buscando produto real...`);

    const raw = await tinyClient.get<any>(`/produtos/${tinyId}`);
    const product = mapTinyProduct(raw);

    if (!product) {
      throw new Error(`Tiny ${tinyId}: mapper não gerou Product.`);
    }

    const category = await prisma.category.upsert({
      where: { slug: product.categorySlug },
      update: {},
      create: {
        slug: product.categorySlug,
        name: humanizeSlug(product.categorySlug),
      },
    });

    const brand = product.brandSlug
      ? await prisma.brand.upsert({
          where: { slug: product.brandSlug },
          update: {},
          create: {
            slug: product.brandSlug,
            name: humanizeSlug(product.brandSlug),
          },
        })
      : null;

    const saved = await prisma.$transaction(async (tx) => {
      const dbProduct = await tx.product.upsert({
        where: { tinyId: String(tinyId) },
        update: {
          sku: product.sku ?? null,
          name: product.name,
          slug: product.slug,
          description: product.description || null,
          shortDescription: product.shortDescription || null,
          price: product.price,
          compareAtPrice: product.compareAtPrice ?? null,
          stock: Math.trunc(product.stock ?? 0),
          active: true,
          categoryId: category.id,
          brandId: brand?.id ?? null,
        },
        create: {
          tinyId: String(tinyId),
          sku: product.sku ?? null,
          name: product.name,
          slug: product.slug,
          description: product.description || null,
          shortDescription: product.shortDescription || null,
          price: product.price,
          compareAtPrice: product.compareAtPrice ?? null,
          stock: Math.trunc(product.stock ?? 0),
          active: true,
          categoryId: category.id,
          brandId: brand?.id ?? null,
        },
      });

      await tx.productImage.deleteMany({
        where: { productId: dbProduct.id },
      });

      if (product.images?.length) {
        await tx.productImage.createMany({
          data: product.images.map((url: string, position: number) => ({
            productId: dbProduct.id,
            url,
            alt: product.name,
            position,
          })),
        });
      }

      await tx.productVariant.deleteMany({
        where: { productId: dbProduct.id },
      });

      for (const variant of product.variants ?? []) {
        await tx.productVariant.create({
          data: {
            productId: dbProduct.id,
            tinyId:
              variant.externalRef?.source === "tiny"
                ? variant.externalRef.id
                : null,
            name: variant.label,
            price:
              typeof variant.priceModifier === "number"
                ? product.price + variant.priceModifier
                : product.price,
            stock: Math.trunc(product.stock ?? 0),
            active: true,
            attributes: variant.attributes ?? undefined,
          },
        });
      }

      return dbProduct;
    });

    console.log(
      `[OK] ${saved.name} | preço R$ ${Number(saved.price).toFixed(2)} | estoque ${saved.stock} | imagens ${product.images?.length ?? 0} | variações ${product.variants?.length ?? 0}`
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("\n[ERRO]", error);
  process.exit(1);
});
