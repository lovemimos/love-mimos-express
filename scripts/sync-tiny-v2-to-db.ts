// @ts-nocheck
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });

async function main() {
  const tinyProductId = process.argv[2] || "744931523";

  const [
    { testTinyV2Connection },
    { mapTinyV2ProductToDomain },
   { buildWritableProduct },
    { resolveProductImages },
    { prisma }
  ] = await Promise.all([
    import("../src/lib/repositories/tiny/tiny-v2-connection-test"),
    import("../src/lib/repositories/tiny/tiny-v2-mapper"),
    import("../src/lib/repositories/tiny/tiny-v2-product-builder"),
    import("../src/lib/repositories/tiny/tiny-v2-image-resolution"),
    import("../src/lib/db/prisma")
  ]);

  const connection = await testTinyV2Connection(tinyProductId);
  if (connection.kind !== "success") {
    throw new Error("Tiny v2 connection failed: " + connection.kind);
  }

  const token = process.env.TINY_API_TOKEN;
  if (!token) throw new Error("TINY_API_TOKEN missing");

  const callTinyV2 = async (endpoint: string) => {
    const body = new URLSearchParams({
      token,
      id: tinyProductId,
      formato: "JSON",
    });
    const response = await fetch(`https://api.tiny.com.br/api2/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) throw new Error(`Tiny API HTTP ${response.status}`);
    return response.json() as Promise<any>;
  };

  const [priceResponse, stockResponse] = await Promise.all([
    callTinyV2("produto.obter.php"),
    callTinyV2("produto.obter.estoque.php"),
  ]);

  const priceProduct = priceResponse?.retorno?.produto ?? {};
  const stockProduct = stockResponse?.retorno?.produto ?? {};

  const enrichedProduct = {
    ...connection.product,
    preco: Number(String(priceProduct.preco ?? 0).replace(",", ".")),
    preco_promocional: Number(String(priceProduct.preco_promocional ?? 0).replace(",", ".")),
    estoque: stockProduct.saldo,
    depositos: stockProduct.depositos,
  };

  const mapping = mapTinyV2ProductToDomain(enrichedProduct);
  const built = buildWritableProduct(mapping, tinyProductId);

  if (built.blockers.length) {
    throw new Error("Blocked product: " + built.blockers.join(" | "));
  }

  const imageResolution = await resolveProductImages(tinyProductId, mapping);
  const product = { ...built.product, images: imageResolution.urls };

  const humanize = (slug) =>
    slug.split("-").filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");

  const category = await prisma.category.upsert({
    where: { slug: product.categorySlug },
    update: {},
    create: { slug: product.categorySlug, name: humanize(product.categorySlug) }
  });

  const brand = product.brandSlug
    ? await prisma.brand.upsert({
        where: { slug: product.brandSlug },
        update: {},
        create: { slug: product.brandSlug, name: humanize(product.brandSlug) }
      })
    : null;

  const tinyId = String(tinyProductId);
  const sku = product.sku ? String(product.sku).trim() : null;

  const existing = await prisma.product.findFirst({
    where: {
      OR: [
        { tinyId },
        ...(sku ? [{ sku }] : []),
        { slug: product.slug }
      ]
    }
  });

  const saved = await prisma.$transaction(async (tx) => {
    const data = {
      tinyId,
      sku,
      name: product.name,
      slug: product.slug,
      description: product.description || null,
      shortDescription: product.shortDescription || null,
      price: Number(String(priceProduct.preco ?? 0).replace(",", ".")),
      compareAtPrice: Number(String(priceProduct.preco_promocional ?? 0).replace(",", ".")) > 0 ? Number(String(priceProduct.preco_promocional).replace(",", ".")) : null,
      stock: Math.trunc(product.stock ?? 0),
      active: true,
      categoryId: category.id,
      brandId: brand ? brand.id : null
    };

    const dbProduct = existing
      ? await tx.product.update({ where: { id: existing.id }, data })
      : await tx.product.create({ data });

    if (product.images && product.images.length) {
      await tx.productImage.deleteMany({ where: { productId: dbProduct.id } });
      await tx.productImage.createMany({
        data: product.images.map((url, position) => ({
          productId: dbProduct.id,
          url,
          alt: product.name,
          position
        }))
      });
    }

    return dbProduct;
  });

  const imageCount = await prisma.productImage.count({
    where: { productId: saved.id }
  });

  console.log("SYNC_OK");
  console.log("dbId=" + saved.id);
  console.log("tinyId=" + saved.tinyId);
  console.log("name=" + saved.name);
  console.log("price=" + Number(saved.price).toFixed(2));
  console.log("stock=" + saved.stock);
  console.log("images=" + imageCount);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("SYNC_ERROR");
  console.error(err);
  process.exit(1);
});




