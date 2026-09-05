/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Love Mimos Express — token system
        cream: "#FFFFFF", // base background
        plum: {
          DEFAULT: "#211D20", // neutral brand contrast
          light: "#41363D",
        },
        rose: {
          50: "#FDF1F4",
          100: "#F7E4E4",
          300: "#EBAFC1",
          500: "#C6376B", // primary brand accent — CTAs, price highlights
          600: "#A82C58",
          700: "#8B2249",
        },
        gold: {
          DEFAULT: "#D4AF7A", // champagne gold — premium accents, badges
          light: "#E8D3AE",
        },
        ink: "#2B2229", // primary text
        whatsapp: "#25D366",
        // Escala neutra verdadeira (sem matiz de marca) — usar para bordas
        // utilitárias, divisores e texto secundário quando rose-100/ink não
        // forem a escolha certa. Ver docs/DESIGN_SYSTEM.md §3.
        neutral: {
          0: "#FFFFFF",
          50: "#FAF8F7",
          100: "#F1ECEA",
          200: "#E2DAD7",
          300: "#C9BDB9",
          400: "#A89B96",
          500: "#857773",
          600: "#675C59",
          700: "#4A413F",
          800: "#332C2A",
          900: "#211C1B",
        },
        // Cores de feedback de sistema — nunca usar rose (marca) para erro,
        // nem whatsapp (checkout) para sucesso genérico. Ver §3.
        success: {
          50: "#EAF7EF",
          500: "#2F9E5B",
          700: "#1F7A44",
        },
        alert: {
          50: "#FDF3E3",
          500: "#E0A526",
          700: "#B37D14",
        },
        error: {
          50: "#FCEAEA",
          500: "#D93B3B",
          700: "#A62A2A",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-jakarta)", "sans-serif"],
      },
      fontSize: {
        // H3 já é coberto por `text-lg` (18px) nativo do Tailwind — só H1,
        // H2 e Títulos precisam de tamanho exato próprio. Ver
        // docs/DESIGN_SYSTEM.md §4.
        h1: ["1.75rem", { lineHeight: "1.2", fontWeight: "600" }], // 28px
        h2: ["1.375rem", { lineHeight: "1.25", fontWeight: "600" }], // 22px
        title: ["0.9375rem", { lineHeight: "1.4", fontWeight: "500" }], // 15px
        // Tier abaixo de Legendas, só para chrome de UI muito compacto
        // (label do bottom nav, badge numérico, texto "eyebrow") — nunca
        // para conteúdo. Consolida 3 valores arbitrários (9/10/11px) que
        // existiam espalhados pelo código em um único token.
        micro: ["0.6875rem", { lineHeight: "1.3", fontWeight: "500" }], // 11px
      },
      borderRadius: {
        xl2: "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(59, 15, 43, 0.18)",
        card: "0 4px 18px -6px rgba(59, 15, 43, 0.14)",
        lift: "0 14px 34px -10px rgba(198, 55, 107, 0.35)",
        modal: "0 -12px 48px -8px rgba(43, 34, 41, 0.30)",
      },
      keyframes: {
        "lash-draw": {
          "0%": { strokeDashoffset: "220" },
          "100%": { strokeDashoffset: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "cart-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "lash-draw": "lash-draw 1.1s ease-out forwards",
        "fade-up": "fade-up 0.5s ease-out both",
        "cart-pop": "cart-pop 0.35s ease-out",
      },
    },
  },
  plugins: [],
};
