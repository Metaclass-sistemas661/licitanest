// ═══════════════════════════════════════════════════════════════════════════════
// Componente de Tabela com Drag-and-Drop para reordenação de itens
// Usa @dnd-kit/core + @dnd-kit/sortable (já instalados no projeto)
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

// ╔══════════════════════════════════════════════════════╗
// ║  SortableRow — Linha arrastável                      ║
// ╚══════════════════════════════════════════════════════╝

interface SortableRowProps {
  id: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function SortableRow({ id, disabled, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 50 : undefined,
    backgroundColor: isDragging ? "var(--color-accent)" : undefined,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b last:border-0 group">
      {!disabled && (
        <td className="px-1 py-2 w-8">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 rounded opacity-30 group-hover:opacity-100 transition-opacity"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </td>
      )}
      {children}
    </tr>
  );
}

// ╔══════════════════════════════════════════════════════╗
// ║  DndTable — Tabela com reordenação                   ║
// ╚══════════════════════════════════════════════════════╝

export interface DndTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (item: T) => React.ReactNode;
}

interface DndTableProps<T extends { id: string }> {
  items: T[];
  columns: DndTableColumn<T>[];
  onReorder: (reordered: T[]) => void;
  disabled?: boolean;
  /** Coluna extra no final (ações) */
  renderActions?: (item: T) => React.ReactNode;
}

export function DndTable<T extends { id: string }>({
  items,
  columns,
  onReorder,
  disabled = false,
  renderActions,
}: DndTableProps<T>) {
  const [orderedItems, setOrderedItems] = useState(items);

  // Sincronizar se items mudarem externamente
  if (items !== orderedItems && items.length !== orderedItems.length) {
    setOrderedItems(items);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = orderedItems.findIndex((i) => i.id === active.id);
      const newIndex = orderedItems.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(orderedItems, oldIndex, newIndex);
      setOrderedItems(reordered);
      onReorder(reordered);
    },
    [orderedItems, onReorder],
  );

  const ids = orderedItems.map((i) => i.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                {!disabled && <th className="w-8" />}
                {columns.map((col) => (
                  <th key={col.key} className={col.className ?? "px-3 py-2 text-left"}>
                    {col.header}
                  </th>
                ))}
                {renderActions && <th className="px-3 py-2 w-20" />}
              </tr>
            </thead>
            <tbody>
              {orderedItems.map((item) => (
                <SortableRow key={item.id} id={item.id} disabled={disabled}>
                  {columns.map((col) => (
                    <td key={col.key} className={col.className ?? "px-3 py-2"}>
                      {col.render(item)}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-3 py-2">
                      {renderActions(item)}
                    </td>
                  )}
                </SortableRow>
              ))}
            </tbody>
          </table>
        </div>
      </SortableContext>
    </DndContext>
  );
}

export { SortableRow, arrayMove };
