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
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex min-h-11 max-w-full shrink-0 items-center justify-center gap-2 whitespace-normal break-words rounded-full border px-4 py-2 text-xs font-semibold transition active:scale-95 [overflow-wrap:anywhere]",
        active
          ? "border-plum bg-plum text-white shadow-lift"
          : "border-rose-100 bg-neutral-0 text-ink/70",
        disabled && "cursor-not-allowed opacity-45",
        className
      )}
    >
      {children}
    </button>
  );
}
