import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/../generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { acquireLock, releaseLock, discoverIds, emptyCounters, syncTinyProduct, type SyncOptions, type SyncCounters } from "./tiny-sync-service";
import { BATCH_MS, BatchPause, batchContext, checkBudget, readProgress, safeSyncError, type Progress } from "./batch-context";

export async function syncTinyCatalog(options: SyncOptions) {
  const started = Date.now();
  const token = randomUUID();
  if (!(await acquireLock(token))) throw new Error("TINY_SYNC_ALREADY_RUNNING");
  let runId: string | undefined;
  let progress: Progress | undefined;
  let counters = emptyCounters();
  try {
    // A valid lock fences the entire request, including recovery and checkpoint.
    let run = await prisma.tinySyncRun.findFirst({ where: { status: { in: ["PARTIAL", "RUNNING", "ERROR"] } }, orderBy: { startedAt: "asc" } });
    if (run?.status === "RUNNING") {
      const heartbeat = readProgress(run.errorSummary)?.updatedAt ?? run.startedAt.toISOString();
      if (Date.now() - Date.parse(heartbeat) < 600_000) throw new Error("TINY_SYNC_ALREADY_RUNNING");
    }
    const last = await prisma.tinySyncRun.findFirst({ where: { status: "SUCCESS", mode: { in: ["full", "incremental"] } }, orderBy: { finishedAt: "desc" } });
    const lastState = readProgress(last?.errorSummary);
    if (!run) run = await prisma.tinySyncRun.create({ data: { trigger: options.trigger, mode: options.ids?.length || options.limit ? "targeted" : options.mode ?? "incremental", status: "RUNNING" } });
    runId = run.id;
    counters = Object.fromEntries(Object.keys(counters).map((key) => [key, run![key as keyof SyncCounters]])) as SyncCounters;
    progress = readProgress(run.errorSummary) ?? {
      version: 1, ids: options.ids?.length ? [...new Set(options.ids)] : null, cursor: 0, page: 1,
      changedSince: last ? (lastState?.checkpointEligible === false ? null : last.startedAt.toISOString()) : null,
      checkpointEligible: run.mode !== "targeted", updatedAt: new Date().toISOString(), hasMore: true,
      processedThisBatch: 0, nextRequestAt: Date.now() + 2100, responses: {}, completed: [], failures: [],
      limit: options.limit,
    };
    const state = progress;
    // Older releases updated Product.lastTinySyncAt per item. Preserve their work
    // when recovering an orphaned run that predates the durable cursor.
    if (!readProgress(run.errorSummary) && run.processed > 0) {
      state.completed = (await prisma.product.findMany({ where: { lastTinySyncAt: { gte: run.startedAt } }, select: { tinyId: true } })).map((p) => p.tinyId);
    }
    state.processedThisBatch = 0;
    state.hasMore = true;
    const save = async (status = "RUNNING", finishedAt: Date | null = null) => {
      state.updatedAt = new Date().toISOString();
      await prisma.$transaction(async (tx) => {
        const lock = await tx.tinySyncLock.updateMany({ where: { id: "catalog", token }, data: { lockedAt: new Date(), expiresAt: new Date(Date.now() + 600_000) } });
        if (lock.count !== 1) throw new Error("TINY_SYNC_LOCK_LOST");
        await tx.tinySyncRun.update({ where: { id: run!.id }, data: { ...counters, status, finishedAt, errorSummary: JSON.parse(JSON.stringify(state)) as Prisma.InputJsonValue } });
      });
    };
    await save();
    await batchContext.run({ deadline: started + BATCH_MS, progress: state, save }, async () => {
      try {
        if (state.ids === null) {
          const discovered = await discoverIds(run!.mode === "full" ? "full" : "incremental", state.limit);
          state.ids = discovered.filter((id) => !state.completed.includes(id));
          state.responses = {};
          await save();
        }
        while (state.cursor < state.ids.length) {
          checkBudget(30_000);
          if (state.processedThisBatch >= 25) throw new BatchPause();
          const tinyId = state.ids[state.cursor];
          try {
            const outcome = await syncTinyProduct(tinyId);
            counters[outcome]++;
            if (outcome === "created") counters.review++;
            state.completed.push(tinyId);
          } catch (error) {
            if (error instanceof BatchPause) throw error;
            // DB/connection/credential failures prevent safe continuation.
            const reason = safeSyncError(error);
            if (reason !== "IDENTITY_CONFLICT" && !reason.startsWith("Tiny API error")) throw error;
            counters.errors++; counters.review++;
            state.failures.push({ tinyId, error: reason });
            (state.failureHistory ??= []).push({ tinyId, error: reason });
          }
          counters.processed++; state.processedThisBatch++; state.cursor++;
          state.responses = {};
          await save();
        }
        if (state.failures.length) {
          // Retry only failed products next time; never advance the checkpoint.
          state.ids = state.failures.map((item) => item.tinyId);
          state.cursor = 0;
          state.failures = [];
          await save("PARTIAL");
        } else {
          checkBudget();
          state.hasMore = false;
          state.updatedAt = new Date().toISOString();
          await prisma.$transaction(async (tx) => {
            const lock = await tx.tinySyncLock.updateMany({ where: { id: "catalog", token }, data: { lockedAt: new Date() } });
            if (lock.count !== 1) throw new Error("TINY_SYNC_LOCK_LOST");
            // Explicit SQL avoids Prisma @updatedAt churn on unchanged products.
            if (state.completed.length) await tx.$executeRaw(Prisma.sql`UPDATE "Product" SET "lastTinySyncAt" = ${run!.startedAt} WHERE "tinyId" IN (${Prisma.join(state.completed)})`);
            await tx.tinySyncRun.update({ where: { id: run!.id }, data: { ...counters, status: "SUCCESS", finishedAt: new Date(), errorSummary: JSON.parse(JSON.stringify(state)) as Prisma.InputJsonValue } });
          });
        }
      } catch (error) {
        if (!(error instanceof BatchPause)) throw error;
        await save("PARTIAL");
      }
    });
    return { ok: true, runId, status: state.hasMore ? "PARTIAL" : "SUCCESS", hasMore: state.hasMore, processedThisBatch: state.processedThisBatch, processedTotal: counters.processed, elapsedMs: Date.now() - started, ...counters };
  } catch (error) {
    if (runId && progress) {
      progress.updatedAt = new Date().toISOString();
      (progress.failureHistory ??= []).push({ tinyId: progress.ids?.[progress.cursor] ?? "discovery", error: safeSyncError(error) });
      await prisma.tinySyncRun.update({ where: { id: runId }, data: { status: "ERROR", errorSummary: JSON.parse(JSON.stringify(progress)) as Prisma.InputJsonValue } });
    }
    throw error;
  } finally { await releaseLock(token); }
}
