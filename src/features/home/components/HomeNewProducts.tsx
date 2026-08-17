import { HomeBadgeSection } from "@/features/home/components/HomeBadgeSection";

export default function HomeNewProducts() {
  return (
    <HomeBadgeSection
      title="Novidades"
      ctaHref="/busca"
      badge="novo"
      analyticsSource="home_new_products"
    />
  );
}
