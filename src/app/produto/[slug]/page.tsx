import { notFound } from "next/navigation";
import { catalogService } from "@/services/catalog-service";
import ProductDetail from "@/features/product/components/ProductDetail";

/**
 * Sem isso, esta rota (que usa `generateStaticParams`) é 100%
 * estática para sempre depois do build — qualquer mudança no
 * catálogo (ex.: `npm run write:tiny-v2-product ... --apply`) nunca
 * aparece no site publicado sem um rebuild manual completo. Causa
 * raiz confirmada com um experimento real: ver
 * docs/features/product-page-stale-cache-fix.md.
 *
 * 60s é um equilíbrio razoável para um catálogo que muda por eventos
 * pontuais de sincronização, não a cada segundo — a primeira visita
 * após uma gravação pode ainda mostrar o HTML antigo, mas a próxima
 * (passado esse intervalo) já vem atualizada, sem precisar de rebuild.
 */
export const revalidate = 60;

export async function generateStaticParams() {
  const products = await catalogService.listProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await catalogService.getProduct(params.slug);
  if (!product) notFound();

  return <ProductDetail product={product} />;
}
