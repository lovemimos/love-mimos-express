"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import type { HeroBanner } from "@/types";

const ROTATE_MS = 6000;

/**
 * Accepts one or more banners (`HeroBanner`, see src/types/index.ts) —
 * today `src/lib/data/banners.ts` only has one, so this renders
 * statically; the moment a second banner is added there, this starts
 * auto-rotating between them. No prop or contract change needed either
 * way — this is the "suporte para múltiplos banners" Sprint 9 asked
 * for.
 */
export default function HomeHero({ banners }: { banners: HeroBanner[] }) {
  const [index, setIndex] = useState(0);
  const banner = banners[index];

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banner) return null;

  const isDark = banner.theme === "dark";

  return (
    <section
      className={`mx-4 mb-4 mt-2 overflow-hidden rounded-3xl px-6 py-6 shadow-soft ${
        isDark ? "bg-plum text-white" : "bg-rose-50 text-plum"
      }`}
    >
      {banner.eyebrow && (
        <p
          className={`text-micro font-semibold uppercase tracking-[0.15em] ${
            isDark ? "text-gold" : "text-rose-500"
          }`}
        >
          {banner.eyebrow}
        </p>
      )}
      <h1 className="mt-1 font-display text-h1 leading-tight">{banner.title}</h1>
      {banner.subtitle && (
        <p className={`mt-2 text-sm ${isDark ? "text-white/70" : "text-plum/70"}`}>
          {banner.subtitle}
        </p>
      )}
      <Link
        href={banner.ctaHref}
        onClick={() => trackEvent({ name: "banner_click", bannerId: banner.id })}
        className={`mt-4 inline-block text-xs font-semibold underline-offset-4 hover:underline ${
          isDark ? "text-gold" : "text-rose-500"
        }`}
      >
        {banner.ctaLabel} →
      </Link>

      {banners.length > 1 && (
        <div className="mt-4 flex gap-1.5">
          {banners.map((b, i) => (
            <span
              key={b.id}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-current opacity-90" : "w-1.5 bg-current opacity-30"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
