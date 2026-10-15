import { learnPower } from "./crucible";
import { type Equipment, type EquipmentSlot } from "../../items/types";
import { learnFromItem } from "../codex";
import {
  addToGrid,
  INVENTORY_SIZE,
  placeAt,
  type GridPosition,
  type PlacedItem,
} from "../inventory";
import {
  addToStash,
  placeInStash,
  removeFromStash,
  sortStashTab,
  STASH_TABS,
  tabOf,
} from "../stash";
import { requireCamp } from "./guards";
import { equipBlockReason, salvageValue, targetSlot, unequipBlockReason } from "./item-rules";
import { fail, type GameData, type GameState } from "./state";

/** Inventory, stash and gear actions outside of the rewards. */

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
  // The old item goes back where the new one came from (the same stash tab).
  const back = !old
    ? source
    : ((fromStash
        ? addToStash(source, old, data.items, tabOf(placed))
        : addToGrid(source, old, data.items, INVENTORY_SIZE)) ?? fail("No room"));
  return {
    ...state,
    ...(fromStash ? { stash: back } : { inventory: back }),
    hero: { ...state.hero, equipment: { ...state.hero.equipment, [slot]: placed.item } },
  };
}

/**
 * Supply Wagon: an item between the inventory and the stash. Into the stash it goes to `tab`
 * (without one: the first tab with room).
 */
export function moveItem(
  state: GameState,
  data: GameData,
  itemId: string,
  to: "inventory" | "stash",
  at?: GridPosition,
  tab?: number,
): GameState {
  requireCamp(state);
  const source = to === "stash" ? state.inventory : state.stash;
  const placed =
    source.find((p) => p.item.id === itemId) ??
    fail(`Item not in the ${to === "stash" ? "inventory" : "stash"}`);
  if (to === "stash") {
    const stash = addToStash(state.stash, placed.item, data.items, tab, at) ?? fail("No room");
    return { ...state, inventory: state.inventory.filter((p) => p !== placed), stash };
  }
  const inventory =
    (at
      ? placeAt(state.inventory, placed.item, at.x, at.y, data.items)
      : addToGrid(state.inventory, placed.item, data.items)) ?? fail("No room");
  return { ...state, inventory, stash: removeFromStash(state.stash, itemId) };
}

/** Re-packs one stash tab. */
export function sortStash(state: GameState, data: GameData, tab = 0): GameState {
  requireCamp(state);
  if (!Number.isInteger(tab) || tab < 0 || tab >= STASH_TABS) return fail("No such stash tab");
  return { ...state, stash: sortStashTab(state.stash, data.items, tab) };
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
  // Ember Crucible: the item's Legendary Power goes into the Power Codex.
  const powers = learnPower(state.powerCodex, placed.item.powerId, placed.item.tier);
  return {
    ...state,
    inventory: state.inventory.filter((p) => p !== placed),
    wallet: { ...state.wallet, ash: state.wallet.ash + salvageValue(placed.item) },
    legacy: codex === state.legacy.codex ? state.legacy : { ...state.legacy, codex },
    ...(powers && powers !== state.powerCodex ? { powerCodex: powers } : {}),
  };
}

/** Throws an inventory item away for nothing (to make room on the road). */
export function discard(state: GameState, itemId: string): GameState {
  if (state.run?.phase === "fight") return fail("Not during a fight");
  const placed = findInInventory(state, itemId);
  return { ...state, inventory: state.inventory.filter((p) => p !== placed) };
}

/**
 * Drag & drop inside a grid: the item moves to `at` if it fits there. A stashed item may move
 * to another stash tab (`tab`; default its own).
 */
export function placeItem(
  state: GameState,
  data: GameData,
  itemId: string,
  at?: GridPosition,
  tab?: number,
): GameState {
  if (state.run?.phase === "fight") return fail("Not during a fight");
  const inStash = state.stash.find((p) => p.item.id === itemId);
  if (inStash) {
    requireCamp(state);
    const stash = placeInStash(state.stash, itemId, data.items, tab ?? tabOf(inStash), at);
    return stash ? { ...state, stash } : fail("No room there");
  }
  if (!at) return fail("No spot given");
  const placed = findInInventory(state, itemId);
  const inventory = placeAt(state.inventory, placed.item, at.x, at.y, data.items);
  return inventory ? { ...state, inventory } : fail("No room there");
}
