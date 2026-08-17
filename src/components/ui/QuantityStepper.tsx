"use client";

import { Minus, Plus } from "lucide-react";

export default function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-full border border-rose-100 bg-neutral-0 px-1 py-1">
      <button
        type="button"
        aria-label="Diminuir quantidade"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-7 w-7 items-center justify-center rounded-full text-plum transition hover:bg-rose-50 active:scale-90 disabled:opacity-30 disabled:active:scale-100"
      >
        <Minus size={14} />
      </button>
      <span className="w-4 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-7 w-7 items-center justify-center rounded-full text-plum transition hover:bg-rose-50 active:scale-90 disabled:opacity-30 disabled:active:scale-100"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
