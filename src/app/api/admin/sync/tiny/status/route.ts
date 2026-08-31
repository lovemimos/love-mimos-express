import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { prisma } = await import("@/lib/db/prisma");
  const latest = await prisma.tinySyncRun.findFirst({
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
    },
  });

  return NextResponse.json({ ok: true, latest });
}
