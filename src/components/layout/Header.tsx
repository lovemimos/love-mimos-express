"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Search } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useCartCount } from "@/features/cart/store/cart-store";
import { useFavoritesCount } from "@/features/favorites/store/favorites-store";

export default function Header({ showSearch = true }: { showSearch?: boolean }) {
  const cartCount = useCartCount();
  const favoritesCount = useFavoritesCount();

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-rose-100/70 bg-white/95 px-4 py-4 backdrop-blur lg:px-10 lg:py-6">
      <Link href="/" aria-label="Love Mimos Express — início"><BrandLogo variant="full" theme="dark" size="sm" /></Link>
      {showSearch && <form action="/busca" className="order-last flex w-full items-center rounded-full border border-rose-100 bg-rose-50/50 px-4 sm:order-none sm:w-auto sm:flex-1 sm:max-w-md">
        <input name="q" aria-label="Buscar produtos" placeholder="O que você procura hoje?" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />
        <button aria-label="Buscar" className="flex h-11 w-11 shrink-0 items-center justify-center text-rose-600"><Search size={20} /></button>
      </form>}
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
