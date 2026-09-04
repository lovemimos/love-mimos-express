import type { MetadataRoute } from "next";

/**
 * Enables "adicionar à tela de início" on mobile browsers. `theme_color`
 * tints the browser chrome; `background_color` is also what iOS/Android
 * use to render a basic auto-generated splash screen (icon centered on
 * that color) when no custom per-device launch images are provided —
 * see docs/BRAND_GUIDELINES.md for why we're relying on that default
 * instead of shipping Apple's full matrix of per-device splash images.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Love Mimos Express",
    short_name: "Love Mimos",
    description: "Mimos premium para Lash Designers — peça em segundos pelo WhatsApp.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFBF8",
    theme_color: "#3B0F2B",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
