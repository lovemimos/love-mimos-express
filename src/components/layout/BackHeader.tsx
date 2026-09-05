"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function BackHeader({
  title,
  fallbackHref = "/",
}: {
  title: string;
  /** Where to go if there's no app history to go back to — e.g. when
   * someone opens this page directly from a shared WhatsApp link (this
   * app's primary entry point), `history.length` may be 1 and
   * `router.back()` would silently do nothing. Found during the
   * Sprint 11 MVP review. */
  fallbackHref?: string;
}) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-rose-100/70 bg-cream/90 px-4 py-4 backdrop-blur">
      <button
        onClick={handleBack}
        aria-label="Voltar"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-0 text-plum shadow-card transition active:scale-95"
      >
        <ChevronLeft size={19} />
      </button>
      <h1 className="font-display text-lg font-semibold text-plum">{title}</h1>
      <nav aria-label="Loja" className="ml-auto hidden items-center gap-6 text-sm font-semibold text-rose-600 md:flex"><Link href="/">Início</Link><Link href="/busca">Catálogo</Link><Link href="/carrinho">Carrinho</Link></nav>
    </header>
  );
}
