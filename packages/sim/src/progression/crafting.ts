import { affixPool, rollQuality, statAffixValue, unlockedStages } from "../items/affixes";
import { ITEMS } from "../items/constants";
import { missingRequirements } from "../items/equipment";
import { getBase, rollItem } from "../items/generate";
import type { AffixRoll, EquipmentSlot, Item, ItemCatalog } from "../items/types";
import type { Rng } from "../rng";
import { CRAFTING } from "./constants";
import { type GameData, type GameState, fail, nextRng, requireCamp } from "./game";

/**
 * Camp crafting (docs/design/town-crafting-v1.md section 3, Persona mock): Thoric upgrades the
 * Item Tier, Liora rerolls affixes (Reforge, Temper, Imbue) and distills Reforge Stones.
 * Salvage stays the existing `salvage` action. There is no Undo.
 *
 * Affix Lock (like the Mystic in Diablo 3): after Temper or Imbue, only that affix can be
 * changed again; Reforge clears the lock.
 */

export type CraftRequest =
  | { readonly kind: "upgrade"; readonly itemId: string }
  | { readonly kind: "reforge"; readonly itemId: string }
  | { readonly kind: "temper"; readonly itemId: string; readonly affixIndex: number }
  | {
      readonly kind: "imbue";
      readonly itemId: string;
      readonly affixIndex: number;
      readonly essenceId: string;
    }
  | { readonly kind: "distill" };

export type CraftKind = CraftRequest["kind"];

/** Liora joins the caravan with Kaelen, after the first act boss. */
export const MYSTIC_CRAFTS: readonly CraftKind[] = ["reforge", "temper", "imbue", "distill"];

export interface CraftCost {
  readonly gold: number;
  readonly dust: number;
  readonly reforgeStones: number;
  readonly ascensionShards: number;
  /** Essences by id. */
  readonly essences: Readonly<Record<string, number>>;
}

export type CraftBlockReason =
  | "camp"
  /** Liora has not joined the caravan yet. */
  | "mystic"
  | "noItem"
  | "maxTier"
  /** An equipped item would stop working: its new requirements are not met. */
  | "requirements"
  | "noAffixes"
  | "noAffix"
  | "locked"
  | "trigger"
  | "unknownEssence"
  | "affixDoesNotFit"
  | "duplicateAffix"
  | "gold"
  | "dust"
  | "reforgeStones"
  | "ascensionShards"
  | "essence";

/** Where a craftable item is: equipped or in the inventory (the stash is not at the forge). */
export interface CraftItemLocation {
  readonly item: Item;
  readonly slot?: EquipmentSlot;
}

export function findCraftItem(state: GameState, itemId: string): CraftItemLocation | undefined {
  for (const [slot, item] of Object.entries(state.hero.equipment)) {
    if (item?.id === itemId) return { item, slot: slot as EquipmentSlot };
  }
  const placed = state.inventory.find((p) => p.item.id === itemId);
  return placed ? { item: placed.item } : undefined;
}

const NO_COST: CraftCost = { gold: 0, dust: 0, reforgeStones: 0, ascensionShards: 0, essences: {} };

/** What a craft costs. Upgrade gets more expensive with the Tier. */
export function craftCost(request: CraftRequest, item?: Item): CraftCost {
  switch (request.kind) {
    case "upgrade":
      return {
        ...NO_COST,
        gold: CRAFTING.upgradeGoldPerTier * (item?.tier ?? 1),
        ascensionShards: CRAFTING.upgradeShards,
      };
    case "reforge":
      return { ...NO_COST, reforgeStones: CRAFTING.reforgeStones };
    case "temper":
      return { ...NO_COST, dust: CRAFTING.temperDust, gold: CRAFTING.temperGold };
    case "imbue":
      return { ...NO_COST, essences: { [request.essenceId]: CRAFTING.imbueEssences } };
    case "distill":
      return { ...NO_COST, dust: CRAFTING.distillDust };
  }
}

/** The item one Tier higher. Affix qualities stay, so values grow with the Tier. */
export function upgradedItem(item: Item): Item {
  return { ...item, tier: Math.min(ITEMS.maxTier, item.tier + 1) };
}

/** The Essence of an act by id, with the affix it imbues. */
export function findEssence(data: GameData, essenceId: string) {
  return data.acts.map((a) => a.essence).find((e) => e.id === essenceId);
}

/** Can the affix at this index be changed (not blocked by the Affix Lock)? */
export function affixUnlocked(item: Item, index: number): boolean {
  return item.lockedAffix === undefined || item.lockedAffix === index;
}

/** Value range a Temper or Imbue can roll for a stat affix on this item (min and max). */
export function affixRollRange(
  item: Item,
  affixId: string,
  catalog: ItemCatalog,
): { readonly min: number; readonly max: number } | undefined {
  const affix = catalog.affixes.get(affixId);
  if (!affix || affix.kind !== "stat") return undefined;
  // rollQuality picks one of the unlocked stages, so the best roll is the top of the last one.
  const top = unlockedStages(item.itemLevel) / ITEMS.stageUnlockPositions.length;
  return {
    min: statAffixValue(affix, item.tier, 0),
    max: statAffixValue(affix, item.tier, top),
  };
}

function affixBlockReason(
  item: Item,
  index: number,
  catalog: ItemCatalog,
): CraftBlockReason | undefined {
  if (item.affixes.length === 0) return "noAffixes";
  const roll = item.affixes[index];
  if (!roll) return "noAffix";
  if (!affixUnlocked(item, index)) return "locked";
  // Trigger affixes stay loot luck: no Temper, no Imbue.
  if (catalog.affixes.get(roll.affixId)?.kind !== "stat") return "trigger";
  return undefined;
}

function costBlockReason(state: GameState, cost: CraftCost): CraftBlockReason | undefined {
  const w = state.wallet;
  if (w.ascensionShards < cost.ascensionShards) return "ascensionShards";
  if (w.reforgeStones < cost.reforgeStones) return "reforgeStones";
  for (const [id, n] of Object.entries(cost.essences)) {
    if ((w.essences[id] ?? 0) < n) return "essence";
  }
  if (w.dust < cost.dust) return "dust";
  if (w.gold < cost.gold) return "gold";
  return undefined;
}

/** Why a craft is not possible right now, or undefined if it is. */
export function craftBlockReason(
  state: GameState,
  data: GameData,
  request: CraftRequest,
): CraftBlockReason | undefined {
  if (state.run) return "camp";
  if (MYSTIC_CRAFTS.includes(request.kind) && !state.progress.trainerUnlocked) return "mystic";
  if (request.kind === "distill") return costBlockReason(state, craftCost(request));

  const found = findCraftItem(state, request.itemId);
  if (!found) return "noItem";
  const { item, slot } = found;
  const catalog = data.items;

  switch (request.kind) {
    case "upgrade": {
      if (item.tier >= ITEMS.maxTier) return "maxTier";
      if (slot && missingRequirements(upgradedItem(item), catalog, state.hero.attributes).length) {
        return "requirements";
      }
      break;
    }
    case "reforge":
      if (item.affixes.length === 0) return "noAffixes";
      break;
    case "temper": {
      const reason = affixBlockReason(item, request.affixIndex, catalog);
      if (reason) return reason;
      break;
    }
    case "imbue": {
      const reason = affixBlockReason(item, request.affixIndex, catalog);
      if (reason) return reason;
      const essence = findEssence(data, request.essenceId);
      if (!essence) return "unknownEssence";
      const affix = catalog.affixes.get(essence.affixId);
      const slotPool = affixPool(
        catalog.affixes.values(),
        getBase(catalog, item.baseId).slot,
        "stat",
      );
      if (!affix || !slotPool.includes(affix)) return "affixDoesNotFit";
      const elsewhere = item.affixes.some(
        (r, i) => i !== request.affixIndex && r.affixId === essence.affixId,
      );
      if (elsewhere) return "duplicateAffix";
      break;
    }
  }
  return costBlockReason(state, craftCost(request, item));
}

function pay(state: GameState, cost: CraftCost): GameState {
  const essences = { ...state.wallet.essences };
  for (const [id, n] of Object.entries(cost.essences)) essences[id] = (essences[id] ?? 0) - n;
  return {
    ...state,
    wallet: {
      ...state.wallet,
      gold: state.wallet.gold - cost.gold,
      dust: state.wallet.dust - cost.dust,
      reforgeStones: state.wallet.reforgeStones - cost.reforgeStones,
      ascensionShards: state.wallet.ascensionShards - cost.ascensionShards,
      essences,
    },
  };
}

/** Swaps an item for its crafted version, wherever it is. */
function replaceItem(state: GameState, location: CraftItemLocation, next: Item): GameState {
  if (location.slot) {
    return {
      ...state,
      hero: { ...state.hero, equipment: { ...state.hero.equipment, [location.slot]: next } },
    };
  }
  return {
    ...state,
    inventory: state.inventory.map((p) => (p.item.id === next.id ? { ...p, item: next } : p)),
  };
}

const withAffix = (item: Item, index: number, roll: AffixRoll): Item => ({
  ...item,
  affixes: item.affixes.map((r, i) => (i === index ? roll : r)),
  lockedAffix: index,
});

/** Applies a craft. Throws `GameActionError` if it is blocked. */
export function craft(state: GameState, data: GameData, request: CraftRequest): GameState {
  requireCamp(state);
  const reason = craftBlockReason(state, data, request);
  if (reason) return fail(`Cannot ${request.kind}: ${reason}`);

  if (request.kind === "distill") {
    const paid = pay(state, craftCost(request));
    return {
      ...paid,
      wallet: { ...paid.wallet, reforgeStones: paid.wallet.reforgeStones + 1 },
    };
  }

  const location = findCraftItem(state, request.itemId) ?? fail("Item not found");
  const { item } = location;
  const paid = pay(state, craftCost(request, item));
  const quality = (rng: Rng) => Number(rollQuality(item.itemLevel, item.rarity, rng).toFixed(4));

  switch (request.kind) {
    case "upgrade":
      return replaceItem(paid, location, upgradedItem(item));
    case "reforge": {
      const [rng, next] = nextRng(paid);
      const rolled = rollItem(
        data.items,
        { baseId: item.baseId, itemLevel: item.itemLevel, rarity: item.rarity },
        rng,
      );
      // Base, Tier and Rarity stay; the lock is gone.
      const reforged: Item = {
        id: item.id,
        baseId: item.baseId,
        name: rolled.name,
        rarity: item.rarity,
        itemLevel: item.itemLevel,
        tier: item.tier,
        affixes: rolled.affixes,
      };
      return replaceItem(next, location, reforged);
    }
    case "temper": {
      const [rng, next] = nextRng(paid);
      const old = item.affixes[request.affixIndex] ?? fail("No such affix");
      return replaceItem(
        next,
        location,
        withAffix(item, request.affixIndex, { affixId: old.affixId, quality: quality(rng) }),
      );
    }
    case "imbue": {
      const [rng, next] = nextRng(paid);
      const essence = findEssence(data, request.essenceId) ?? fail("Unknown Essence");
      return replaceItem(
        next,
        location,
        withAffix(item, request.affixIndex, { affixId: essence.affixId, quality: quality(rng) }),
      );
    }
  }
}
