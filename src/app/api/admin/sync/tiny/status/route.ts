import { NextResponse } from "next/server";
import { readProgress } from "@/lib/tiny-sync/batch-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const { prisma } = await import("@/lib/db/prisma");
  const pending = await prisma.tinySyncRun.findFirst({ where: { status: { in: ["RUNNING", "PARTIAL", "ERROR"] } }, orderBy: { startedAt: "asc" }, select: { id: true } });
  const latest = await prisma.tinySyncRun.findFirst({
    where: pending ? { id: pending.id } : undefined,
    orderBy: { startedAt: "desc" },
    select: {
      status: true,
      mode: true,
      trigger: true,
      startedAt: true,
      finishedAt: true,
      processed: true,
      created: true,
      updated: true,
      unchanged: true,
      inactivated: true,
      errors: true,
      id: true,
      errorSummary: true,
    },
  });

  const checkpoint = await prisma.tinySyncRun.findFirst({ where: { status: "SUCCESS", mode: { in: ["full", "incremental"] } }, orderBy: { startedAt: "desc" }, select: { startedAt: true } });
  if (!latest) return NextResponse.json({ ok: true, latest: null, lastTinySyncAt: checkpoint?.startedAt ?? null });
  const { errorSummary, ...publicRun } = latest;
  const progress = readProgress(errorSummary);
  return NextResponse.json({ ok: true, lastTinySyncAt: checkpoint?.startedAt ?? null, latest: {
    ...publicRun,
    updatedAt: progress?.updatedAt ?? latest.finishedAt ?? latest.startedAt,
    processedThisBatch: progress?.processedThisBatch ?? 0,
    historicalErrors: progress?.historicalErrors ?? 0,
    hasMore: progress?.hasMore ?? ["RUNNING", "PARTIAL"].includes(latest.status),
    cursor: progress ? { position: progress.cursor, total: progress.ids?.length ?? null, page: progress.page, tinyId: progress.ids?.[progress.cursor] ?? null } : null,
    lastTinySyncAt: checkpoint?.startedAt ?? null,
  } }, { headers: { "Cache-Control": "no-store" } });
}
