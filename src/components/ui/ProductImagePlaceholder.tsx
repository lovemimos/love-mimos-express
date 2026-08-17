// Todos os valores abaixo são cópias literais dos hex de
// tailwind.config.js (rose-100, rose-300, rose-500, rose-700, plum,
// plum-light, gold) — exceção sancionada às cores via token, porque
// `background: linear-gradient()` em `style` inline não aceita classes
// Tailwind. Ver docs/DESIGN_SYSTEM.md §3.
const PALETTES: Record<string, [string, string]> = {
  cilios: ["#F7E4E4", "#EBAFC1"], // rose-100 -> rose-300
  colas: ["#F7E4E4", "#C6376B"], // rose-100 -> rose-500
  pincas: ["#3B0F2B", "#8B2249"], // plum -> rose-700
  removedores: ["#FDF1F4", "#D4AF7A"], // rose-50 -> gold
  kits: ["#5A1F44", "#C6376B"], // plum-light -> rose-500
  acessorios: ["#F7E4E4", "#D4AF7A"], // rose-100 -> gold
};

/**
 * Stand-in artwork for products until real photography is uploaded.
 * Renders the brand's signature lash-curl motif on a category-tinted
 * gradient so the catalog still feels cohesive and premium pre-launch.
 * Swap the <div> below for a real <Image src={product.images[0]} .../>
 * once photography is available — the aspect ratio/rounding is preserved.
 */
export default function ProductImagePlaceholder({
  categorySlug,
  className = "",
}: {
  categorySlug: string;
  className?: string;
}) {
  const [from, to] = PALETTES[categorySlug] ?? PALETTES.cilios;

  return (
    <div
      className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl ${className}`}
      style={{
        background: `linear-gradient(155deg, ${from} 0%, ${to} 100%)`,
      }}
    >
      <svg
        viewBox="0 0 100 60"
        className="h-2/5 w-2/5 stroke-neutral-0 opacity-90"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 45 C 25 5, 75 5, 95 45"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="4 6"
        />
        <path
          d="M20 40 C 30 15, 40 12, 50 30"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M50 30 C 60 12, 70 15, 80 40"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-neutral-0/70" />
      <span className="absolute bottom-2 left-2 h-1 w-1 rounded-full bg-neutral-0/50" />
    </div>
  );
}
