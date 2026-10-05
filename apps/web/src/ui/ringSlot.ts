import { GAME_DATA } from "@emberheir/content";
import {
  type EquipmentSlot,
  type GameState,
  type Item,
  slotsFor,
  targetSlot,
} from "@emberheir/sim";
import { useSyncExternalStore } from "react";

/**
 * The other-Ring shortcut: which Ring slot compare and Equip aim at. `undefined` = the game's
 * default (first free Ring slot). Shared by every screen, reset after each equip.
 */
let preferred: EquipmentSlot | undefined;
const listeners = new Set<() => void>();

function set(slot: EquipmentSlot | undefined) {
  preferred = slot;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetRingSlot(): void {
  if (preferred) set(undefined);
}

/** The slot an item would go to right now, honouring the Ring shortcut. */
export function aimedSlot(state: GameState, item: Item): EquipmentSlot | undefined {
  return targetSlot(item, GAME_DATA, state.hero.equipment, preferred);
}

/** The preferred slot for this item, if it is one of several (Rings), else undefined. */
export function preferredSlotFor(item: Item): EquipmentSlot | undefined {
  return preferred && slotsFor(item, GAME_DATA).includes(preferred) ? preferred : undefined;
}

export function useRingSlot(): EquipmentSlot | undefined {
  return useSyncExternalStore(subscribe, () => preferred);
}

/** Aims compare and Equip at the item's other slot (Ring 1 ⇄ Ring 2). */
export function switchSlot(state: GameState, item: Item): void {
  const slots = slotsFor(item, GAME_DATA);
  const now = aimedSlot(state, item);
  set(slots.find((s) => s !== now));
}
