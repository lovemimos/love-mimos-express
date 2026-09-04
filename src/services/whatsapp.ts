import { STORE_CONFIG } from "@/lib/config";
import { formatBRL } from "@/utils/format";
import type { CartLineWithProduct } from "@/types";
import type { CartLine } from "@/types";
import { effectivePrice, orderIssue } from "@/lib/purchase-validation";

export type WhatsAppMessageOptions = {
  /** Nome da cliente — opcional, "identificação do cliente (caso exista)"
   * per Sprint 11. Não há login/conta, então isso só existe se a
   * própria cliente digitar no carrinho antes de finalizar. */
  customerName?: string;
  /** Observação livre da cliente (ex.: "entregar até sexta"). */
  note?: string;
};

/**
 * URL pública do app, só incluída na mensagem se estiver configurada de
 * verdade (não o domínio placeholder). Ver docs/BRAND_GUIDELINES.md §6 —
 * mesma variável `NEXT_PUBLIC_SITE_URL` usada no Open Graph.
 */
function getAppUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url || url.includes("example.com")) return undefined;
  return url;
}

export function buildWhatsAppOrderMessage(
  lines: CartLineWithProduct[],
  subtotal: number,
  options: WhatsAppMessageOptions = {}
): string {
  const issue = orderIssue(lines);
  if (issue) throw new Error(issue);
  // Never trust cached/client-supplied totals or variant objects.
  subtotal = lines.reduce((sum, line) => sum + effectivePrice(line.product, line.variantId)! * line.quantity, 0);
  const header = `Olá, ${STORE_CONFIG.name}! ✨\nGostaria de fazer o seguinte pedido:\n`;

  const items = lines
    .map((line) => {
      const variant = line.product.variants?.find((v) => v.id === line.variantId);
      const variantLabel = variant ? ` (${variant.label})` : "";
      const unitPrice = effectivePrice(line.product, line.variantId)!;
      return `• ${line.quantity}x ${line.product.name}${variantLabel} — ${formatBRL(
        unitPrice
      )} un. — Subtotal: ${formatBRL(unitPrice * line.quantity)}`;
    })
    .join("\n");

  const customerLine = options.customerName?.trim()
    ? `\nCliente: ${options.customerName.trim()}`
    : "";
  const noteLine = options.note?.trim() ? `\nObservação: ${options.note.trim()}` : "";
  const appUrl = getAppUrl();
  const appLine = appUrl ? `\nApp: ${appUrl}` : "";

  const footer = `\n\nSubtotal: ${formatBRL(subtotal)}\nTotal: ${formatBRL(subtotal)}${customerLine}${noteLine}${appLine}\n\nAguardo a confirmação, obrigada! 💕`;

  return `${header}\n${items}${footer}`;
}

/** Read-only server validation against the current PostgreSQL catalog. */
export async function requestWhatsAppOrder(lines: CartLine[], options: WhatsAppMessageOptions = {}): Promise<string> {
  const response = await fetch("/api/checkout/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lines: lines.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })), ...options }),
  });
  const result = await response.json();
  if (!response.ok || typeof result.url !== "string") throw new Error(result.error ?? "Não foi possível validar o pedido. Tente novamente.");
  return result.url;
}

export function buildWhatsAppUrl(message: string): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encoded}`;
}

/**
 * Attempts to open the WhatsApp checkout link in a new tab. Returns
 * `true`/`false` instead of assuming success — `window.open` returns
 * `null` (or a handle to an immediately-closed window) when blocked by
 * a popup blocker, which neither call site previously checked (a real
 * bug found during the Sprint 11 MVP review: the button would silently
 * do nothing). Callers show a fallback link when this returns `false` —
 * see `WhatsAppFallbackNotice` (src/components/ui/).
 */
export function tryOpenWhatsApp(url: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    return Boolean(win);
  } catch {
    return false;
  }
}
