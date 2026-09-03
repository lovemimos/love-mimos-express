import { beforeEach, describe, expect, it, vi } from "vitest";
import { BatchPause, batchContext, type Progress } from "./batch-context";

const mocks = vi.hoisted(() => ({ lock: vi.fn(), release: vi.fn(), discover: vi.fn(), product: vi.fn(), find: vi.fn(), create: vi.fn(), update: vi.fn(), heartbeat: vi.fn(), products: vi.fn(), sql: vi.fn() }));
vi.mock("@/lib/db/prisma", () => {
  const db = { tinySyncRun: { findFirst: mocks.find, create: mocks.create, update: mocks.update }, tinySyncLock: { updateMany: mocks.heartbeat }, product: { findMany: mocks.products }, $executeRaw: mocks.sql };
  return { prisma: { ...db, $transaction: async (fn: (tx: typeof db) => unknown) => fn(db) } };
});
vi.mock("./tiny-sync-service", () => ({ acquireLock: mocks.lock, releaseLock: mocks.release, discoverIds: mocks.discover, syncTinyProduct: mocks.product, emptyCounters: () => ({ processed: 0, created: 0, updated: 0, unchanged: 0, inactivated: 0, notFound: 0, errors: 0, review: 0 }) }));
import { syncTinyCatalog } from "./resumable-sync";

const base = () => ({ id: "run", trigger: "manual", mode: "incremental", status: "RUNNING", startedAt: new Date(Date.now() - 700_000), finishedAt: null, processed: 0, created: 0, updated: 0, unchanged: 0, inactivated: 0, notFound: 0, errors: 0, review: 0, errorSummary: null as Progress | null });
describe("durable batch orchestration", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.lock.mockResolvedValue(true); mocks.heartbeat.mockResolvedValue({ count: 1 }); mocks.find.mockResolvedValue(null); mocks.create.mockResolvedValue(base()); mocks.product.mockResolvedValue("unchanged"); mocks.discover.mockResolvedValue(["1", "2"]); mocks.products.mockResolvedValue([]); });
  it("persists PARTIAL and resumes the cursor without discovery or duplicate work", async () => {
    mocks.product.mockResolvedValueOnce("unchanged").mockRejectedValueOnce(new BatchPause());
    const first = await syncTinyCatalog({ trigger: "manual" });
    expect(first).toMatchObject({ status: "PARTIAL", hasMore: true, processedThisBatch: 1, processedTotal: 1 });
    expect(mocks.sql).not.toHaveBeenCalled();
    const saved = mocks.update.mock.calls.at(-1)![0].data;
    mocks.find.mockResolvedValueOnce({ ...base(), ...saved }).mockResolvedValueOnce(null);
    mocks.product.mockClear(); mocks.discover.mockClear();
    const second = await syncTinyCatalog({ trigger: "manual" });
    expect(second).toMatchObject({ status: "SUCCESS", hasMore: false, processedThisBatch: 1, processedTotal: 2 });
    expect(mocks.product).toHaveBeenCalledTimes(1);
    expect(mocks.product).toHaveBeenCalledWith("2");
    expect(mocks.discover).not.toHaveBeenCalled();
    expect(mocks.sql).toHaveBeenCalledTimes(1);
  });
  it("recovers legacy stale RUNNING and skips previously synchronized items", async () => {
    mocks.find.mockResolvedValueOnce({ ...base(), processed: 1, unchanged: 1 }).mockResolvedValueOnce(null);
    mocks.products.mockResolvedValue([{ tinyId: "1" }]);
    const result = await syncTinyCatalog({ trigger: "manual" });
    expect(result.processedTotal).toBe(2);
    expect(mocks.product).toHaveBeenCalledTimes(1);
    expect(mocks.product).toHaveBeenCalledWith("2");
  });
  it("does not enter a concurrent run and releases a lock after create failure", async () => {
    mocks.lock.mockResolvedValueOnce(false);
    await expect(syncTinyCatalog({ trigger: "manual" })).rejects.toThrow("TINY_SYNC_ALREADY_RUNNING");
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.create.mockRejectedValueOnce(new Error("db unavailable"));
    await expect(syncTinyCatalog({ trigger: "manual" })).rejects.toThrow("db unavailable");
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });
  it("preserves the cycle start checkpoint and passes it to incremental discovery", async () => {
    const last = { ...base(), status: "SUCCESS", startedAt: new Date("2026-09-01T10:00:00Z") };
    mocks.find.mockResolvedValueOnce(null).mockResolvedValueOnce(last);
    mocks.discover.mockImplementation(async () => { expect(batchContext.getStore()?.progress.changedSince).toBe(last.startedAt.toISOString()); return []; });
    expect((await syncTinyCatalog({ trigger: "manual" })).status).toBe("SUCCESS");
    expect(mocks.find).toHaveBeenNthCalledWith(2, expect.objectContaining({ orderBy: { startedAt: "desc" } }));
  });
});
