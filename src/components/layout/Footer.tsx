import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default function Footer() {
  return <footer className="border-t border-rose-100 bg-rose-50/50 px-5 py-10 lg:px-10">
    <div className="grid gap-8 sm:grid-cols-3">
      <div><BrandLogo /><p className="mt-4 max-w-xs text-sm leading-6 text-ink/60">Mimos e materiais para profissionais da beleza. Escolha no catálogo e finalize com atendimento pelo WhatsApp.</p></div>
      <div><h2 className="mb-4 text-sm font-semibold">Explore a loja</h2><div className="flex flex-col gap-3 text-sm text-ink/70"><Link href="/busca">Catálogo completo</Link><Link href="/favoritos">Meus favoritos</Link><Link href="/carrinho">Meu carrinho</Link></div></div>
      <div><h2 className="mb-4 text-sm font-semibold">Atendimento Love Mimos</h2><a className="text-sm font-semibold text-rose-600" href="https://wa.me/5531992615667" target="_blank" rel="noopener noreferrer">WhatsApp · (31) 99261-5667</a><p className="mt-3 text-sm leading-6 text-ink/60">Consulte entrega, retirada, pagamento e condições de troca diretamente com a loja antes de confirmar o pedido.</p></div>
    </div>
    <p className="mt-8 border-t border-rose-100 pt-5 text-xs text-ink/50">Love Mimos Express · Beleza em cada detalhe.</p>
  </footer>;
}
