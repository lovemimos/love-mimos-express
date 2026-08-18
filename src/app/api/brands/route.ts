import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const departmentSlug = searchParams.get("departamento") ?? undefined;
  const categorySlug = searchParams.get("categoria") ?? undefined;
  const onlyAvailable = searchParams.get("disponivel") === "1";

  const brands = await prisma.brand.findMany({
    where: {
      products: {
        some: {
          active: true,
          ...(departmentSlug ? { department: { is: { slug: departmentSlug } } } : {}),
          ...(categorySlug ? { category: { is: { slug: categorySlug } } } : {}),
          ...(onlyAvailable
            ? {
                OR: [
                  { variants: { none: {} }, stock: { gt: 0 } },
                  { variants: { some: { active: true, stock: { gt: 0 } } } },
                ],
              }
            : {}),
        },
      },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ brands });
}
