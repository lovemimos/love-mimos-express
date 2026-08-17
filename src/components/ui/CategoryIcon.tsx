import { Feather, Droplet, Droplets, Wand2, Sparkles, Gift, Gem, type LucideProps } from "lucide-react";

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  Feather,
  Droplet,
  Droplets,
  Wand2,
  Sparkles,
  Gift,
  Gem,
};

export default function CategoryIcon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon {...props} />;
}
