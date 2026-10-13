import { type EquipmentSlot, type Item } from "../../items/types";
import { type PlacedItem, addToGrid } from "../inventory";
import { requireRun } from "./actions";
import { equipBlockReason, salvageValue, targetSlot } from "./item-rules";
import {
  type GameData,
  type GameState,
  type ItemPick,
  type Rewards,
  type RunState,
  fail,
} from "./state";

export function requireRewards(state: GameState): { run: RunState; rewards: Rewards } {
  const run = requireRun(state, "rewards");
  return { run, rewards: run.rewards ?? fail("No rewards") };
}

/** Puts an item into its equipment slot; the old one goes to the inventory. */
function equipItem(
  state: GameState,
  data: GameData,
  item: Item,
  inventory: readonly PlacedItem[],
  preferred?: EquipmentSlot,
): GameState {
  const slot =
    targetSlot(item, data, state.hero.equipment, preferred) ?? fail("No slot for this item");
  const old = state.hero.equipment[slot];
  const newInventory = old ? (addToGrid(inventory, old, data.items) ?? fail("No room")) : inventory;
  return {
    ...state,
    inventory: newInventory,
    hero: { ...state.hero, equipment: { ...state.hero.equipment, [slot]: item } },
  };
}

export function pickItem(
  state: GameState,
  data: GameData,
  index: number,
  mode: "equip" | "take",
  slot?: EquipmentSlot,
): GameState {
  const { run, rewards } = requireRewards(state);
  if (rewards.itemPick) return fail("Item already picked");
  const taken = rewards.taken ?? [];
  if (taken.some((t) => t.index === index)) return fail("Item already taken");
  const item = rewards.items[index] ?? fail("No such item");
  let next: GameState;
  if (mode === "equip") {
    const reason = equipBlockReason(state, data, item, "pick", slot);
    if (reason) return fail(`Cannot equip: ${reason}`);
    next = equipItem(state, data, item, state.inventory, slot);
  } else {
    const inventory = addToGrid(state.inventory, item, data.items) ?? fail("No room");
    next = { ...state, inventory };
  }
  const nowTaken = [...taken, { index, kind: mode }];
  // Boss Hoard: more picks left, the rest waits.
  if (nowTaken.length < (rewards.picks ?? 1)) {
    return { ...next, run: { ...run, rewards: { ...rewards, taken: nowTaken } } };
  }
  return finishItemPick(next, run, { ...rewards, taken: nowTaken }, { kind: mode, index });
}

/** Ends the item pick: every card not taken is salvaged. */
function finishItemPick(
  state: GameState,
  run: RunState,
  rewards: Rewards,
  pick: ItemPick,
): GameState {
  const taken = new Set((rewards.taken ?? []).map((t) => t.index));
  const salvaged = rewards.items
    .filter((_, i) => !taken.has(i))
    .reduce((sum, it) => sum + salvageValue(it), 0);
  return {
    ...state,
    wallet: { ...state.wallet, ash: state.wallet.ash + salvaged },
    run: { ...run, rewards: { ...rewards, itemPick: pick, salvagedAsh: salvaged } },
  };
}

/** Salvages every card that was not taken (all of them before the first pick). */
export function salvageAll(state: GameState): GameState {
  const { run, rewards } = requireRewards(state);
  if (rewards.itemPick) return fail("Item already picked");
  return finishItemPick(state, run, rewards, { kind: "salvageAll" });
}

/** Takes one Boon of the Shrine; it counts as this act's until the boss falls. */
export function pickBoon(state: GameState, index: number): GameState {
  const { run, rewards } = requireRewards(state);
  if (!rewards.boonOffer?.length) return fail("No Shrine here");
  if (rewards.boonPick != null) return fail("Boon already taken");
  const pick = rewards.boonOffer[index] ?? fail("No such Boon");
  return {
    ...state,
    boons: { ...state.boons, fresh: [...state.boons.fresh, pick] },
    run: { ...run, rewards: { ...rewards, boonPick: index } },
  };
}

/** True once the item pick (and the Boon, if a Shrine came up) is done. */
export function rewardsDone(rewards: Rewards): boolean {
  return rewards.itemPick !== null && (!rewards.boonOffer?.length || rewards.boonPick != null);
}
