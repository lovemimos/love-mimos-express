/**
 * Which categories are typically used *together* — e.g. cílios são
 * aplicados com cola, então "colas" é complementar a "cilios". This is a
 * **hand-curated mock rule table**, not real "frequently bought
 * together" data (that would require order history from the Tiny ERP,
 * which this app doesn't have access to yet — see docs/API_TINY.md).
 *
 * `CompleteKitStrategy` and `CartBasedStrategy` both read this. When
 * real order-history data becomes available, this file is the only
 * thing that needs replacing — both strategies already treat "which
 * category pairs with which" as an external lookup, not baked-in logic.
 */
export const complementaryCategories: Record<string, string[]> = {
  cilios: ["colas", "acessorios"],
  colas: ["cilios", "removedores"],
  pincas: ["cilios"],
  removedores: ["colas"],
  kits: ["acessorios"],
  acessorios: ["cilios", "colas"],
};

export function getComplementaryCategories(categorySlug: string): string[] {
  return complementaryCategories[categorySlug] ?? [];
}
