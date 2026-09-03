import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const [{ prisma }, { catalogVisibilityWhere }] = await Promise.all([
    import("@/lib/db/prisma"),
    import("@/lib/repositories/prisma-product-repository"),
  ]);
  const visibility = await catalogVisibilityWhere();
  const departments = await prisma.department.findMany({
    where: { products: { some: visibility } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
  return NextResponse.json({ departments });
}
