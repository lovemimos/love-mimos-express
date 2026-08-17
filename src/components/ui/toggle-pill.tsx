"use client";

import { cn } from "@/lib/utils";

/**
 * Generic active/inactive pill toggle. Used for category filters and for
 * product variant selection — both need the exact same visual state
 * (active = solid plum, inactive = outlined) so the styling lives here
 * once instead of being copy-pasted per feature.
 */
export default function TogglePill({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition active:scale-95",
        active
          ? "border-plum bg-plum text-white shadow-lift"
          : "border-rose-100 bg-neutral-0 text-ink/70",
        className
      )}
    >
      {children}
    </button>
  );
}
