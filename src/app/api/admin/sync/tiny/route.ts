import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncTinyCatalog } from "@/lib/tiny-sync/tiny-sync-service";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

function authorized(request: NextRequest) {
  const expected = process.env.TINY_SYNC_SECRET || process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || request.headers.get("x-tiny-sync-secret");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected); const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function execute(request: NextRequest, trigger: "manual" | "cron") {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = request.method === "POST" ? await request.json().catch(() => ({})) as { mode?: "full" | "incremental"; ids?: string[]; limit?: number } : {};
    const result = await syncTinyCatalog({ trigger, mode: body.mode ?? "incremental", ids: body.ids, limit: body.limit });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tiny sync failed";
    return NextResponse.json({ error: message }, { status: message === "TINY_SYNC_ALREADY_RUNNING" ? 409 : 500 });
  }
}

export async function GET(request: NextRequest) { return execute(request, "cron"); }
export async function POST(request: NextRequest) { return execute(request, "manual"); }
