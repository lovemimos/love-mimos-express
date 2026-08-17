import { NextResponse } from "next/server";
import { catalogService } from "@/services/catalog-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await catalogService.listCategories();
    return NextResponse.json({ categories });
  } catch (err) {
    console.error("[api/categories] falha ao carregar categorias:", err);
    return NextResponse.json(
      { categories: [], error: "Não foi possível carregar as categorias." },
      { status: 502 }
    );
  }
}
