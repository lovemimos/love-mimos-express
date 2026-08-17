const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  ldquo: "\u201c",
  rdquo: "\u201d",
  lsquo: "\u2018",
  rsquo: "\u2019",
  deg: "°",
  ordm: "º",
  ordf: "ª",
  asymp: "≈",
  acute: "´",
  aacute: "á",
  Aacute: "Á",
  acirc: "â",
  Acirc: "Â",
  atilde: "ã",
  Atilde: "Ã",
  agrave: "à",
  Agrave: "À",
  eacute: "é",
  Eacute: "É",
  ecirc: "ê",
  Ecirc: "Ê",
  egrave: "è",
  iacute: "í",
  Iacute: "Í",
  icirc: "î",
  oacute: "ó",
  Oacute: "Ó",
  ocirc: "ô",
  Ocirc: "Ô",
  otilde: "õ",
  Otilde: "Õ",
  ograve: "ò",
  uacute: "ú",
  Uacute: "Ú",
  ucirc: "û",
  ugrave: "ù",
  ccedil: "ç",
  Ccedil: "Ç",
};

/**
 * Nuvemshop's `Descrição` field contains raw HTML — real product
 * descriptions in the actual export include `<p>` tags, HTML entities
 * (`&acirc;`), and in a few cases leftover markup from a previous
 * e-commerce platform (an old `<form action="...">` snippet). None of
 * that should ever reach `Product.description`, which the app renders
 * as plain text (no `dangerouslySetInnerHTML` anywhere in the UI).
 */
export function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ") // remove tags
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))) // numeric entities
    .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED_ENTITIES[name] ?? match) // named entities
    .replace(/\s+/g, " ")
    .trim();
}
