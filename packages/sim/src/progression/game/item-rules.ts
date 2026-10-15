import { itemSlotFor, missingRequirements, requiredLevel } from "../../items/equipment";
import { getBase } from "../../items/generate";
import { type Equipment, type EquipmentSlot, type Item } from "../../items/types";
import { PROGRESSION } from "../constants";
import { addToGrid, INVENTORY_SIZE } from "../inventory";
import { addToStash, removeFromStash, tabOf } from "../stash";
import { type GameData, type GameState } from "./state";

/** What may happen to an item right now (equip, take, unequip, move) and what it is worth. */

/** Ash an item is worth. */
export function salvageValue(item: Item): number {
  return PROGRESSION.salvageAsh[item.rarity] * Math.max(1, item.tier);
}

/**
 * Equipment slot an item goes to. Rings fill the first free Ring slot unless the player picked
 * one (`preferred`, the other-Ring shortcut or drag & drop).
 */
export function targetSlot(
  item: Item,
  data: GameData,
  equipment: Equipment,
  preferred?: EquipmentSlot,
): EquipmentSlot | undefined {
  const itemSlot = getBase(data.items, item.baseId).slot;
  const slots = data.equipmentSlots.filter((s) => itemSlotFor(s) === itemSlot);
  if (preferred && slots.includes(preferred)) return preferred;
  return slots.find((s) => !equipment[s]) ?? slots[0];
}

/** Equipment slots an item fits (both Ring slots for a Ring). */
export function slotsFor(item: Item, data: GameData): EquipmentSlot[] {
  const itemSlot = getBase(data.items, item.baseId).slot;
  return data.equipmentSlots.filter((s) => itemSlotFor(s) === itemSlot);
}

export type EquipBlockReason = "fight" | "camp" | "level" | "requirements" | "noSlot" | "noRoom";

/**
 * Why an item cannot be equipped right now. The old item goes to the inventory and is never
 * destroyed, so equipping is blocked when it does not fit.
 */
export function equipBlockReason(
  state: GameState,
  data: GameData,
  item: Item,
  from: "inventory" | "stash" | "pick",
  preferred?: EquipmentSlot,
): EquipBlockReason | undefined {
  if (state.run?.phase === "fight") return "fight";
  if (from === "stash" && state.run) return "camp";
  if (preferred && !slotsFor(item, data).includes(preferred)) return "noSlot";
  const slot = targetSlot(item, data, state.hero.equipment, preferred);
  if (!slot) return "noSlot";
  if (state.hero.level < requiredLevel(item)) return "level";
  if (missingRequirements(item, data.items, state.hero.attributes).length) return "requirements";
  const old = state.hero.equipment[slot];
  if (!old) return undefined;
  // The old item goes back where the new one came from (the same stash tab).
  if (from === "stash") {
    const placed = state.stash.find((p) => p.item.id === item.id);
    const rest = removeFromStash(state.stash, item.id);
    return addToStash(rest, old, data.items, placed ? tabOf(placed) : undefined)
      ? undefined
      : "noRoom";
  }
  const grid =
    from === "pick" ? state.inventory : state.inventory.filter((p) => p.item.id !== item.id);
  return addToGrid(grid, old, data.items, INVENTORY_SIZE) ? undefined : "noRoom";
}

/** Why an item cannot be taken into the inventory (only "noRoom"). */
export function takeBlockReason(
  state: GameState,
  data: GameData,
  item: Item,
): "noRoom" | undefined {
  return addToGrid(state.inventory, item, data.items) ? undefined : "noRoom";
}

export type UnequipBlockReason = "fight" | "noRoom" | "empty" | "camp";

/**
 * Why a worn item cannot come off right now: into the inventory, or (Supply Wagon, Camp only)
 * straight into the stash (`tab`; without one: the first tab with room).
 */
export function unequipBlockReason(
  state: GameState,
  data: GameData,
  slot: EquipmentSlot,
  to: "inventory" | "stash" = "inventory",
  tab?: number,
): UnequipBlockReason | undefined {
  if (state.run?.phase === "fight") return "fight";
  const item = state.hero.equipment[slot];
  if (!item) return "empty";
  if (to === "stash") {
    if (state.run) return "camp";
    return addToStash(state.stash, item, data.items, tab) ? undefined : "noRoom";
  }
  return addToGrid(state.inventory, item, data.items) ? undefined : "noRoom";
}

export type MoveBlockReason = "camp" | "noRoom";

/** Why an item cannot move between inventory and stash (into `tab`) right now. */
export function moveBlockReason(
  state: GameState,
  data: GameData,
  itemId: string,
  to: "inventory" | "stash",
  tab?: number,
): MoveBlockReason | undefined {
  if (state.run) return "camp";
  const source = to === "stash" ? state.inventory : state.stash;
  const placed = source.find((p) => p.item.id === itemId);
  if (!placed) return undefined;
  const fits =
    to === "stash"
      ? addToStash(state.stash, placed.item, data.items, tab)
      : addToGrid(state.inventory, placed.item, data.items, INVENTORY_SIZE);
  return fits ? undefined : "noRoom";
}
