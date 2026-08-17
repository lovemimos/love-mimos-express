/**
 * Maps a Nuvemshop category path (e.g. "Extensão de Cílios > CÍLIOS >
 * Volume Brasileiro") to one of the app's 7 existing category slugs —
 * confirmed against `src/lib/data/categories.ts`. Only the real
 * subcategories found under "Extensão de Cílios" in the actual export
 * are mapped here; nothing invented.
 *
 * Only products whose root category is "Extensão de Cílios" are
 * considered at all (per the product decision: NAIL DESIGNER/Sobrancelha
 * are out of scope for this import) — see
 * `isImportableRootCategory()`.
 */
const SUBCATEGORY_TO_SLUG: Record<string, string> = {
  CÍLIOS: "cilios",
  "Colas e Adesivos": "colas",
  Acessórios: "acessorios",
  Removedores: "removedores",
  // "Higienização" só passou a existir como categoria principal na
  // Sprint de Arquitetura do Catálogo — antes disso, "Retenção e
  // Limpeza" (produtos de limpeza/shampoo de retenção) não tinha
  // nenhum destino válido e ficava sempre "ignorado". Correspondência
  // direta de significado, não uma inferência.
  "Retenção e Limpeza": "higienizacao",
};

export const IMPORTABLE_ROOT_CATEGORY = "Extensão de Cílios";

/** A product can have multiple comma-separated category assignments —
 * true if at least one of them has "Extensão de Cílios" as the root. */
export function isImportableRootCategory(categoriasField: string): boolean {
  return categoriasField
    .split(",")
    .map((path) => path.split(">")[0]?.trim())
    .some((root) => root === IMPORTABLE_ROOT_CATEGORY);
}

/**
 * Returns the mapped `categorySlug`, or `null` if none of the product's
 * category paths map to a known slug — the caller is responsible for
 * treating `null` as an ignore reason, never guessing a fallback
 * category on its own.
 *
 * Deliberately does NOT guess a category for products assigned only to
 * the bare root "Extensão de Cílios" with no subcategory — an earlier
 * version of this function defaulted those to `"cilios"`, but
 * investigation (see docs/features/nuvemshop-import.md) confirmed the
 * subcategory genuinely isn't present anywhere in the export for those
 * 43 products (not a parser bug, not a different column, not a
 * different export format) — inferring one from the product name/tags
 * was explicitly ruled out. Those products are excluded from this
 * import (`ignored`) until they're properly categorized in Nuvemshop.
 */
export function mapCategorySlug(categoriasField: string): string | null {
  const paths = categoriasField.split(",").map((p) => p.trim());

  for (const path of paths) {
    const segments = path.split(">").map((s) => s.trim());
    if (segments[0] !== IMPORTABLE_ROOT_CATEGORY) continue;

    const sub = segments[1];
    if (sub && SUBCATEGORY_TO_SLUG[sub]) return SUBCATEGORY_TO_SLUG[sub];
  }

  return null;
}
