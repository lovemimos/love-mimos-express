import { prisma } from "@/lib/db/prisma";
import type { Category } from "@/types";
import type { CategoryRepository } from "@/lib/repositories/contracts";

export class PrismaCategoryRepository implements CategoryRepository {
  async findAll(departmentSlug?: string): Promise<Category[]> {
    const rows = await prisma.category.findMany({
      where: departmentSlug
        ? {
            products: {
              some: {
                active: true,
                department: {
                  is: { slug: departmentSlug },
                },
              },
            },
          }
        : {
            products: {
              some: { active: true },
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
