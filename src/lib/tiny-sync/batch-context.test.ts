import { describe, expect, it } from "vitest";
import { batchContext, BatchPause, checkBudget, readProgress, safeSyncError, type Progress } from "./batch-context";
describe("batch safeguards", () => {
  it("stops before an HTTP request can overrun the internal deadline", () => {
    batchContext.run({ deadline: Date.now() + 20_000, progress: {} as Progress, save: async () => {} }, () => expect(() => checkBudget(30_000)).toThrow(BatchPause));
  });
  it("never returns arbitrary upstream exception text", () => {
    expect(safeSyncError(new Error("password=private token=private"))).toBe("SYNC_OPERATION_FAILED");
    expect(safeSyncError(new Error("IDENTITY_CONFLICT secret"))).toBe("IDENTITY_CONFLICT");
  });
  it("recognizes legacy error arrays without interpreting them as cursors", () => {
    expect(readProgress([{ error: "legacy" }])).toBeNull();
  });
});
