import { AsyncLocalStorage } from "node:async_hooks";

export const BATCH_MS = 200_000;
export const REQUEST_MS = 20_000;
export class BatchPause extends Error {
  constructor() { super("TINY_SYNC_BATCH_PAUSED"); }
}
// Versioned envelope in the existing TinySyncRun.errorSummary JSONB column.
export type Progress = {
  version: 1; ids: string[] | null; cursor: number; page: number;
  changedSince: string | null; checkpointEligible: boolean;
  updatedAt: string; hasMore: boolean; processedThisBatch: number;
  nextRequestAt: number; responses: Record<string, unknown>;
  completed: string[]; failures: { tinyId: string; error: string }[];
  failureHistory?: { tinyId: string; error: string }[];
  limit?: number;
  historicalErrors?: number;
};
export type BatchContext = { deadline: number; progress: Progress; save: () => Promise<void> };
export const batchContext = new AsyncLocalStorage<BatchContext>();
export function checkBudget(requiredMs = 10_000) {
  const context = batchContext.getStore();
  if (context && Date.now() + requiredMs >= context.deadline) throw new BatchPause();
}
export function readProgress(value: unknown): Progress | null {
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1) return null;
  return value as Progress;
}
export function safeSyncError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/IDENTITY_CONFLICT/.test(message)) return "IDENTITY_CONFLICT";
  if (/TINY_API_TOKEN/.test(message)) return "TINY_TOKEN_UNAVAILABLE";
  if (/Tiny HTTP \d{3}/.test(message)) return message.match(/Tiny HTTP \d{3}/)![0];
  if (/Tiny API error \d+/.test(message)) return message.match(/Tiny API error \d+/)![0];
  return "SYNC_OPERATION_FAILED";
}
