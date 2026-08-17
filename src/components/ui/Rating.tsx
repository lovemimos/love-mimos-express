import { Star } from "lucide-react";

export default function Rating({
  value,
  count,
  size = 12,
}: {
  value: number;
  count?: number;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1 text-gold">
      <Star size={size} fill="currentColor" strokeWidth={0} />
      <span className="text-xs font-medium text-ink/70">
        {value.toFixed(1)}
        {count !== undefined && (
          <span className="text-ink/50"> ({count})</span>
        )}
      </span>
    </div>
  );
}
