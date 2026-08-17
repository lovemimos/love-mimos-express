"use client";

import { motion } from "framer-motion";
import { formatBRL } from "@/utils/format";
import { STORE_CONFIG } from "@/lib/config";

export default function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const threshold = STORE_CONFIG.freeShippingThreshold;
  const remaining = Math.max(threshold - subtotal, 0);
  const progress = Math.min((subtotal / threshold) * 100, 100);
  const reached = remaining === 0;

  return (
    <div className="mx-4 mb-4 rounded-2xl bg-rose-50 p-4">
      <p className="text-xs font-medium text-plum">
        {reached
          ? "Você garantiu frete grátis! 🎉"
          : `Faltam ${formatBRL(remaining)} para frete grátis`}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-0">
        <motion.div
          className="h-full rounded-full bg-rose-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
