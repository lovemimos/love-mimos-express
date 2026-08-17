"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import WhatsAppFallbackNotice from "@/components/ui/WhatsAppFallbackNotice";
import { buildWhatsAppOrderMessage, buildWhatsAppUrl, tryOpenWhatsApp } from "@/services/whatsapp";
import type { CartLineWithProduct } from "@/types";

export default function WhatsAppCheckoutButton({
  lines,
  subtotal,
  customerName,
  note,
}: {
  lines: CartLineWithProduct[];
  subtotal: number;
  customerName?: string;
  note?: string;
}) {
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  function handleCheckout() {
    const message = buildWhatsAppOrderMessage(lines, subtotal, { customerName, note });
    const url = buildWhatsAppUrl(message);
    const opened = tryOpenWhatsApp(url);
    setFallbackUrl(opened ? null : url);
  }

  return (
    <div>
      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          variant="whatsapp"
          size="lg"
          onClick={handleCheckout}
          disabled={lines.length === 0}
          className="w-full"
        >
          <MessageCircle size={18} fill="white" className="text-whatsapp" />
          Finalizar pedido no WhatsApp
        </Button>
      </motion.div>
      {fallbackUrl && <WhatsAppFallbackNotice url={fallbackUrl} />}
    </div>
  );
}
