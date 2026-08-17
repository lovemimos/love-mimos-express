"use client";

import { Heart } from "lucide-react";
import { useFavoritesStore, useIsFavorite } from "@/features/favorites/store/favorites-store";
import { trackEvent } from "@/lib/analytics";

export default function FavoriteButton({
  productId,
  size = "md",
  className = "",
}: {
  productId: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const isFavorite = useIsFavorite(productId);
  const toggle = useFavoritesStore((state) => state.toggle);

  const dimension = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? 14 : 18;

  return (
    <button
      type="button"
      aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      aria-pressed={isFavorite}
      onClick={(e) => {
        // FavoriteButton frequentemente vive dentro de um <Link> (ver
        // ProductCard) — nunca deixa o toque navegar para a página do
        // produto em vez de só favoritar.
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
        trackEvent({ name: "favorite_click", productId, action: isFavorite ? "remove" : "add" });
      }}
      className={`flex ${dimension} items-center justify-center rounded-full bg-neutral-0/90 text-rose-500 shadow-card transition active:scale-90 ${className}`}
    >
      <Heart size={iconSize} fill={isFavorite ? "currentColor" : "none"} strokeWidth={2} />
    </button>
  );
}
