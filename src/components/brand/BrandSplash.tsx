"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandLogo } from "@/components/brand/BrandLogo";

/**
 * Brief branded moment shown once per session on first load — this app
 * is opened from a WhatsApp link (see docs/VISION.md), not launched as
 * an installed native app, so a true multi-device Apple splash-image
 * matrix isn't the relevant "splash screen" here. This is the
 * functional equivalent for that context: an instant, on-brand cover
 * while the page settles, using the same tokens as everywhere else
 * (`plum` background, `BrandLogo`, `animate-lash-draw`).
 *
 * Session-scoped (sessionStorage), not shown again on internal
 * navigation — this is a first-impression moment, not a loading spinner
 * for every page.
 */
export function BrandSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("lm-splash-shown")) return;
    setVisible(true);
    sessionStorage.setItem("lm-splash-shown", "true");
    const timer = setTimeout(() => setVisible(false), 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-plum"
          aria-hidden="true"
        >
          <BrandLogo variant="full" theme="light" size="md" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
