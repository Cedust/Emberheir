import type { EquipmentSlot, GridPosition, GridSize } from "@emberheir/sim";

/** What is being dragged: an item from a grid (with the grabbed cell) or from an equipment slot. */
export type DragSource =
  | {
      readonly kind: "grid";
      readonly grid: "inventory" | "stash";
      readonly itemId: string;
      /** The cell of the item the pointer grabbed, so the drop keeps it under the pointer. */
      readonly offset: GridPosition;
      readonly size: GridSize;
    }
  | {
      readonly kind: "slot";
      readonly slot: EquipmentSlot;
      readonly itemId: string;
      readonly size: GridSize;
    };

let current: DragSource | null = null;

export const dragging = (): DragSource | null => current;

export function startDrag(source: DragSource, e: React.DragEvent): void {
  current = source;
  e.dataTransfer.effectAllowed = "move";
  // Firefox only starts a drag with some data.
  e.dataTransfer.setData("text/plain", source.itemId);
}

export function endDrag(): void {
  current = null;
}

/** Drop handlers for a grid: is `at` a valid spot for the dragged item, and what happens. */
export interface GridDrop {
  readonly grid: "inventory" | "stash";
  readonly canDrop: (source: DragSource, at: GridPosition) => boolean;
  readonly onDrop: (source: DragSource, at: GridPosition) => void;
}

/** Drop handlers for an equipment slot. */
export interface SlotDrop {
  readonly canDrop: (source: DragSource) => boolean;
  readonly onDrop: (source: DragSource) => void;
}
