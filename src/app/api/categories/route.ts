import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { PrismaCategoryRepository } = await import("@/lib/repositories/prisma-category-repository");
    const categoryRepository = new PrismaCategoryRepository();
    const { searchParams } = new URL(request.url);
    const departmentSlug =
      searchParams.get("departamento") ?? undefined;

    const categories =
      await categoryRepository.findAll(departmentSlug);

    return NextResponse.json({ categories });
  } catch (err) {
    console.error(
      "[api/categories] falha ao carregar categorias:",
      err
    );

    return NextResponse.json(
      {
        categories: [],
        error: "Não foi possível carregar as categorias.",
      },
      { status: 500 }
    );
  }
}
