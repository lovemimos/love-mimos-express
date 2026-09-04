import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";
import { BrandSplash } from "@/components/brand/BrandSplash";
import { QueryProvider } from "@/app/providers";
import FloatingWhatsApp from "@/components/layout/FloatingWhatsApp";

export const metadata: Metadata = {
  // TODO: trocar pelo domínio real antes do lançamento — sem isso, os
  // links de Open Graph/Twitter card ficam relativos a localhost. Mesmo
  // padrão de placeholder já usado para o número do WhatsApp em
  // src/lib/config.ts. Pode ser sobrescrito via NEXT_PUBLIC_SITE_URL
  // (não é segredo — é a própria URL pública da loja).
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://love-mimos-express-sabg.vercel.app"),
  title: { default: "Love Mimos Express | Lash, Nail e Beauty", template: "%s | Love Mimos Express" },
  description:
    "Materiais para lash, nail e beauty designers. Explore produtos, escolha suas variações e monte seu pedido com atendimento pelo WhatsApp.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Love Mimos Express",
    description: "Mimos premium para Lash Designers — peça em segundos pelo WhatsApp.",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Love Mimos Express",
    description: "Mimos premium para Lash Designers — peça em segundos pelo WhatsApp.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewportFit: "cover" é o que faz env(safe-area-inset-*) funcionar de
  // verdade em iPhones com notch/Dynamic Island — sem isso, o padding
  // de safe-area já usado em BottomNav.tsx sempre resolvia para 0,
  // mesmo parecendo implementado corretamente. Bug real encontrado
  // nesta auditoria de produção.
  viewportFit: "cover",
  themeColor: "#3B0F2B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font --
            App Router has no pages/_document.js, so this rule's premise
            doesn't apply here; loaded once in the root layout on purpose. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-cream text-ink font-sans antialiased">
        <BrandSplash />
        <QueryProvider>
          <div className="store-shell mx-auto flex min-h-dvh w-full max-w-7xl flex-col bg-white">
            <main className="flex-1 pb-24">{children}</main>
            <Footer />
            <FloatingWhatsApp />
            <BottomNav />
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
