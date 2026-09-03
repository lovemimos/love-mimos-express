import "server-only";

import { Prisma } from "@/../generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { extractUsableImageUrls } from "@/lib/repositories/tiny/tiny-v2-image-scanner";
import type { TinyV2ProductPayload } from "@/lib/repositories/tiny/tiny-v2-mapper";
import { getTinyProduct, getTinyStock, listTinyProducts } from "./tiny-v2-client";
import { slugify } from "@/utils/slugify";
import { batchContext, checkBudget } from "./batch-context";

type Outcome = "created" | "updated" | "unchanged" | "inactivated" | "notFound";
export type SyncCounters = { processed: number; created: number; updated: number; unchanged: number; inactivated: number; notFound: number; errors: number; review: number };
export type SyncOptions = { trigger: "manual" | "cron" | "script"; mode?: "full" | "incremental"; ids?: string[]; limit?: number };

export const emptyCounters = (): SyncCounters => ({ processed: 0, created: 0, updated: 0, unchanged: 0, inactivated: 0, notFound: 0, errors: 0, review: 0 });
const number = (value: unknown): number | null => { if (value === null || value === undefined || value === "") return null; const parsed = Number(String(value).replace(",", ".")); return Number.isFinite(parsed) ? parsed : null; };
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;

export async function acquireLock(token: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ token: string }[]>(Prisma.sql`
    INSERT INTO "TinySyncLock" ("id", "token", "lockedAt", "expiresAt")
    VALUES ('catalog', ${token}, NOW(), NOW() + INTERVAL '10 minutes')
    ON CONFLICT ("id") DO UPDATE SET "token" = EXCLUDED."token", "lockedAt" = NOW(), "expiresAt" = EXCLUDED."expiresAt"
    WHERE "TinySyncLock"."expiresAt" < NOW() OR "TinySyncLock"."lockedAt" < NOW() - INTERVAL '10 minutes'
    RETURNING "token"
  `);
  return rows[0]?.token === token;
}

export async function releaseLock(token: string) { await prisma.tinySyncLock.deleteMany({ where: { id: "catalog", token } }); }

function commercial(raw: TinyV2ProductPayload, stock: number) {
  const regular = number(raw.preco);
  const promo = number(raw.preco_promocional);
  if (!text(raw.nome) || regular === null) throw new Error(`Tiny product ${raw.id} has no name or price`);
  const hasPromo = promo !== null && promo > 0 && promo < regular;
  return {
    tinyId: String(raw.id), sku: text(raw.codigo), name: text(raw.nome)!,
    description: text(raw.descricao_complementar) ?? text(raw.descricao),
    price: hasPromo ? promo! : regular, compareAtPrice: hasPromo ? regular : null,
    stock, active: raw.situacao === undefined || raw.situacao === "A",
  };
}

async function uniqueSlug(name: string, tinyId: string, existingId?: string) {
  const base = slugify(name) || `tiny-produto-${tinyId}`;
  const match = await prisma.product.findUnique({ where: { slug: base }, select: { id: true } });
  return !match || match.id === existingId ? base : `${base}-${tinyId}`;
}

async function loadVariants(raw: TinyV2ProductPayload) {
  const refs = Array.isArray(raw.variacoes) ? raw.variacoes.map((entry) => entry.variacao).filter((item) => item?.id) : [];
  const variants = [];
  for (const ref of refs) {
    const id = String(ref!.id);
    const detail = await getTinyProduct(id);
    if (!detail) throw new Error("Tiny missing variant");
    const stock = await getTinyStock(id);
    const data = commercial(detail, stock);
    variants.push({ tinyId: id, sku: data.sku, name: text(ref!.nome) ?? text(ref!.grade_valor) ?? data.name, price: data.price, stock, active: data.active, attributes: ref!.grade_valor ? { grade: ref!.grade_valor } : undefined });
  }
  return variants;
}

export async function syncTinyProduct(tinyId: string): Promise<Outcome> {
  const raw = await getTinyProduct(tinyId);
  if (!raw) return "notFound";
  if (raw.tipoVariacao === "V" || raw.tipo_variacao === "V") return "notFound";
  // Sequential requests avoid pending promises writing after a budget pause.
  const stock = await getTinyStock(tinyId);
  const variants = await loadVariants(raw);
  checkBudget();
  const data = commercial(raw, variants.length ? variants.reduce((sum, item) => sum + (item.active ? item.stock : 0), 0) : stock);
  const images = [...new Set(extractUsableImageUrls(raw))];
  const byTiny = await prisma.product.findUnique({ where: { tinyId: data.tinyId }, include: { images: { orderBy: { position: "asc" } }, variants: { orderBy: { tinyId: "asc" } } } });
  const bySku = !byTiny && data.sku ? await prisma.product.findUnique({ where: { sku: data.sku } }) : null;
  if (bySku && bySku.tinyId !== data.tinyId) throw new Error(`IDENTITY_CONFLICT sku=${data.sku} tinyId=${data.tinyId}`);
  const existing = byTiny;
  const slug = await uniqueSlug(data.name, data.tinyId, existing?.id);
  const orderedVariants = [...variants].sort((a, b) => a.tinyId.localeCompare(b.tinyId));
  const snapshot = existing ? JSON.stringify({ ...data, slug, images, variants: orderedVariants }) : null;
  const current = existing ? JSON.stringify({ tinyId: existing.tinyId, sku: existing.sku, name: existing.name, description: existing.description, price: Number(existing.price), compareAtPrice: existing.compareAtPrice === null ? null : Number(existing.compareAtPrice), stock: existing.stock, active: existing.active, slug: existing.slug, images: existing.images.map((item) => item.url), variants: existing.variants.map((item) => ({ tinyId: item.tinyId!, sku: item.sku, name: item.name, price: item.price === null ? null : Number(item.price), stock: item.stock, active: item.active, attributes: item.attributes ?? undefined })) }) : null;

  if (existing && snapshot === current) {
    return "unchanged";
  }

  await prisma.$transaction(async (tx) => {
    const product = existing
      ? await tx.product.update({ where: { id: existing.id }, data: { ...data, slug } })
      : await tx.product.create({ data: { ...data, slug, classificationStatus: "PENDING", shortDescription: data.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) ?? data.name } });
    await tx.productImage.deleteMany({ where: { productId: product.id, url: { notIn: images } } });
    for (const [position, url] of images.entries()) {
      await tx.productImage.upsert({
        where: { productId_url: { productId: product.id, url } },
        create: { productId: product.id, url, alt: data.name, position },
        update: { alt: data.name, position },
      });
    }
    const variantTinyIds = variants.map((item) => item.tinyId);
    await tx.productVariant.deleteMany({ where: { productId: product.id, tinyId: { notIn: variantTinyIds } } });
    for (const item of variants) {
      await tx.productVariant.upsert({
        where: { tinyId: item.tinyId },
        create: { ...item, productId: product.id },
        update: { ...item, productId: product.id },
      });
    }
  });
  if (!data.active && existing?.active) return "inactivated";
  return existing ? "updated" : "created";
}

export async function discoverIds(mode: "full" | "incremental", limit?: number): Promise<string[]> {
  const ids: string[] = [];
  const context = batchContext.getStore();
  const changedSince = mode === "incremental" && context?.progress.changedSince ? new Date(context.progress.changedSince) : undefined;
  for (let page = 1; ; page += 1) {
    const result = await listTinyProducts(page, changedSince);
    if (context) { context.progress.page = page; await context.save(); }
    for (const product of result.products) {
      if (product.id && product.tipoVariacao !== "V") ids.push(String(product.id));
    }
    if ((limit && ids.length >= limit) || result.end || !result.products.length || (result.pages && page >= result.pages) || result.products.length < 100) break;
  }
  // Bootstrap/recovery: incremental dates cannot recover an unchanged item
  // that failed during the initial reconciliation. While any DB product has
  // never been synchronized, compare the complete parent/simple ID set and
  // enqueue every Tiny item that is absent or still unsynchronized.
  if (mode === "incremental" && !limit) {
    const synchronized = new Set((await prisma.product.findMany({ where: { lastTinySyncAt: { not: null } }, select: { tinyId: true } })).map((item) => item.tinyId));
    const children = (await prisma.productVariant.findMany({ where: { tinyId: { not: null } }, select: { tinyId: true } })).map((item) => item.tinyId!);
    const unsynchronizedCount = await prisma.product.count({ where: { lastTinySyncAt: null, tinyId: { notIn: children } } });
    if (unsynchronizedCount > 0) {
      for (let page = 1; ; page += 1) {
        const result = await listTinyProducts(page);
        for (const product of result.products) {
          const id = String(product.id ?? "");
          if (id && product.tipoVariacao !== "V" && !synchronized.has(id)) ids.push(id);
        }
        if (result.end || !result.products.length || (result.pages && page >= result.pages) || result.products.length < 100) break;
      }
    }
  }
  const uniqueIds = [...new Set(ids)];
  return limit ? uniqueIds.slice(0, limit) : uniqueIds;
}

export { syncTinyCatalog } from "./resumable-sync";
