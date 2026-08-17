import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EmptyState({
  emoji,
  title,
  message,
  ctaLabel,
  ctaHref,
}: {
  emoji: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
      <span className="text-4xl">{emoji}</span>
      <h2 className="font-display text-lg font-semibold text-plum">{title}</h2>
      <p className="text-sm text-ink/50">{message}</p>
      <Button asChild variant="primary" className="mt-2">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
