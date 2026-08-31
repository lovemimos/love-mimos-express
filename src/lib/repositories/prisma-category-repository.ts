import { prisma } from "@/lib/db/prisma";
import type { Category } from "@/types";
import type { CategoryRepository } from "@/lib/repositories/contracts";
import { catalogVisibilityWhere } from "@/lib/repositories/prisma-product-repository";

export class PrismaCategoryRepository implements CategoryRepository {
  async findAll(departmentSlug?: string): Promise<Category[]> {
    const visibility = await catalogVisibilityWhere();
    const rows = await prisma.category.findMany({
      where: departmentSlug
        ? {
            products: {
              some: {
                ...visibility,
                department: {
                  is: { slug: departmentSlug },
                },
              },
            },
          }
        : {
            products: {
              some: visibility,
            },
          },
      orderBy: { name: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      icon: "Package",
    }));
  }
}
