import { useEffect } from "react";
import { List, useListRef, type RowComponentProps } from "react-window";

interface VirtualizedListProps<T> {
  items: T[];
  height?: number;
  itemHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

/**
 * Lista virtualizada genérica usando react-window.
 * Ideal para listas com mais de ~100 itens que podem causar
 * jank em renderização DOM completa.
 *
 * Uso: substituir `.map()` simples por <VirtualizedList>
 */
export function VirtualizedList<T>({
  items,
  height = 600,
  itemHeight = 52,
  renderItem,
  className,
}: VirtualizedListProps<T>) {
  const listRef = useListRef(null);

  // Reset scroll quando items mudam
  useEffect(() => {
    listRef.current?.scrollToRow({ index: 0 });
  }, [items, listRef]);

  if (items.length === 0) return null;

  const Row = ({ index, style }: RowComponentProps<{ items: T[]; renderItem: (item: T, index: number) => React.ReactNode }>) => (
    <div style={style}>{renderItem(items[index], index)}</div>
  );

  return (
    <List
      listRef={listRef}
      style={{ height: Math.min(height, items.length * itemHeight) }}
      rowCount={items.length}
      rowHeight={itemHeight}
      className={className}
      rowComponent={Row}
      rowProps={{ items, renderItem }}
    />
  );
}
