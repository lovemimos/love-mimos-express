"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import BackHeader from "@/components/layout/BackHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import CartLineItem from "@/features/cart/components/CartLineItem";
import FreeShippingBar from "@/features/cart/components/FreeShippingBar";
import WhatsAppCheckoutButton from "@/features/cart/components/WhatsAppCheckoutButton";
import { useCartLines } from "@/features/cart/hooks/useCartLines";
import { useCartStore } from "@/features/cart/store/cart-store";
import RecommendationSection from "@/features/recommendations/components/RecommendationSection";
import { cartRecommendationProvider } from "@/services/recommendations";
import { formatBRL } from "@/utils/format";

export default function CartPage() {
  const { lines, subtotal, itemCount } = useCartLines();
  const clear = useCartStore((state) => state.clear);
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");

  if (lines.length === 0) {
    return (
      <div>
        <BackHeader title="Carrinho" />
        <EmptyState
          emoji="🎀"
          title="Seu carrinho está vazio"
          message="Que tal dar uma olhada nos nossos mimos?"
          ctaLabel="Ver produtos"
          ctaHref="/"
        />
      </div>
    );
  }

  return (
    <div>
      <BackHeader title={`Carrinho · ${itemCount} ${itemCount === 1 ? "item" : "itens"}`} />

      <div className="pt-4">
        <FreeShippingBar subtotal={subtotal} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col gap-4 px-4 pb-4"
      >
        {lines.map((line) => (
          <CartLineItem key={`${line.productId}-${line.variantId ?? "base"}`} line={line} />
        ))}
      </motion.div>

      <div className="flex items-center justify-between px-4 pb-2">
        <Button asChild variant="ghost" size="sm" className="px-2">
          <Link href="/">Continuar comprando</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2 text-error-500 hover:bg-error-50"
          onClick={clear}
        >
          <Trash2 size={14} />
          Limpar carrinho
        </Button>
      </div>

      <div className="mx-4 mb-4 rounded-2xl bg-neutral-0 p-4 shadow-card">
        <div className="flex items-center justify-between text-sm text-ink/70">
          <span>Subtotal</span>
          <span>{formatBRL(subtotal)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between font-display text-lg font-semibold text-plum">
          <span>Total</span>
          <span>{formatBRL(subtotal)}</span>
        </div>
        <p className="mt-1 text-micro text-ink/50">
          Frete e forma de pagamento combinados diretamente no WhatsApp.
        </p>
      </div>

      <div className="mx-4 mb-4 flex flex-col gap-3 rounded-2xl bg-neutral-0 p-4 shadow-card">
        <div>
          <label htmlFor="customer-name" className="mb-1 block text-xs font-semibold text-ink/60">
            Seu nome (opcional)
          </label>
          <input
            id="customer-name"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Como podemos te chamar?"
            className="w-full rounded-full border border-rose-100 bg-cream px-4 py-2.5 text-sm text-ink placeholder:text-ink/50 focus:border-rose-300"
          />
        </div>
        <div>
          <label htmlFor="order-note" className="mb-1 block text-xs font-semibold text-ink/60">
            Observação (opcional)
          </label>
          <textarea
            id="order-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: preciso até sexta-feira"
            rows={2}
            className="w-full resize-none rounded-2xl border border-rose-100 bg-cream px-4 py-2.5 text-sm text-ink placeholder:text-ink/50 focus:border-rose-300"
          />
        </div>
      </div>

      <RecommendationSection
        provider={cartRecommendationProvider}
        title="Complete seu Pedido"
        source="cart"
      />

      {/* Sticky checkout bar, sits above the bottom nav */}
      <div className="fixed inset-x-0 bottom-[64px] z-30 mx-auto max-w-md border-t border-rose-100 bg-neutral-0/95 px-4 py-4 backdrop-blur">
        <WhatsAppCheckoutButton lines={lines} subtotal={subtotal} customerName={customerName} note={note} />
      </div>
      <div className="h-20" />
    </div>
  );
}
