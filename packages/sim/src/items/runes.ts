import { sumBonuses } from "../combat/stats";
import type { StatBonuses } from "../combat/types";
import { getBase } from "./generate";
import type { Item, ItemCatalog, ItemSlot, RuneGroup, RunewordDefinition } from "./types";

/**
 * Sockets, Runes and Runewords (docs/design/item-system-v1.md section 7). Only Normal items
 * have Sockets. Each socketed Rune gives its small bonus; the exact Runes in order, filling
 * every Socket of a fitting base, also make a Runeword.
 */

/** Which bonus of a Rune a slot uses. */
export function runeGroup(slot: ItemSlot): RuneGroup {
  return slot === "mainHand" ? "weapon" : "armor";
}

/** Free Sockets of an item. */
export function freeSockets(item: Item): number {
  return Math.max(0, (item.sockets ?? 0) - (item.runes?.length ?? 0));
}

/** The Runeword these Runes make in this base, if any (all Sockets must be filled). */
export function matchRuneword(
  catalog: ItemCatalog,
  slot: ItemSlot,
  sockets: number,
  runes: readonly string[],
): RunewordDefinition | undefined {
  if (runes.length === 0 || runes.length !== sockets) return undefined;
  return [...catalog.runewords.values()].find(
    (w) =>
      w.slots.includes(slot) &&
      w.runes.length === runes.length &&
      w.runes.every((r, i) => r === runes[i]),
  );
}

/** The Runeword an item carries, if its Runes make one. */
export function activeRuneword(item: Item, catalog: ItemCatalog): RunewordDefinition | undefined {
  if (item.rarity !== "normal" || !item.runes?.length) return undefined;
  const slot = getBase(catalog, item.baseId).slot;
  return matchRuneword(catalog, slot, item.sockets ?? 0, item.runes);
}

/** The single bonuses of all socketed Runes (they stay on top of a Runeword, as in D2). */
export function runeBonuses(item: Item, catalog: ItemCatalog): StatBonuses {
  const group = runeGroup(getBase(catalog, item.baseId).slot);
  return sumBonuses(...(item.runes ?? []).map((id) => catalog.runes.get(id)?.bonuses[group]));
}
