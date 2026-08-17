import Link from "next/link";

export default function HomeSectionTitle({
  title,
  ctaLabel = "Ver tudo",
  ctaHref,
  onCtaClick,
}: {
  title: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 pb-2">
      <h2 className="font-display text-h2 text-plum">{title}</h2>
      {ctaHref && (
        <Link
          href={ctaHref}
          onClick={onCtaClick}
          className="text-xs font-semibold text-rose-500"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
