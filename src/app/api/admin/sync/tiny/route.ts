import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { safeSyncError } from "@/lib/tiny-sync/batch-context";

export const dynamic = "force-dynamic";
// Vercel Hobby supports at most 300s with Fluid Compute.
export const maxDuration = 300;

function authorized(request: NextRequest, trigger: "manual" | "cron") {
  const expected = trigger === "manual"
    ? process.env.TINY_SYNC_SECRET
    : process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.headers.get("x-tiny-sync-secret");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected); const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function execute(request: NextRequest, trigger: "manual" | "cron") {
  if (!authorized(request, trigger)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { syncTinyCatalog } = await import("@/lib/tiny-sync/tiny-sync-service");
    const body = request.method === "POST" ? await request.json().catch(() => ({})) as { mode?: "full" | "incremental"; ids?: string[]; limit?: number } : {};
    if (!body || (body.mode !== undefined && !["full", "incremental"].includes(body.mode)) || (body.ids !== undefined && (!Array.isArray(body.ids) || body.ids.length > 1000 || body.ids.some((id) => typeof id !== "string" || !/^\d+$/.test(id)))) || (body.limit !== undefined && (!Number.isInteger(body.limit) || body.limit < 1 || body.limit > 1000))) return NextResponse.json({ error: "Invalid sync options" }, { status: 400 });
    const result = await syncTinyCatalog({ trigger, mode: body.mode ?? (trigger === "cron" ? "full" : "incremental"), ids: body.ids, limit: body.limit });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tiny sync failed";
    return NextResponse.json({ ok: false, error: message === "TINY_SYNC_ALREADY_RUNNING" ? message : safeSyncError(error) }, { status: message === "TINY_SYNC_ALREADY_RUNNING" ? 409 : 500 });
  }
}

export async function GET(request: NextRequest) { return execute(request, "cron"); }
export async function POST(request: NextRequest) { return execute(request, "manual"); }
