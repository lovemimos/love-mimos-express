import type { CategoryRepository } from "@/lib/repositories/contracts";
import { categories } from "@/lib/data/categories";
import type { Category } from "@/types";

export class MockCategoryRepository implements CategoryRepository {
  async findAll(): Promise<Category[]> {
    return categories;
  }
}
