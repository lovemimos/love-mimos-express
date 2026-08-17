/**
 * A single facet definition — one entry per attribute key the UI knows
 * how to label and filter by. `Product.attributes` itself is an open
 * `Record<string, string>` (see src/types/index.ts) so new keys can
 * exist in data without a type change; this registry is what makes a
 * key show up nicely in filter UI and SEO routes. Adding a new facet
 * (e.g. "gramatura") is a one-entry addition here — never a change to
 * `Product`, the repositories, or the query engine.
 *
 * Marca is deliberately NOT here — it's a first-class `Brand` entity
 * (`src/types/index.ts`, `src/lib/data/brands.ts`), referenced via
 * `Product.brandSlug`, because it needs a page/banner/description/SEO
 * that a plain string facet doesn't. See
 * docs/features/faceted-catalog.md for the full reasoning.
 */
export type FacetDefinition = {
  key: string;
  label: string;
  /** Plural label used in filter section headers ("Técnicas", "Efeitos"). */
  pluralLabel: string;
};

export const FACET_REGISTRY: FacetDefinition[] = [
  { key: "linha", label: "Linha", pluralLabel: "Linhas" },
  { key: "tecnica", label: "Técnica", pluralLabel: "Técnicas" },
  { key: "efeito", label: "Efeito", pluralLabel: "Efeitos" },
  { key: "curvatura", label: "Curvatura", pluralLabel: "Curvaturas" },
  { key: "espessura", label: "Espessura", pluralLabel: "Espessuras" },
  { key: "comprimento", label: "Comprimento", pluralLabel: "Comprimentos" },
  { key: "cor", label: "Cor", pluralLabel: "Cores" },
  { key: "material", label: "Material", pluralLabel: "Materiais" },
  { key: "volume", label: "Volume", pluralLabel: "Volumes" },
];

export const FACET_KEYS = FACET_REGISTRY.map((f) => f.key);

export function getFacetDefinition(key: string): FacetDefinition | undefined {
  return FACET_REGISTRY.find((f) => f.key === key);
}
