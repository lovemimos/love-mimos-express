"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, PackageCheck, Heart } from "lucide-react";
import Header from "@/components/layout/Header";
import ProductGrid from "@/features/product/components/ProductGrid";
import HomeCategories from "@/features/home/components/HomeCategories";
import { useProductQuery } from "@/hooks/useProducts";

export default function HomePage() {
  const { data, isLoading, isError, refetch } = useProductQuery({ pageSize: 12, onlyAvailable: true });
  return (
    <div>
      <Header />
      <section className="premium-hero">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-rose-700">Love Mimos Express · feito para profissionais</p>
          <h1 className="font-display text-4xl leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">Seu talento merece<br /><span className="italic text-rose-600">os melhores mimos.</span></h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-ink/70 sm:text-base">Materiais para lash, nail e beauty designers. Escolha seus favoritos e monte seu pedido direto pelo WhatsApp.</p>
          <Link href="/busca" className="mt-7 inline-flex min-h-12 items-center gap-4 rounded-full bg-ink px-7 py-3 text-sm font-semibold text-white transition hover:bg-rose-600">Explorar o catálogo <ArrowRight size={18} /></Link>
          <p className="mt-4 text-xs text-ink/60">Sem cadastro. Atendimento na conversa.</p>
        </div>
        <div aria-hidden="true" className="hero-signature"><span>love</span><span>every detail.</span></div>
      </section>
      <div className="grid gap-4 border-b border-rose-100 px-5 py-6 sm:grid-cols-3 lg:px-10">
        {[{ icon: Heart, title: "Seu universo beauty", text: "Materiais para a sua rotina profissional" }, { icon: PackageCheck, title: "Escolha com tranquilidade", text: "Preço e estoque conferidos no pedido" }, { icon: MessageCircle, title: "Atendimento pelo WhatsApp", text: "Combine entrega e pagamento com a loja" }].map(({icon: Icon, title, text}) => <div key={title} className="flex items-center gap-3"><Icon size={23} className="shrink-0 text-rose-500" /><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-ink/60">{text}</p></div></div>)}
      </div>
      <HomeCategories />
      <section className="py-6 lg:py-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-4">
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">Encontre seu próximo favorito</p><h2 className="font-display text-3xl text-ink">Disponíveis para você</h2></div>
          <Link href="/busca?disponivel=1" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-rose-600">Ver todos <ArrowRight size={16} /></Link>
        </div>
        <ProductGrid products={data?.items ?? []} isLoading={isLoading} isError={isError} onRetry={() => refetch()} />
        <p className="px-4 text-sm text-ink/60">Explore todos os produtos, marcas e variações no catálogo completo.</p>
      </section>
      <section className="mx-4 mb-10 flex flex-col items-start justify-between gap-5 rounded-3xl bg-rose-50 p-7 sm:flex-row sm:items-center lg:p-10">
        <div><h2 className="font-display text-2xl">Vamos montar seu pedido?</h2><p className="mt-2 text-sm text-ink/60">Tire suas dúvidas com a Love Mimos antes de escolher.</p></div>
        <a href="https://wa.me/5531992615667" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white"><MessageCircle size={18} /> Falar com a loja</a>
      </section>
    </div>
  );
}
