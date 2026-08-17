import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names, resolving Tailwind conflicts (e.g. "px-2 px-4" -> "px-4").
 * Standard shadcn/ui convention — use this instead of raw clsx()/template
 * strings whenever a component accepts a `className` override prop.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
