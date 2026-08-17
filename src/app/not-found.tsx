import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
      <BrandLogo variant="icon" theme="dark" size="lg" />
      <span className="font-display text-h1 text-plum">404</span>
      <h1 className="font-display text-lg font-semibold text-plum">
        Essa página não existe
      </h1>
      <p className="max-w-xs text-sm text-ink/50">
        O link pode estar errado ou o produto pode não estar mais disponível.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-rose-500 px-6 text-sm font-semibold text-white transition active:scale-95"
      >
        Voltar para a loja
      </Link>
    </div>
  );
}
