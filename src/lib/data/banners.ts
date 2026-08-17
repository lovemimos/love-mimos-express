import type { HeroBanner } from "@/types";

/**
 * Today: a single banner, preserving the exact copy the Home hero
 * already had before Sprint 9. `HomeHero` accepts an array and already
 * knows how to render more than one (as a carousel) — adding a second
 * banner here is the only change needed to try that.
 */
export const banners: HeroBanner[] = [
  {
    id: "banner-lancamento",
    eyebrow: "Lash Designers",
    title: "Seus mimos favoritos, a um WhatsApp de distância",
    subtitle: "Monte seu pedido e finalize direto na conversa. Sem app, sem cadastro.",
    ctaLabel: "Ver catálogo",
    ctaHref: "/busca",
    theme: "dark",
  },
];
