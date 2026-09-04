import { normalizeSearchText } from "@/utils/normalize-text";

export type ClassificationConfidence = "high" | "medium" | "low";

export type CatalogClassification = {
  categorySlug: string;
  brandSlug?: string;
  brandName?: string;
  productType: "simples" | "com-variacoes";
  confidence: ClassificationConfidence;
  source: "manual" | "automatic" | "existing";
  reasons: string[];
};

type ClassificationInput = {
  tinyId?: string;
  name: string;
  description?: string;
  shortDescription?: string;
  categorySlug: string;
  brandSlug?: string;
  brandName?: string;
  variantCount?: number;
};

// Version-controlled overrides are deliberately separate from the automatic
// rules. A later manual correction wins without deleting the original Tiny
// category/brand stored in PostgreSQL.
export const MANUAL_CLASSIFICATION_OVERRIDES: Record<
  string,
  Partial<Pick<CatalogClassification, "categorySlug" | "brandSlug" | "brandName">>
> = {};

const BRANDS: Array<[RegExp, string, string]> = [
  [/\bcherry(?:\s+lash)?\b/, "cherry", "Cherry"],
  [/\bbeautify\s*pro\b/, "beautifypro", "Beautifypro"],
  [/\bnagaraku\b/, "nagaraku", "Nagaraku"],
  [/\bfadvan\b/, "fadvan", "Fadvan"],
  [/\bmaria\s+sasha\b/, "maria-sasha", "Maria Sasha"],
  [/\bvetus\b/, "vetus", "Vetus"],
  [/\bvolia\b/, "volia", "Volia"],
  [/\bsioux\b/, "sioux", "Sioux"],
  [/\bdecemars\b/, "decemars", "Decemars"],
  [/\bmacy\b/, "macy", "Macy"],
  [/\btomate\b/, "tomate", "Tomate"],
];

function inferredCategory(text: string, current: string): { slug?: string; reason?: string } {
  if (/\bremovedor\b/.test(text)) return { slug: "removedores", reason: "removedor no título" };
  if (/\b(bico|suporte|anel|pedra|porta)\b.*\bcola\b|\bcola\b.*\b(bico|suporte|anel|pedra|porta)\b/.test(text)) {
    return { slug: "acessorios-para-cola", reason: "acessório específico para cola" };
  }
  if (/\b(cola|adesivo)\b/.test(text)) return { slug: "colas-e-adesivos", reason: "cola ou adesivo no título" };
  if (/\b(pinca|pinça)\b/.test(text) && current !== "nail-designer" && current !== "sobrancelhas") {
    return { slug: "pincas", reason: "pinça profissional no título" };
  }
  if (/\bmini kit\b|\bkit retencao\b/.test(text) && current !== "nail-designer") {
    return { slug: "kits", reason: "kit profissional no título" };
  }
  if (/\b(fita|transpore|micropore)\b/.test(text)) return { slug: "fitas-e-isolamento", reason: "fita de isolamento no título" };
  return {};
}

export function classifyCatalogProduct(input: ClassificationInput): CatalogClassification {
  const title = normalizeSearchText(input.name);
  const override = input.tinyId ? MANUAL_CLASSIFICATION_OVERRIDES[input.tinyId] : undefined;
  // Category changes require a high-confidence signal in the title. Long
  // descriptions often mention complementary items (cola, fita, pinça) and
  // must not move an otherwise correctly classified product.
  const category = inferredCategory(title, input.categorySlug);
  const reasons: string[] = [];
  let brandSlug = input.brandSlug;
  let brandName = input.brandName;

  if (!brandSlug) {
    const brand = BRANDS.find(([pattern]) => pattern.test(title));
    if (brand) {
      brandSlug = brand[1];
      brandName = brand[2];
      reasons.push("marca identificada no conteúdo do produto");
    }
  }
  if (category.slug && category.slug !== input.categorySlug) reasons.push(category.reason!);

  if (override) {
    return {
      categorySlug: override.categorySlug ?? category.slug ?? input.categorySlug,
      brandSlug: override.brandSlug ?? brandSlug,
      brandName: override.brandName ?? brandName,
      productType: input.variantCount ? "com-variacoes" : "simples",
      confidence: "high",
      source: "manual",
      reasons: [...reasons, "correção manual versionada"],
    };
  }

  return {
    categorySlug: category.slug ?? input.categorySlug,
    brandSlug,
    brandName,
    productType: input.variantCount ? "com-variacoes" : "simples",
    confidence: reasons.length ? "high" : input.categorySlug ? "medium" : "low",
    source: reasons.length ? "automatic" : "existing",
    reasons,
  };
}
