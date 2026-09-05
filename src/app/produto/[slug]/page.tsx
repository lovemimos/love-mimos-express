import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import ProductDetail from "@/features/product/components/ProductDetail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const getProduct = cache(async (slug: string) => {
  const { catalogService } = await import("@/services/catalog-service");
  return catalogService.getProduct(slug);
});

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: "Produto não encontrado", robots: { index: false } };
  const description = (product.shortDescription || product.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ") || `Confira ${product.name} na Love Mimos Express. Consulte disponibilidade e monte seu pedido pelo WhatsApp.`).slice(0, 160);
  return { title: product.name, description, alternates: { canonical: `/produto/${product.slug}` }, openGraph: { title: product.name, description, ...(product.images.length ? { images: [product.images[0]] } : {}) } };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  // Import only while serving a request. Importing the composition root at
  // module scope initializes Prisma while Next.js is collecting page data.
  const product = await getProduct(params.slug);
  if (!product) notFound();

  return <ProductDetail product={product} />;
}
