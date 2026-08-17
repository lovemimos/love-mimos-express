"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingBag } from "lucide-react";
import { clsx } from "clsx";
import { useCartCount } from "@/features/cart/store/cart-store";

const ITEMS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/busca", label: "Buscar", icon: Search },
  { href: "/carrinho", label: "Carrinho", icon: ShoppingBag },
];

export default function BottomNav() {
  const pathname = usePathname();
  const count = useCartCount();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-rose-100 bg-neutral-0/95 backdrop-blur">
      <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center gap-1 py-2 text-micro font-medium"
            >
              <span className="relative">
                <Icon
                  size={20}
                  className={clsx(
                    "transition-colors duration-200",
                    active ? "text-rose-500" : "text-ink/50"
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
                {href === "/carrinho" && count > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-micro font-bold text-white">
                    {count}
                  </span>
                )}
              </span>
              <span
                className={clsx(
                  "transition-colors duration-200",
                  active ? "text-rose-500" : "text-ink/50"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
