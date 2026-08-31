import { notFound } from "next/navigation";
import ProductDetail from "@/features/product/components/ProductDetail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  // Import only while serving a request. Importing the composition root at
  // module scope initializes Prisma while Next.js is collecting page data.
  const { catalogService } = await import("@/services/catalog-service");
  const product = await catalogService.getProduct(params.slug);
  if (!product) notFound();

  return <ProductDetail product={product} />;
}
