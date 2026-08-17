import type { Category } from "@/types";

/**
 * "Categoria Principal" — the simple, fixed top-level menu (Sprint:
 * Catálogo Facetado). This is deliberately a short, closed list; every
 * other axis a product can be found by (marca, técnica, efeito,
 * curvatura, espessura, comprimento, cor) is an open, extensible
 * *attribute* on `Product.attributes`, not a category — see
 * `src/lib/facets/registry.ts` and docs/features/faceted-catalog.md.
 */
export const categories: Category[] = [
  { id: "cat-1", name: "Cílios", slug: "cilios", icon: "Feather" },
  { id: "cat-2", name: "Colas e Adesivos", slug: "colas", icon: "Droplet" },
  { id: "cat-3", name: "Pinças", slug: "pincas", icon: "Wand2" },
  { id: "cat-4", name: "Removedores", slug: "removedores", icon: "Sparkles" },
  { id: "cat-5", name: "Higienização", slug: "higienizacao", icon: "Droplets" },
  { id: "cat-6", name: "Acessórios", slug: "acessorios", icon: "Gem" },
  { id: "cat-7", name: "Kits", slug: "kits", icon: "Gift" },
];
