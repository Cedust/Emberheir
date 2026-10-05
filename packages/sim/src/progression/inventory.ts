import { getBase } from "../items/generate";
import type { Item, ItemCatalog } from "../items/types";
import { PROGRESSION } from "./constants";

/** An item at a position in the inventory grid (x = column, y = row, top-left cell). */
export interface PlacedItem {
  readonly item: Item;
  readonly x: number;
  readonly y: number;
}

/** A grid cell (drop target). */
export interface GridPosition {
  readonly x: number;
  readonly y: number;
}

export interface GridSize {
  readonly w: number;
  readonly h: number;
}

export const INVENTORY_SIZE: GridSize = {
  w: PROGRESSION.inventoryWidth,
  h: PROGRESSION.inventoryHeight,
};

export const STASH_SIZE: GridSize = {
  w: PROGRESSION.stashWidth,
  h: PROGRESSION.stashHeight,
};

/** How many grid cells an item takes (Ring 1×1, Sword 1×3, Body Armor 2×3, ...). */
export function itemSize(item: Item, catalog: ItemCatalog): GridSize {
  const base = getBase(catalog, item.baseId);
  return base.size ?? PROGRESSION.itemSizes[base.slot];
}

function occupied(placed: readonly PlacedItem[], catalog: ItemCatalog, grid: GridSize) {
  const cells: boolean[] = new Array<boolean>(grid.w * grid.h).fill(false);
  for (const p of placed) {
    const size = itemSize(p.item, catalog);
    for (let dx = 0; dx < size.w; dx++) {
      for (let dy = 0; dy < size.h; dy++) cells[(p.y + dy) * grid.w + p.x + dx] = true;
    }
  }
  return cells;
}

/**
 * First free position for an item, searching column by column from the top left (like D2),
 * or undefined if it does not fit.
 */
export function findSpace(
  placed: readonly PlacedItem[],
  item: Item,
  catalog: ItemCatalog,
  grid: GridSize = INVENTORY_SIZE,
): { readonly x: number; readonly y: number } | undefined {
  const size = itemSize(item, catalog);
  const cells = occupied(placed, catalog, grid);
  for (let x = 0; x + size.w <= grid.w; x++) {
    for (let y = 0; y + size.h <= grid.h; y++) {
      let free = true;
      for (let dx = 0; dx < size.w && free; dx++) {
        for (let dy = 0; dy < size.h && free; dy++) {
          if (cells[(y + dy) * grid.w + x + dx]) free = false;
        }
      }
      if (free) return { x, y };
    }
  }
  return undefined;
}

/** Adds an item at the first free position. Returns undefined if there is no room. */
export function addToGrid(
  placed: readonly PlacedItem[],
  item: Item,
  catalog: ItemCatalog,
  grid: GridSize = INVENTORY_SIZE,
): PlacedItem[] | undefined {
  const spot = findSpace(placed, item, catalog, grid);
  return spot ? [...placed, { item, ...spot }] : undefined;
}

/**
 * Puts an item at a given position (drag & drop). The item itself may already be in the grid:
 * it moves. Returns undefined if it does not fit there.
 */
export function placeAt(
  placed: readonly PlacedItem[],
  item: Item,
  x: number,
  y: number,
  catalog: ItemCatalog,
  grid: GridSize = INVENTORY_SIZE,
): PlacedItem[] | undefined {
  const size = itemSize(item, catalog);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return undefined;
  if (x < 0 || y < 0 || x + size.w > grid.w || y + size.h > grid.h) return undefined;
  const rest = placed.filter((p) => p.item.id !== item.id);
  const cells = occupied(rest, catalog, grid);
  for (let dx = 0; dx < size.w; dx++) {
    for (let dy = 0; dy < size.h; dy++) if (cells[(y + dy) * grid.w + x + dx]) return undefined;
  }
  return [...rest, { item, x, y }];
}

/** Number of cells in use, e.g. for "23 / 40". */
export function usedCells(placed: readonly PlacedItem[], catalog: ItemCatalog): number {
  return placed.reduce((sum, p) => {
    const size = itemSize(p.item, catalog);
    return sum + size.w * size.h;
  }, 0);
}

/**
 * Re-packs a grid: biggest items first, then by slot and name ("Sort" in the stash). If the
 * items do not fit in that order, the grid stays as it is.
 */
export function packGrid(
  placed: readonly PlacedItem[],
  catalog: ItemCatalog,
  grid: GridSize,
): PlacedItem[] {
  const area = (p: PlacedItem) => {
    const size = itemSize(p.item, catalog);
    return size.w * size.h;
  };
  const sorted = [...placed].sort(
    (a, b) =>
      area(b) - area(a) ||
      getBase(catalog, a.item.baseId).slot.localeCompare(getBase(catalog, b.item.baseId).slot) ||
      a.item.name.localeCompare(b.item.name),
  );
  let result: PlacedItem[] = [];
  for (const p of sorted) {
    const next = addToGrid(result, p.item, catalog, grid);
    if (!next) return [...placed];
    result = next;
  }
  return result;
}
