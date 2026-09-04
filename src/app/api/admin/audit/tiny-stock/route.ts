import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") return new NextResponse(null, { status: 404 });
  const offset = Math.max(0, Math.floor(Number(new URL(request.url).searchParams.get("offset")) || 0));
  const [{ prisma }, { catalogVisibilityWhere }, { acquireLock, releaseLock }, { getTinyStock }] = await Promise.all([
    import("@/lib/db/prisma"),
    import("@/lib/repositories/prisma-product-repository"),
    import("@/lib/tiny-sync/tiny-sync-service"),
    import("@/lib/tiny-sync/tiny-v2-client"),
  ]);
  const token = randomUUID();
  if (!(await acquireLock(token))) return NextResponse.json({ error: "sync_busy" }, { status: 409 });
  try {
    const visibility = await catalogVisibilityWhere();
    const products = await prisma.product.findMany({
      where: visibility,
      select: { id: true, tinyId: true, name: true, stock: true, variants: { where: { active: true }, select: { id: true, tinyId: true, name: true, stock: true } } },
      orderBy: { tinyId: "asc" },
    });
    const zero = products.flatMap((product) => product.variants.length
      ? product.variants.filter((variant) => variant.stock <= 0 && variant.tinyId).map((variant) => ({ kind: "variant", productId: product.id, productName: product.name, id: variant.id, name: variant.name, tinyId: variant.tinyId!, siteStock: variant.stock }))
      : product.stock <= 0 ? [{ kind: "product", productId: product.id, productName: product.name, id: product.id, name: product.name, tinyId: product.tinyId, siteStock: product.stock }] : []);
    const positiveSample = products.flatMap((product) => product.variants.length
      ? product.variants.filter((variant) => variant.stock > 0 && variant.tinyId).map((variant) => ({ kind: "variant-sample", productId: product.id, productName: product.name, id: variant.id, name: variant.name, tinyId: variant.tinyId!, siteStock: variant.stock }))
      : product.stock > 0 ? [{ kind: "product-sample", productId: product.id, productName: product.name, id: product.id, name: product.name, tinyId: product.tinyId, siteStock: product.stock }] : []).slice(0, 10);
    const targets = [...zero, ...positiveSample];
    // Eight calls stay below the 20s browser/navigation budget while the
    // shared Tiny client still enforces ~30 requests/minute.
    const slice = targets.slice(offset, offset + 8);
    const items = [];
    for (const target of slice) {
      try { items.push({ ...target, tinyStock: await getTinyStock(target.tinyId), error: null }); }
      catch (error) { items.push({ ...target, tinyStock: null, error: error instanceof Error ? error.message : "Tiny stock error" }); }
    }
    return NextResponse.json({ offset, nextOffset: offset + slice.length, total: targets.length, zeroTargets: zero.length, positiveSample: positiveSample.length, hasMore: offset + slice.length < targets.length, items });
  } finally {
    await releaseLock(token);
  }
}
