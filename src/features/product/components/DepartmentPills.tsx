"use client";

import TogglePill from "@/components/ui/toggle-pill";
import type { CatalogOption } from "@/hooks/useProducts";

export default function DepartmentPills({
  departments,
  active,
  onSelect,
}: {
  departments: CatalogOption[];
  active: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2">
      <TogglePill active={!active} onClick={() => onSelect("")}>Todos</TogglePill>
      {departments.map((department) => (
        <TogglePill
          key={department.id}
          active={active === department.slug}
          onClick={() => onSelect(department.slug)}
        >
          {department.name}
        </TogglePill>
      ))}
    </div>
  );
}
