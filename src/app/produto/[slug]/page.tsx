import { notFound } from "next/navigation";
import { catalogService } from "@/services/catalog-service";
import ProductDetail from "@/features/product/components/ProductDetail";

/**
 * Sem isso, esta rota (que usa `generateStaticParams`) Ã© 100%
 * estÃ¡tica para sempre depois do build â€” qualquer mudanÃ§a no
 * catÃ¡logo (ex.: `npm run write:tiny-v2-product ... --apply`) nunca
 * aparece no site publicado sem um rebuild manual completo. Causa
 * raiz confirmada com um experimento real: ver
 * docs/features/product-page-stale-cache-fix.md.
 *
 * 60s Ã© um equilÃ­brio razoÃ¡vel para um catÃ¡logo que muda por eventos
 * pontuais de sincronizaÃ§Ã£o, nÃ£o a cada segundo â€” a primeira visita
 * apÃ³s uma gravaÃ§Ã£o pode ainda mostrar o HTML antigo, mas a prÃ³xima
 * (passado esse intervalo) jÃ¡ vem atualizada, sem precisar de rebuild.
 */
export const revalidate = 30;

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
