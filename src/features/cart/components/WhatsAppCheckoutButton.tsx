"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import WhatsAppFallbackNotice from "@/components/ui/WhatsAppFallbackNotice";
import { requestWhatsAppOrder, tryOpenWhatsApp } from "@/services/whatsapp";
import type { CartLineWithProduct } from "@/types";
import { orderIssue } from "@/lib/purchase-validation";

export default function WhatsAppCheckoutButton({
  lines,
  customerName,
  note,
}: {
  lines: CartLineWithProduct[];
  subtotal: number;
  customerName?: string;
  note?: string;
}) {
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const issue = orderIssue(lines);
  useEffect(() => { setFallbackUrl(null); setError(null); }, [lines, customerName, note]);

  async function handleCheckout() {
    if (issue || checking) return;
    setChecking(true);
    setError(null);
    setFallbackUrl(null);
    try {
      const url = await requestWhatsAppOrder(lines, { customerName, note });
      setFallbackUrl(tryOpenWhatsApp(url) ? null : url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Atualize o carrinho e tente novamente.");
    } finally { setChecking(false); }
  }

  return (
    <div>
      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          variant="whatsapp"
          size="lg"
          onClick={handleCheckout}
          disabled={Boolean(issue) || checking}
          className="w-full"
        >
          <MessageCircle size={18} fill="white" className="text-whatsapp" />
          {checking ? "Validando pedido..." : "Finalizar pedido no WhatsApp"}
        </Button>
      </motion.div>
      {(issue || error) && <p role="alert" className="mt-2 text-sm text-error-500">{issue || error}</p>}
      {!issue && fallbackUrl && <WhatsAppFallbackNotice url={fallbackUrl} />}
    </div>
  );
}
