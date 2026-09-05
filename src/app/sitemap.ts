import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://love-mimos-express-sabg.vercel.app";
  const { catalogService } = await import("@/services/catalog-service");
  const products = await catalogService.listProducts();
  return [{ url: origin, changeFrequency: "daily", priority: 1 }, ...products.map((p) => ({ url: `${origin}/produto/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.7 }))];
}
