import type { ReactNode } from "react";

export default function HomeCarousel<T>({
  items,
  keyExtractor,
  renderItem,
  itemClassName = "w-40",
}: {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  itemClassName?: string;
}) {
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2">
      {items.map((item) => (
        <div key={keyExtractor(item)} className={`shrink-0 ${itemClassName}`}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
