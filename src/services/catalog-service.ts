import "server-only";
import { productRepository, categoryRepository } from "@/lib/repositories";
import type { ProductRepository, CategoryRepository } from "@/lib/repositories/contracts";
import type { ProductQuery, ProductQueryResult } from "@/lib/repositories/product-query";
import type { Category, Product } from "@/types";

/**
 * Business-facing catalog operations. This is what hooks (src/hooks/useProducts.ts),
 * Server Components (src/app/produto/[slug]/page.tsx), and Route Handlers
 * (src/app/api/**) should depend on — never on a repository implementation
 * directly.
 *
 * `queryProducts()` (Sprint 6) is the primary way to read the catalog —
 * search, category, sort, and pagination all flow through it. The older
 * `listProducts`/`listProductsByCategory`/`searchProducts` remain as thin
 * convenience wrappers for callers that just want "everything" or "one
 * slice" without building a full `ProductQuery` (e.g.
 * `produto/[slug]/page.tsx`'s `generateStaticParams`).
 */
export class CatalogService {
  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository
  ) {}

  queryProducts(params: ProductQuery): Promise<ProductQueryResult> {
    return this.products.query(params);
  }

  listProducts(): Promise<Product[]> {
    return this.products.findAll();
  }

  getProduct(slug: string): Promise<Product | undefined> {
    return this.products.findBySlug(slug);
  }

  listProductsByCategory(categorySlug: string): Promise<Product[]> {
    return this.products.findByCategory(categorySlug);
  }

  searchProducts(query: string): Promise<Product[]> {
    return this.products.search(query);
  }

  listCategories(): Promise<Category[]> {
    return this.categories.findAll();
  }
}

export const catalogService = new CatalogService(productRepository, categoryRepository);
