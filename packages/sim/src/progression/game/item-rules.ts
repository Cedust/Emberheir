import { itemSlotFor, missingRequirements, requiredLevel } from "../../items/equipment";
import { getBase } from "../../items/generate";
import { type Equipment, type EquipmentSlot, type Item } from "../../items/types";
import { PROGRESSION } from "../constants";
import { addToGrid, INVENTORY_SIZE, STASH_SIZE } from "../inventory";
import { type GameData, type GameState } from "./state";

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
  // The old item goes back where the new one came from.
  const source = from === "stash" ? state.stash : state.inventory;
  const grid = from === "pick" ? source : source.filter((p) => p.item.id !== item.id);
  return addToGrid(grid, old, data.items, from === "stash" ? STASH_SIZE : INVENTORY_SIZE)
    ? undefined
    : "noRoom";
}

/** Why an item cannot be taken into the inventory (only "noRoom"). */
export function takeBlockReason(
  state: GameState,
  data: GameData,
  item: Item,
): "noRoom" | undefined {
  return addToGrid(state.inventory, item, data.items) ? undefined : "noRoom";
}

export type UnequipBlockReason = "fight" | "noRoom" | "empty";

export function unequipBlockReason(
  state: GameState,
  data: GameData,
  slot: EquipmentSlot,
): UnequipBlockReason | undefined {
  if (state.run?.phase === "fight") return "fight";
  const item = state.hero.equipment[slot];
  if (!item) return "empty";
  return addToGrid(state.inventory, item, data.items) ? undefined : "noRoom";
}

export type MoveBlockReason = "camp" | "noRoom";

/** Why an item cannot move between inventory and stash right now. */
export function moveBlockReason(
  state: GameState,
  data: GameData,
  itemId: string,
  to: "inventory" | "stash",
): MoveBlockReason | undefined {
  if (state.run) return "camp";
  const source = to === "stash" ? state.inventory : state.stash;
  const placed = source.find((p) => p.item.id === itemId);
  if (!placed) return undefined;
  const target = to === "stash" ? state.stash : state.inventory;
  const size = to === "stash" ? STASH_SIZE : INVENTORY_SIZE;
  return addToGrid(target, placed.item, data.items, size) ? undefined : "noRoom";
}
