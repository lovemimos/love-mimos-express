/**
 * Sanitizes HTML for safe rendering via `dangerouslySetInnerHTML` —
 * used for product descriptions that may come with basic formatting
 * from an external source (Tiny, Nuvemshop) and are worth preserving
 * rather than flattening to a single line of plain text.
 *
 * Strategy (allowlist, not denylist — safer by construction):
 * 1. Remove `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`
 *    tags AND their inner content entirely (not just the tags).
 * 2. Strip every attribute from every remaining tag — no `onclick=`,
 *    no `style=`, no `href="javascript:..."` can survive, because no
 *    attribute survives at all.
 * 3. Keep only a small allowlist of formatting tags; unwrap (remove
 *    the tag but keep the text inside) anything not on the allowlist.
 * 4. Decode HTML entities.
 *
 * This is deliberately NOT the same utility as
 * `src/lib/import/nuvemshop/sanitize-html.ts` (which strips to plain
 * text) — different goal (preserve safe formatting vs. flatten).
 */

const ALLOWED_TAGS = new Set(["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "span"]);
const REMOVE_WITH_CONTENT = ["script", "style", "iframe", "object", "embed"];

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
  aacute: "á",
  Aacute: "Á",
  acirc: "â",
  Acirc: "Â",
  atilde: "ã",
  Atilde: "Ã",
  agrave: "à",
  eacute: "é",
  Eacute: "É",
  ecirc: "ê",
  iacute: "í",
  oacute: "ó",
  Oacute: "Ó",
  ocirc: "ô",
  Ocirc: "Ô",
  otilde: "õ",
  Otilde: "Õ",
  uacute: "ú",
  ccedil: "ç",
  Ccedil: "Ç",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED_ENTITIES[name] ?? match);
}

export function sanitizeHtmlForDisplay(html: string): string {
  if (!html) return "";

  let result = html;

  // 1. Remove dangerous tags AND their content entirely.
  for (const tag of REMOVE_WITH_CONTENT) {
    result = result.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi"), "");
    result = result.replace(new RegExp(`<${tag}[^>]*/?>`, "gi"), "");
  }

  // 2 & 3. For every remaining tag, keep it (stripped of attributes)
  // only if it's on the allowlist; otherwise unwrap it (drop the tag,
  // keep whatever text was inside — handled naturally since we only
  // ever touch the tag markers themselves, never the text between them).
  result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (fullMatch, tagName: string) => {
    const isClosing = fullMatch.startsWith("</");
    const normalizedTag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(normalizedTag)) return "";
    return isClosing ? `</${normalizedTag}>` : `<${normalizedTag}>`;
  });

  return decodeEntities(result).trim();
}

/** True if the string has any HTML tags at all — used to decide
 * whether a description needs `dangerouslySetInnerHTML` or can just be
 * rendered as plain React text (slightly cheaper, and one less thing
 * that touches the DOM directly when there's nothing to sanitize). */
export function containsHtml(text: string): boolean {
  return /<[a-zA-Z][^>]*>/.test(text);
}
