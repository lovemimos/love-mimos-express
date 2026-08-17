import { clsx } from "clsx";

const STYLES: Record<string, string> = {
  novo: "bg-plum text-white",
  "mais-vendido": "bg-gold text-plum",
  promocao: "bg-rose-500 text-white",
};

const LABELS: Record<string, string> = {
  novo: "Novo",
  "mais-vendido": "Mais vendido",
  promocao: "Promoção",
};

export default function ProductBadge({ type }: { type: keyof typeof STYLES }) {
  return (
    <span
      className={clsx(
        "rounded-full px-2 py-0.5 text-micro font-semibold uppercase tracking-wide",
        STYLES[type]
      )}
    >
      {LABELS[type]}
    </span>
  );
}
