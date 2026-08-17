"use client";

import CategoryIcon from "@/components/ui/CategoryIcon";
import TogglePill from "@/components/ui/toggle-pill";
import type { Category } from "@/types";

export default function CategoryPills({
  categories,
  active,
  onSelect,
}: {
  categories: Category[];
  active: string | null;
  onSelect: (slug: string | null) => void;
}) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2">
      <TogglePill active={active === null} onClick={() => onSelect(null)}>
        Todos
      </TogglePill>
      {categories.map((cat) => (
        <TogglePill
          key={cat.id}
          active={active === cat.slug}
          onClick={() => onSelect(cat.slug)}
        >
          <CategoryIcon name={cat.icon} size={13} />
          {cat.name}
        </TogglePill>
      ))}
    </div>
  );
}
