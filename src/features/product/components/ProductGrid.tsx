"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import ProductCard from "@/features/product/components/ProductCard";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

type EmptyAction = { label: string; onClick: () => void };

export default function ProductGrid({
  products,
  isLoading = false,
  isError = false,
  onRetry,
  emptyTitle = "Nada por aqui ainda",
  emptyMessage = "Tente outra palavra ou explore outra categoria.",
  emptyAction,
}: {
  products: Product[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: EmptyAction;
}) {
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <AlertTriangle size={28} className="text-error-500" />
        <span className="font-display text-lg font-semibold text-plum">
          Não foi possível carregar os produtos
        </span>
        <p className="text-sm text-ink/50">
          Verifique sua conexão e tente novamente.
        </p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry} className="mt-1">
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6" aria-busy="true" aria-label="Carregando produtos">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-neutral-0 shadow-card">
            <div className="aspect-square animate-pulse bg-rose-100/60" />
            <div className="flex flex-col gap-2 px-4 pb-4 pt-3">
              <div className="h-3.5 w-4/5 animate-pulse rounded-full bg-rose-100/60" />
              <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-rose-100/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <span className="font-display text-lg font-semibold text-plum">
          {emptyTitle}
        </span>
        <p className="text-sm text-ink/50">{emptyMessage}</p>
        {emptyAction && (
          <Button variant="secondary" onClick={emptyAction.onClick} className="mt-2">
            {emptyAction.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6"
    >
      {products.map((product) => (
        <motion.div key={product.id} variants={item} className="flex min-w-0 [&>a]:w-full">
          <ProductCard product={product} />
        </motion.div>
      ))}
    </motion.div>
  );
}
