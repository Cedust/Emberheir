import type { Item, ItemCatalog } from "../items/types";
import { PROGRESSION } from "./constants";
import {
  addToGrid,
  packGrid,
  placeAt,
  STASH_SIZE,
  type GridPosition,
  type PlacedItem,
} from "./inventory";

/**
 * Stash tabs (PoE): the Supply Wagon holds `PROGRESSION.stashTabs` grids of `STASH_SIZE`. The
 * stash stays one list of placed items; each one names its tab (`tab`, absent = the first).
 */

export const STASH_TABS: number = PROGRESSION.stashTabs;

export const tabOf = (p: PlacedItem): number => p.tab ?? 0;

/** The items of one tab, without their tab (a plain grid). */
export function stashTab(stash: readonly PlacedItem[], tab: number): PlacedItem[] {
  return stash.filter((p) => tabOf(p) === tab).map(({ item, x, y }) => ({ item, x, y }));
}

/** The stash with one tab's grid replaced by `grid`. */
function withTab(
  stash: readonly PlacedItem[],
  tab: number,
  grid: readonly PlacedItem[],
): PlacedItem[] {
  const tagged = grid.map(({ item, x, y }) => (tab ? { item, x, y, tab } : { item, x, y }));
  return [...stash.filter((p) => tabOf(p) !== tab), ...tagged];
}

const validTab = (tab: number) => Number.isInteger(tab) && tab >= 0 && tab < STASH_TABS;

/**
 * Adds an item to a tab, at `at` or the first free spot. Without a tab it goes into the first
 * tab with room. Returns undefined if it does not fit.
 */
export function addToStash(
  stash: readonly PlacedItem[],
  item: Item,
  catalog: ItemCatalog,
  tab?: number,
  at?: GridPosition,
): PlacedItem[] | undefined {
  if (tab === undefined) {
    for (let t = 0; t < STASH_TABS; t++) {
      const out = addToStash(stash, item, catalog, t, at);
      if (out) return out;
    }
    return undefined;
  }
  if (!validTab(tab)) return undefined;
  const grid = stashTab(stash, tab);
  const placed = at
    ? placeAt(grid, item, at.x, at.y, catalog, STASH_SIZE)
    : addToGrid(grid, item, catalog, STASH_SIZE);
  return placed && withTab(stash, tab, placed);
}

/** The stash without one item. */
export const removeFromStash = (stash: readonly PlacedItem[], itemId: string): PlacedItem[] =>
  stash.filter((p) => p.item.id !== itemId);

/**
 * Moves a stashed item to `at` in `tab` (its own tab or another). Returns undefined if it does
 * not fit there.
 */
export function placeInStash(
  stash: readonly PlacedItem[],
  itemId: string,
  catalog: ItemCatalog,
  tab: number,
  at?: GridPosition,
): PlacedItem[] | undefined {
  const placed = stash.find((p) => p.item.id === itemId);
  if (!placed) return undefined;
  return addToStash(removeFromStash(stash, itemId), placed.item, catalog, tab, at);
}

/** Re-packs one tab ("Sort"); the other tabs stay as they are. */
export function sortStashTab(
  stash: readonly PlacedItem[],
  catalog: ItemCatalog,
  tab: number,
): PlacedItem[] {
  return withTab(stash, tab, packGrid(stashTab(stash, tab), catalog, STASH_SIZE));
}
