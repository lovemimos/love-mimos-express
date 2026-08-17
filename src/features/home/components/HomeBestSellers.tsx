import { HomeBadgeSection } from "@/features/home/components/HomeBadgeSection";

export default function HomeBestSellers() {
  return (
    <HomeBadgeSection
      title="Mais Vendidos"
      ctaHref="/busca?ordem=relevancia"
      badge="mais-vendido"
      analyticsSource="home_best_sellers"
    />
  );
}
