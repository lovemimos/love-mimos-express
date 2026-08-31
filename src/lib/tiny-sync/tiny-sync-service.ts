import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@/../generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { extractUsableImageUrls } from "@/lib/repositories/tiny/tiny-v2-image-scanner";
import type { TinyV2ProductPayload } from "@/lib/repositories/tiny/tiny-v2-mapper";
import { getTinyProduct, getTinyStock, listTinyProducts } from "./tiny-v2-client";
import { slugify } from "@/utils/slugify";

type Outcome = "created" | "updated" | "unchanged" | "inactivated" | "notFound";
export type SyncCounters = { processed: number; created: number; updated: number; unchanged: number; inactivated: number; notFound: number; errors: number; review: number };
export type SyncOptions = { trigger: "manual" | "cron" | "script"; mode?: "full" | "incremental"; ids?: string[]; limit?: number };

const emptyCounters = (): SyncCounters => ({ processed: 0, created: 0, updated: 0, unchanged: 0, inactivated: 0, notFound: 0, errors: 0, review: 0 });
const number = (value: unknown): number | null => { const parsed = Number(String(value ?? "").replace(",", ".")); return Number.isFinite(parsed) ? parsed : null; };
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;

async function acquireLock(token: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ token: string }[]>(Prisma.sql`
    INSERT INTO "TinySyncLock" ("id", "token", "lockedAt", "expiresAt")
    VALUES ('catalog', ${token}, NOW(), NOW() + INTERVAL '2 hours')
    ON CONFLICT ("id") DO UPDATE SET "token" = EXCLUDED."token", "lockedAt" = NOW(), "expiresAt" = EXCLUDED."expiresAt"
    WHERE "TinySyncLock"."expiresAt" < NOW()
    RETURNING "token"
  `);
  return rows[0]?.token === token;
}

async function releaseLock(token: string) { await prisma.tinySyncLock.deleteMany({ where: { id: "catalog", token } }); }

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
    if (!detail) continue;
    const stock = await getTinyStock(id);
    const data = commercial(detail, stock);
    variants.push({ tinyId: id, sku: data.sku, name: text(ref!.nome) ?? text(ref!.grade_valor) ?? data.name, price: data.price, stock, active: data.active, attributes: ref!.grade_valor ? { grade: ref!.grade_valor } : undefined });
  }
  return variants;
}

export async function syncTinyProduct(tinyId: string): Promise<Outcome> {
  const raw = await getTinyProduct(tinyId);
  if (!raw) return "notFound";
  const [stock, variants] = await Promise.all([getTinyStock(tinyId), loadVariants(raw)]);
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
    await prisma.product.update({ where: { id: existing!.id }, data: { lastTinySyncAt: new Date() } });
    return "unchanged";
  }

  await prisma.$transaction(async (tx) => {
    const product = existing
      ? await tx.product.update({ where: { id: existing.id }, data: { ...data, slug, lastTinySyncAt: new Date() } })
      : await tx.product.create({ data: { ...data, slug, classificationStatus: "PENDING", shortDescription: data.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) ?? data.name, lastTinySyncAt: new Date() } });
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

async function discoverIds(mode: "full" | "incremental", limit?: number): Promise<string[]> {
  const ids: string[] = [];
  const last = mode === "incremental" ? await prisma.tinySyncRun.findFirst({ where: { status: "SUCCESS" }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true } }) : null;
  const changedSince = mode === "incremental" ? (last?.finishedAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000)) : undefined;
  for (let page = 1; ; page += 1) {
    const result = await listTinyProducts(page, changedSince);
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
    const unsynchronizedCount = await prisma.product.count({ where: { lastTinySyncAt: null } });
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

export async function syncTinyCatalog(options: SyncOptions) {
  const token = randomUUID();
  if (!(await acquireLock(token))) throw new Error("TINY_SYNC_ALREADY_RUNNING");
  const mode = options.mode ?? "incremental";
  const run = await prisma.tinySyncRun.create({ data: { trigger: options.trigger, mode, status: "RUNNING" } });
  const counters = emptyCounters();
  const failures: { tinyId: string; error: string }[] = [];
  console.info("tiny_sync_start", { runId: run.id, trigger: options.trigger, mode });
  try {
    const ids = options.ids?.length ? [...new Set(options.ids)] : await discoverIds(mode, options.limit);
    for (const tinyId of ids) {
      try {
        const outcome = await syncTinyProduct(tinyId);
        counters[outcome] += 1;
        if (outcome === "created") counters.review += 1;
      }
      catch (error) { counters.errors += 1; counters.review += 1; failures.push({ tinyId, error: error instanceof Error ? error.message : "Unknown error" }); }
      counters.processed += 1;
      await prisma.tinySyncRun.update({
        where: { id: run.id },
        data: { ...counters, errorSummary: failures },
      });
    }
    await prisma.tinySyncRun.update({ where: { id: run.id }, data: { ...counters, status: failures.length ? "PARTIAL" : "SUCCESS", finishedAt: new Date(), errorSummary: failures } });
    console.info("tiny_sync_finish", { runId: run.id, ...counters });
    return { runId: run.id, ...counters, failures };
  } catch (error) {
    await prisma.tinySyncRun.update({ where: { id: run.id }, data: { ...counters, status: "FAILED", finishedAt: new Date(), errorSummary: [{ error: error instanceof Error ? error.message : "Unknown error" }] } });
    throw error;
  } finally { await releaseLock(token); }
}
