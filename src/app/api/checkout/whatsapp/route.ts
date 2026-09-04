import { NextResponse } from "next/server";
import type { CartLine, CartLineWithProduct } from "@/types";
import { orderIssue, effectivePrice } from "@/lib/purchase-validation";
import { buildWhatsAppOrderMessage, buildWhatsAppUrl } from "@/services/whatsapp";

export const dynamic = "force-dynamic";

// Generates a quote only: no order creation, stock mutation or Tiny request.
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 20000) return NextResponse.json({ error: "Pedido muito grande." }, { status: 400 });
    const input = JSON.parse(text);
    const lines: CartLine[] = input?.lines;
    if (!Array.isArray(lines) || !lines.length || lines.length > 100 || lines.some((line) =>
      !line || typeof line.productId !== "string" || (line.variantId !== undefined && typeof line.variantId !== "string") || !Number.isSafeInteger(line.quantity) || line.quantity < 1
    )) return NextResponse.json({ error: "Pedido inválido. Ajuste os itens do carrinho." }, { status: 400 });
    const { catalogService } = await import("@/services/catalog-service");
    const ids = [...new Set(lines.map((line) => line.productId))];
    const { items } = await catalogService.queryProducts({ productIds: ids, pageSize: ids.length });
    const resolved: CartLineWithProduct[] = [];
    for (const line of lines) {
      const product = items.find((item) => item.id === line.productId);
      if (!product) return NextResponse.json({ error: "Produto indisponível. Atualize o carrinho." }, { status: 409 });
      resolved.push({ ...line, product, variant: product.variants?.find((v) => v.id === line.variantId), lineTotal: 0 });
    }
    const issue = orderIssue(resolved);
    if (issue) return NextResponse.json({ error: issue }, { status: 409 });
    const subtotal = resolved.reduce((sum, line) => sum + effectivePrice(line.product, line.variantId)! * line.quantity, 0);
    const message = buildWhatsAppOrderMessage(resolved, subtotal, {
      customerName: typeof input.customerName === "string" ? input.customerName.slice(0,200) : undefined,
      note: typeof input.note === "string" ? input.note.slice(0,2000) : undefined,
    });
    return NextResponse.json({ url: buildWhatsAppUrl(message) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Não foi possível validar o pedido. Atualize o carrinho e tente novamente." }, { status: error instanceof SyntaxError ? 400 : 503 });
  }
}
