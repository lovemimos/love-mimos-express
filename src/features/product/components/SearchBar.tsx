"use client";

import { Search, X } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Buscar cílios, colas, kits...",
  label = "Buscar produtos",
}: {
  value: string;
  onChange: (value: string) => void;
  /** Called on Enter or form submit — useful for flushing an
   * otherwise-debounced side effect (e.g. writing to the URL)
   * immediately instead of waiting out the debounce. */
  onSubmit?: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // this is a live-filtering field, never a real navigation/reload
    const trimmed = value.trim();
    if (!trimmed) return; // never "submit" an empty search
    onSubmit?.(trimmed);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="relative">
      <Search
        size={17}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-plum/50"
      />
      <input
        type="text"
        inputMode="search"
        enterKeyHint="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-rose-100 bg-neutral-0 py-4 pl-11 pr-10 text-sm text-ink shadow-card transition-colors placeholder:text-ink/50 focus:border-rose-300"
      />
      {value && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => onChange("")}
          className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-50 text-plum/50 transition active:scale-90"
        >
          <X size={13} />
        </button>
      )}
    </form>
  );
}
