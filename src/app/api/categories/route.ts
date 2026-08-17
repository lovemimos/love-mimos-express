import { NextResponse } from "next/server";
import { PrismaCategoryRepository } from "@/lib/repositories/prisma-category-repository";

export const dynamic = "force-dynamic";

const categoryRepository = new PrismaCategoryRepository();

export async function GET(request: Request) {
  try {
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
