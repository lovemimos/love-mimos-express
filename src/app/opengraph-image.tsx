import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Love Mimos Express — mimos premium para Lash Designers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * This is what WhatsApp (and other social previews) render when someone
 * shares a link to the store — see docs/BRAND_GUIDELINES.md.
 *
 * Font note: this uses a generic serif fallback rather than the real
 * Fraunces brand typeface. Loading a custom font here requires fetching
 * font bytes at build/request time (`fetch('https://fonts.gstatic.com/...')`),
 * which this project's build environment cannot do (see the same
 * constraint documented in docs/PROJECT_VISION.md §5 re: next/font/google).
 * In an environment with normal internet access, swap the `fontFamily`
 * below for a loaded Fraunces buffer via ImageResponse's `fonts` option.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(155deg, #3B0F2B 0%, #5A1F44 100%)",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 600,
            color: "#FFFBF8",
            letterSpacing: "-0.02em",
          }}
        >
          Love Mimos
          <span style={{ color: "#EBAFC1", marginLeft: 20 }}>Express</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 32,
            fontFamily: "sans-serif",
            color: "rgba(255,251,248,0.75)",
          }}
        >
          Mimos premium para Lash Designers
        </div>
        <svg
          width="220"
          height="24"
          viewBox="0 0 140 14"
          fill="none"
          style={{ marginTop: 40 }}
        >
          <path
            d="M2 9 C 30 -3, 45 -3, 70 6 C 95 14, 112 4, 138 6"
            stroke="#D4AF7A"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
