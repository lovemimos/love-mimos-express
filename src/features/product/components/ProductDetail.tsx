"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import BackHeader from "@/components/layout/BackHeader";
import { Button } from "@/components/ui/button";
import TogglePill from "@/components/ui/toggle-pill";
import ProductGallery from "@/features/product/components/ProductGallery";
import ProductBadge from "@/features/product/components/ProductBadge";
import FavoriteButton from "@/features/favorites/components/FavoriteButton";
import Rating from "@/components/ui/Rating";
import QuantityStepper from "@/components/ui/QuantityStepper";
import { formatBRL } from "@/utils/format";
import { sanitizeHtmlForDisplay, containsHtml } from "@/utils/sanitize-html-for-display";
import { useCartStore } from "@/features/cart/store/cart-store";
import RecommendationSection from "@/features/recommendations/components/RecommendationSection";
import { productRecommendationProvider } from "@/services/recommendations";
import { requestWhatsAppOrder, tryOpenWhatsApp } from "@/services/whatsapp";
import WhatsAppFallbackNotice from "@/components/ui/WhatsAppFallbackNotice";
import type { Product } from "@/types";
import { availableStock, isProductAvailable, isVariantAvailable } from "@/lib/availability";
import { effectivePrice, purchaseIssue } from "@/lib/purchase-validation";

export default function ProductDetail({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(
    product.variants?.find((v) => isVariantAvailable(v) && effectivePrice(product, v.id) !== null)?.id
  );
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [whatsAppFallbackUrl, setWhatsAppFallbackUrl] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const unitPrice = effectivePrice(product, variantId);
  const outOfStock = !isProductAvailable(product);
  const selectedStock = availableStock(product, variantId);
  const selectionUnavailable = Boolean(product.variants?.length) && selectedStock <= 0;
  const safeQuantity = Math.max(0, Math.min(quantity, Math.floor(selectedStock)));
  const issue = purchaseIssue(product, variantId, safeQuantity);
  useEffect(() => { setWhatsAppFallbackUrl(null); setCheckoutError(null); }, [variantId, quantity]);

  function selectVariant(id: string) {
    setVariantId(id);
    setQuantity((current) => Math.max(0, Math.min(Math.max(1, current), Math.floor(availableStock(product, id)))));
    setWhatsAppFallbackUrl(null);
    setCheckoutError(null);
  }

  function handleAddToCart() {
    if (issue) return;
    addItem({ productId: product.id, variantId, quantity: safeQuantity }, product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  }

  async function handleBuyNow() {
    if (issue || checking) return;
    setChecking(true);
    setCheckoutError(null);
    setWhatsAppFallbackUrl(null);
    try {
      const url = await requestWhatsAppOrder([{ productId: product.id, variantId, quantity: safeQuantity }]);
      setWhatsAppFallbackUrl(tryOpenWhatsApp(url) ? null : url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Atualize o produto e tente novamente.");
    } finally { setChecking(false); }
  }

  return (
    <div>
      <BackHeader title="Detalhes do produto" />
      <ProductGallery images={product.images} categorySlug={product.categorySlug} productName={product.name} />

      <div className="px-4 pt-4">
        {product.badge && (
          <div className="mb-2">
            <ProductBadge type={product.badge} />
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-lg font-semibold leading-snug text-plum">
            {product.name}
          </h1>
          <FavoriteButton productId={product.id} className="shrink-0" />
        </div>
        <p className="mt-1 text-sm text-ink/70">{product.shortDescription}</p>

        {product.rating && (
          <div className="mt-2">
            <Rating value={product.rating} count={product.reviewCount} size={14} />
          </div>
        )}

        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-h1 text-rose-500">
            {unitPrice === null ? "Preço indisponível" : formatBRL(unitPrice)}
          </span>
          {unitPrice !== null && product.compareAtPrice && product.compareAtPrice > unitPrice && (
            <span className="text-sm text-ink/50 line-through">
              {formatBRL(product.compareAtPrice)}
            </span>
          )}
        </div>

        {product.variants && product.variants.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
              Escolha a variação
            </p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <TogglePill
                  key={v.id}
                  active={variantId === v.id}
                  onClick={() => selectVariant(v.id)}
                  disabled={!isVariantAvailable(v) || effectivePrice(product, v.id) === null}
                >
                  {v.label}{!isVariantAvailable(v) ? " · indisponível" : effectivePrice(product, v.id) === null ? " · preço indisponível" : ""}
                </TogglePill>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
            Quantidade
          </p>
          {outOfStock || selectionUnavailable || unitPrice === null ? (
            <p className="inline-flex items-center rounded-full bg-ink/10 px-3 py-1.5 text-sm font-semibold text-ink/60">
              {unitPrice === null && !outOfStock ? "Preço indisponível" : "Produto esgotado"}
            </p>
          ) : (
            <>
              <QuantityStepper value={safeQuantity} onChange={setQuantity} max={Math.floor(selectedStock)} />
              <p className="mt-2 text-xs text-ink/50">{selectedStock} em estoque</p>
            </>
          )}
        </div>

        <div className="mt-6 border-t border-rose-100 pt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
            Sobre o produto
          </p>
          {containsHtml(product.description) ? (
            <div
              className="text-sm leading-relaxed text-ink/70 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              // Sanitizado em duas camadas: já na origem (mapper), e de
              // novo aqui (defesa em profundidade, idempotente e
              // barata) — nunca renderiza HTML que não passou por
              // `sanitizeHtmlForDisplay`. Ver
              // docs/features/tiny-v2-image-resolution.md (contexto
              // desta correção) e src/utils/sanitize-html-for-display.ts.
              dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDisplay(product.description) }}
            />
          ) : (
            <p className="text-sm leading-relaxed text-ink/70">{product.description}</p>
          )}
        </div>
      </div>

      <RecommendationSection
        provider={productRecommendationProvider}
        title="Você também pode gostar"
        source="product"
        currentProduct={product}
      />

      {/* Sticky CTA bar */}
      <div className="fixed inset-x-0 bottom-[64px] z-30 mx-auto max-w-md border-t border-rose-100 bg-neutral-0/95 px-4 py-4 backdrop-blur">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleAddToCart}
            disabled={Boolean(issue) || checking}
            className={clsx(
              "flex-1 overflow-hidden",
              justAdded && "border-success-500 bg-success-500 text-white"
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {justAdded ? (
                <motion.span
                  key="added"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  <Check size={16} /> Adicionado
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  Adicionar ao carrinho
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
          <Button variant="primary" size="lg" onClick={handleBuyNow} disabled={Boolean(issue) || checking} className="flex-1">
            {checking ? "Validando..." : outOfStock ? "Esgotado" : unitPrice === null ? "Preço indisponível" : selectionUnavailable ? "Variação indisponível" : "Comprar agora"}
          </Button>
        </div>
        {checkoutError && <p role="alert" className="mt-2 text-sm text-error-500">{checkoutError}</p>}
        {whatsAppFallbackUrl && <WhatsAppFallbackNotice url={whatsAppFallbackUrl} />}
      </div>
      <div className="h-20" />
    </div>
  );
}
