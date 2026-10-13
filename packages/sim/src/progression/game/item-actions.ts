import { type Equipment, type EquipmentSlot } from "../../items/types";
import { learnFromItem } from "../codex";
import {
  type GridPosition,
  type PlacedItem,
  addToGrid,
  INVENTORY_SIZE,
  packGrid,
  placeAt,
  STASH_SIZE,
} from "../inventory";
import { requireCamp } from "./actions";
import { equipBlockReason, salvageValue, targetSlot, unequipBlockReason } from "./item-rules";
import { type GameData, type GameState, fail } from "./state";

function findInInventory(state: GameState, itemId: string): PlacedItem {
  return state.inventory.find((p) => p.item.id === itemId) ?? fail("Item not in the inventory");
}

/** Equips from the inventory or (in the Camp) the stash; the old item goes back there. */
export function equipFromInventory(
  state: GameState,
  data: GameData,
  itemId: string,
  preferred?: EquipmentSlot,
): GameState {
  const fromStash = state.stash.find((p) => p.item.id === itemId);
  const placed = fromStash ?? findInInventory(state, itemId);
  const from = fromStash ? "stash" : "inventory";
  const reason = equipBlockReason(state, data, placed.item, from, preferred);
  if (reason) return fail(`Cannot equip: ${reason}`);
  const slot =
    targetSlot(placed.item, data, state.hero.equipment, preferred) ?? fail("No slot for this item");
  const old = state.hero.equipment[slot];
  const source = (fromStash ? state.stash : state.inventory).filter((p) => p !== placed);
  const size = fromStash ? STASH_SIZE : INVENTORY_SIZE;
  const back = old ? (addToGrid(source, old, data.items, size) ?? fail("No room")) : source;
  return {
    ...state,
    ...(fromStash ? { stash: back } : { inventory: back }),
    hero: { ...state.hero, equipment: { ...state.hero.equipment, [slot]: placed.item } },
  };
}

export function moveItem(
  state: GameState,
  data: GameData,
  itemId: string,
  to: "inventory" | "stash",
  at?: GridPosition,
): GameState {
  requireCamp(state);
  const source = to === "stash" ? state.inventory : state.stash;
  const placed =
    source.find((p) => p.item.id === itemId) ??
    fail(`Item not in the ${to === "stash" ? "inventory" : "stash"}`);
  const target = to === "stash" ? state.stash : state.inventory;
  const size = to === "stash" ? STASH_SIZE : INVENTORY_SIZE;
  const moved =
    (at
      ? placeAt(target, placed.item, at.x, at.y, data.items, size)
      : addToGrid(target, placed.item, data.items, size)) ?? fail("No room");
  const rest = source.filter((p) => p !== placed);
  return to === "stash"
    ? { ...state, inventory: rest, stash: moved }
    : { ...state, inventory: moved, stash: rest };
}

export function sortStash(state: GameState, data: GameData): GameState {
  requireCamp(state);
  return { ...state, stash: packGrid(state.stash, data.items, STASH_SIZE) };
}

export function unequip(
  state: GameState,
  data: GameData,
  slot: EquipmentSlot,
  at?: GridPosition,
): GameState {
  const reason = unequipBlockReason(state, data, slot);
  if (reason) return fail(`Cannot unequip: ${reason}`);
  const item = state.hero.equipment[slot] ?? fail("Slot is empty");
  const inventory =
    (at
      ? placeAt(state.inventory, item, at.x, at.y, data.items)
      : addToGrid(state.inventory, item, data.items)) ?? fail("No room");
  const equipment: Equipment = Object.fromEntries(
    Object.entries(state.hero.equipment).filter(([s]) => s !== slot),
  );
  return { ...state, inventory, hero: { ...state.hero, equipment } };
}

/** Salvage is Thoric's work, so only in the Camp (Timo, after Playtest 2). */
export function salvage(state: GameState, data: GameData, itemId: string): GameState {
  requireCamp(state);
  const placed = findInInventory(state, itemId);
  const { codex } = learnFromItem(state.legacy.codex, placed.item, data.items);
  return {
    ...state,
    inventory: state.inventory.filter((p) => p !== placed),
    wallet: { ...state.wallet, ash: state.wallet.ash + salvageValue(placed.item) },
    legacy: codex === state.legacy.codex ? state.legacy : { ...state.legacy, codex },
  };
}

/** Throws an inventory item away for nothing (to make room on the road). */
export function discard(state: GameState, itemId: string): GameState {
  if (state.run?.phase === "fight") return fail("Not during a fight");
  const placed = findInInventory(state, itemId);
  return { ...state, inventory: state.inventory.filter((p) => p !== placed) };
}

/** Drag & drop inside a grid: the item moves to `at` if it fits there. */
export function placeItem(
  state: GameState,
  data: GameData,
  itemId: string,
  at: GridPosition,
): GameState {
  if (state.run?.phase === "fight") return fail("Not during a fight");
  const inStash = state.stash.some((p) => p.item.id === itemId);
  if (inStash) {
    requireCamp(state);
    const placed = state.stash.find((p) => p.item.id === itemId) ?? fail("No such item");
    const stash = placeAt(state.stash, placed.item, at.x, at.y, data.items, STASH_SIZE);
    return stash ? { ...state, stash } : fail("No room there");
  }
  const placed = findInInventory(state, itemId);
  const inventory = placeAt(state.inventory, placed.item, at.x, at.y, data.items);
  return inventory ? { ...state, inventory } : fail("No room there");
}
