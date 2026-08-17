"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useCartCount } from "@/features/cart/store/cart-store";
import { useFavoritesCount } from "@/features/favorites/store/favorites-store";

export default function Header() {
  const cartCount = useCartCount();
  const favoritesCount = useFavoritesCount();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-rose-100/70 bg-cream/90 px-4 py-4 backdrop-blur">
      <BrandLogo variant="full" theme="dark" size="sm" />
      <div className="flex items-center gap-2">
        <Link
          href="/favoritos"
          aria-label="Ver favoritos"
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-neutral-0 text-plum shadow-card transition active:scale-95"
        >
          <Heart size={19} />
          {favoritesCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-micro font-bold text-white animate-cart-pop">
              {favoritesCount}
            </span>
          )}
        </Link>
        <Link
          href="/carrinho"
          aria-label="Ver carrinho"
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-neutral-0 text-plum shadow-card transition active:scale-95"
        >
          <ShoppingBag size={19} />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-micro font-bold text-white animate-cart-pop">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
