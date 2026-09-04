import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://love-mimos-express-sabg.vercel.app";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dev/", "/carrinho", "/favoritos"] }, sitemap: `${origin}/sitemap.xml` };
}
