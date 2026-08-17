/**
 * Decide se uma string em `Product.images[]` é de fato utilizável como
 * `src` de imagem — nunca presume que "não estar vazio" é suficiente.
 *
 * Existe porque o catálogo carrega, desde os primeiros mocks (antes de
 * qualquer importação real), valores como `"lash-1"`/`"lash-2"` —
 * identificadores de gradiente de placeholder, nunca URLs de verdade.
 * Isso nunca deu erro porque nada tentava renderizar esses valores
 * como imagem — até `next/image` passar a ser usado, quando qualquer
 * string nessa forma quebra com `Failed to parse src`.
 *
 * Regra: válido só se começar com `http://`, `https://`, ou `/`
 * (caminho local absoluto a partir da raiz do site). Qualquer outra
 * coisa — incluindo ids de placeholder como "lash-1" — é descartada.
 */
export function isValidImageReference(value: string): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/");
}

/**
 * Filtra uma lista de imagens, mantendo só as referências válidas —
 * usada por `ProductImage` (e por qualquer script que grave o
 * catálogo) como o único ponto de decisão "isso é uma imagem de
 * verdade ou lixo legado".
 */
export function normalizeImageUrls(images: string[] | undefined): string[] {
  if (!images) return [];
  return images.filter(isValidImageReference);
}
