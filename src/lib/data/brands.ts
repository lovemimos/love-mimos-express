import type { Brand } from "@/types";

/**
 * Brands as first-class data — see the domain consolidation note on
 * `Brand` in src/types/index.ts for why this isn't just a string
 * attribute. `description`/`bannerImage`/`seoTitle`/`seoDescription`
 * are ready for a future brand landing page; today only `name`/`slug`
 * are consumed (filter labels, SEO routes).
 */
export const brands: Brand[] = [
  {
    id: "brand-1",
    slug: "maria-sasha",
    name: "Maria Sasha",
    description: "Fios premium para volume russo, feitos para retenção prolongada.",
  },
  {
    id: "brand-2",
    slug: "fadvan",
    name: "Fadvan",
    description: "Especialista em efeitos fox eyes e volume egípcio.",
  },
  {
    id: "brand-3",
    slug: "lash-design-pro",
    name: "Lash Design Pro",
  },
];

export function getBrandBySlug(slug: string): Brand | undefined {
  return brands.find((b) => b.slug === slug);
}
