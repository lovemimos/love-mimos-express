/**
 * Varre um payload bruto inteiro (recursivamente, incluindo arrays e
 * objetos aninhados) procurando qualquer coisa que pareça imagem —
 * tanto pelo NOME da chave (imagem, anexo, attachment, url, thumbnail,
 * midia/media, arquivo/file) quanto pelo FORMATO do valor (uma string
 * que parece uma URL de imagem, com extensão .jpg/.png/.webp/etc.).
 *
 * Existe porque o caminho fixo que o mapper assume hoje
 * (`anexos[].anexo.url`) não encontrou nada para o produto 744931523 —
 * isso pode significar que o produto realmente não tem imagem, OU que
 * a estrutura real é diferente do que documentamos (nunca confirmada
 * contra um payload real). Este scanner não assume nada — só reporta
 * o que encontra.
 */

export type ImageCandidate = {
  path: string;
  key: string;
  value: string;
  looksLikeUrl: boolean;
};

const IMAGE_KEY_PATTERN = /imagem|anexo|attachment|thumbnail|thumb|midia|media|foto|picture|photo/i;
const URL_KEY_PATTERN = /url|link|href|src/i;
const IMAGE_URL_VALUE_PATTERN = /\.(jpe?g|png|webp|gif|bmp|svg)(\?.*)?$/i;
const LOOKS_LIKE_URL_PATTERN = /^https?:\/\//i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function scanForImageCandidates(raw: unknown, path = "$"): ImageCandidate[] {
  const results: ImageCandidate[] = [];

  function visit(node: unknown, currentPath: string, parentKey: string) {
    if (typeof node === "string") {
      const keyLooksImageRelated = IMAGE_KEY_PATTERN.test(parentKey) || URL_KEY_PATTERN.test(parentKey);
      const valueLooksLikeUrl = LOOKS_LIKE_URL_PATTERN.test(node);
      const valueLooksLikeImageUrl = valueLooksLikeUrl && IMAGE_URL_VALUE_PATTERN.test(node);

      if (valueLooksLikeImageUrl || (keyLooksImageRelated && valueLooksLikeUrl)) {
        results.push({ path: currentPath, key: parentKey, value: node, looksLikeUrl: true });
      } else if (IMAGE_KEY_PATTERN.test(parentKey) && node.trim() !== "") {
        results.push({ path: currentPath, key: parentKey, value: node, looksLikeUrl: false });
      }
      return;
    }

    if (typeof node === "number" && IMAGE_KEY_PATTERN.test(parentKey)) {
      results.push({ path: currentPath, key: parentKey, value: String(node), looksLikeUrl: false });
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, i) => visit(item, `${currentPath}[${i}]`, parentKey));
      return;
    }

    if (isPlainObject(node)) {
      for (const [key, value] of Object.entries(node)) {
        visit(value, `${currentPath}.${key}`, key);
      }
    }
  }

  visit(raw, path, "");
  return results;
}

/** Só os candidatos que parecem mesmo uma URL utilizável — o que o
 * mapper usaria para popular `Product.images`. */
export function extractUsableImageUrls(raw: unknown): string[] {
  const candidates = scanForImageCandidates(raw);
  const urls = candidates.filter((c) => c.looksLikeUrl).map((c) => c.value);
  return Array.from(new Set(urls));
}
