import { affixPool, rollQuality, statAffixValue, unlockedStages } from "../items/affixes";
import { ITEMS } from "../items/constants";
import { missingRequirements } from "../items/equipment";
import { getBase, rollItem, rollRarity, rollUnique, uniquesFor } from "../items/generate";
import { freeSockets, matchRuneword } from "../items/runes";
import type {
  AffixRoll,
  EquipmentSlot,
  Item,
  ItemCatalog,
  ItemSlot,
  RuneDefinition,
} from "../items/types";
import { Rng } from "../rng";
import { CODEX, CRAFTING, PROGRESSION } from "./constants";
import { codexMastery, kindleTier, kindledIndex } from "./codex";
import { kindledAffixId } from "../items/codex";
import {
  type GameData,
  type GameState,
  addRunes,
  fail,
  nextAct,
  nextRng,
  requireCamp,
  stageMonsterLevel,
} from "./game";
import { addToGrid } from "./inventory";

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
  | { readonly kind: "distill" }
  /** Thoric: +1 Socket on a Normal item without Runes, up to the base's maximum. */
  | { readonly kind: "addSocket"; readonly itemId: string }
  /** Eldrin: a Rune from the pouch into the next free Socket. Runes never come out again. */
  | { readonly kind: "socketRune"; readonly itemId: string; readonly runeId: string }
  /** Eldrin: three Runes of one kind into one Rune of the next rank. */
  | { readonly kind: "combineRunes"; readonly runeId: string }
  /** Marisha: buy one of the Normal bases in stock. */
  | { readonly kind: "buyBase"; readonly index: number }
  /** Marisha: a random item for a slot, maybe even Legendary. */
  | { readonly kind: "gamble"; readonly slot: ItemSlot }
  /**
   * Liora: a Trigger Codex Condition + Effect as a trigger on the item. Replaces the trigger at
   * `affixIndex`, or fills the free trigger place of an item without one. One per item.
   */
  | {
      readonly kind: "kindle";
      readonly itemId: string;
      readonly conditionId: string;
      readonly effectId: string;
      readonly affixIndex?: number;
    };

export type CraftKind = CraftRequest["kind"];

/** Liora joins the caravan with Kaelen, after the first act boss. */
export const MYSTIC_CRAFTS: readonly CraftKind[] = [
  "reforge",
  "temper",
  "imbue",
  "distill",
  "kindle",
];
/** Eldrin joins after the first trip into the Rotwood. */
export const RUNESMITH_CRAFTS: readonly CraftKind[] = ["socketRune", "combineRunes"];

export interface CraftCost {
  readonly gold: number;
  readonly dust: number;
  readonly reforgeStones: number;
  readonly ascensionShards: number;
  /** Essences by id. */
  readonly essences: Readonly<Record<string, number>>;
  /** Runes by id. */
  readonly runes: Readonly<Record<string, number>>;
  readonly kindling: number;
}

export type CraftBlockReason =
  | "camp"
  /** Liora has not joined the caravan yet. */
  | "mystic"
  /** Eldrin has not joined the caravan yet. */
  | "runesmith"
  /** Sockets and Runes are for Normal items only. */
  | "notNormal"
  | "maxSockets"
  /** Sockets can only be added before the first Rune goes in. */
  | "hasRunes"
  | "noSocket"
  /** Runewords and Uniques never change. */
  | "fixed"
  | "unknownRune"
  | "maxRank"
  | "sold"
  | "noStock"
  /** No room in the inventory for a bought item. */
  | "noRoom"
  | "runes"
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
  | "essence"
  /** Kindle: a Codex part that is not learned yet. */
  | "unknownPart"
  /** Kindle: the item already has a kindled trigger (only that one can be rekindled). */
  | "kindled"
  /** Kindle: the chosen affix is no trigger. */
  | "notTrigger"
  /** Kindle: a Normal item has no trigger place. */
  | "noTriggerPlace"
  | "kindling";

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

const NO_COST: CraftCost = {
  gold: 0,
  dust: 0,
  reforgeStones: 0,
  ascensionShards: 0,
  essences: {},
  runes: {},
  kindling: 0,
};

/** What a craft costs. Upgrade gets more expensive with the Tier. */
export function craftCost(
  request: CraftRequest,
  item?: Item,
  data?: GameData,
  state?: GameState,
): CraftCost {
  const runeRank = (id: string) => data?.items.runes.get(id)?.rank ?? 1;
  switch (request.kind) {
    case "addSocket":
      return {
        ...NO_COST,
        gold: CRAFTING.addSocketGold,
        dust: CRAFTING.addSocketDust * ((item?.sockets ?? 0) + 1),
      };
    case "socketRune":
      return {
        ...NO_COST,
        gold: CRAFTING.socketRuneGoldPerRank * runeRank(request.runeId),
        runes: { [request.runeId]: 1 },
      };
    case "combineRunes":
      return {
        ...NO_COST,
        gold: CRAFTING.combineRunesGoldPerRank * runeRank(request.runeId),
        runes: { [request.runeId]: CRAFTING.combineRunesCount },
      };
    case "buyBase": {
      const offer = state && data ? merchantStock(state, data)[request.index] : undefined;
      return { ...NO_COST, gold: offer ? basePrice(offer) : 0 };
    }
    case "gamble":
      return { ...NO_COST, gold: state && data ? gamblePrice(merchantItemLevel(state, data)) : 0 };
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
    case "kindle": {
      const tier =
        item && state
          ? kindleTier(state.legacy.codex, request.conditionId, request.effectId, item)
          : 1;
      return {
        ...NO_COST,
        dust: CODEX.kindleDustPerTier * Math.max(1, tier),
        kindling: CODEX.kindleKindling,
      };
    }
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
  if (w.kindling < cost.kindling) return "kindling";
  for (const [id, n] of Object.entries(cost.essences)) {
    if ((w.essences[id] ?? 0) < n) return "essence";
  }
  for (const [id, n] of Object.entries(cost.runes)) {
    if ((w.runes[id] ?? 0) < n) return "runes";
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
  if (RUNESMITH_CRAFTS.includes(request.kind) && !state.progress.runesmithUnlocked) {
    return "runesmith";
  }
  if (request.kind === "distill") return costBlockReason(state, craftCost(request));
  if (request.kind === "combineRunes") {
    const rune = data.items.runes.get(request.runeId);
    if (!rune) return "unknownRune";
    if (!nextRune(data, rune.rank)) return "maxRank";
    return costBlockReason(state, craftCost(request, undefined, data));
  }
  if (request.kind === "buyBase") {
    const offer = merchantStock(state, data)[request.index];
    if (!offer) return "noStock";
    if (soldOut(state).includes(request.index)) return "sold";
    if (!addToGrid(state.inventory, offer, data.items)) return "noRoom";
    return costBlockReason(state, craftCost(request, undefined, data, state));
  }
  if (request.kind === "gamble") {
    if (!merchantSlots(data).includes(request.slot)) return "noStock";
    if (!hasRoomFor(state, data, request.slot)) return "noRoom";
    return costBlockReason(state, craftCost(request, undefined, data, state));
  }

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
      if (item.uniqueId) return "fixed";
      if (item.affixes.length === 0) return "noAffixes";
      break;
    case "addSocket": {
      if (item.rarity !== "normal") return "notNormal";
      if (item.runes?.length) return "hasRunes";
      if ((item.sockets ?? 0) >= (getBase(catalog, item.baseId).maxSockets ?? 0)) {
        return "maxSockets";
      }
      break;
    }
    case "socketRune": {
      if (item.rarity !== "normal") return "notNormal";
      if (!catalog.runes.has(request.runeId)) return "unknownRune";
      if (freeSockets(item) <= 0) return "noSocket";
      break;
    }
    case "temper": {
      if (item.uniqueId) return "fixed";
      const reason = affixBlockReason(item, request.affixIndex, catalog);
      if (reason) return reason;
      break;
    }
    case "imbue": {
      if (item.uniqueId) return "fixed";
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
    case "kindle": {
      const reason = kindleBlockReason(state, item, request, catalog);
      if (reason) return reason;
      break;
    }
  }
  return costBlockReason(state, craftCost(request, item, data, state));
}

function pay(state: GameState, cost: CraftCost): GameState {
  const essences = { ...state.wallet.essences };
  for (const [id, n] of Object.entries(cost.essences)) essences[id] = (essences[id] ?? 0) - n;
  const runes = Object.fromEntries(
    Object.entries(state.wallet.runes)
      .map(([id, n]) => [id, n - (cost.runes[id] ?? 0)] as const)
      .filter(([, n]) => n > 0),
  );
  return {
    ...state,
    wallet: {
      ...state.wallet,
      gold: state.wallet.gold - cost.gold,
      dust: state.wallet.dust - cost.dust,
      reforgeStones: state.wallet.reforgeStones - cost.reforgeStones,
      ascensionShards: state.wallet.ascensionShards - cost.ascensionShards,
      kindling: state.wallet.kindling - cost.kindling,
      essences,
      runes,
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
  if (request.kind === "combineRunes") {
    const paid = pay(state, craftCost(request, undefined, data));
    const rank = data.items.runes.get(request.runeId)?.rank ?? fail("Unknown Rune");
    const next = nextRune(data, rank) ?? fail("No higher Rune");
    return {
      ...paid,
      wallet: { ...paid.wallet, runes: addRunes(paid.wallet.runes, [next.id]) },
      legacy: {
        ...paid.legacy,
        runesFound: [...new Set([...paid.legacy.runesFound, next.id])],
      },
    };
  }
  if (request.kind === "buyBase") {
    const offer = merchantStock(state, data)[request.index] ?? fail("Not in stock");
    const paid = pay(state, craftCost(request, undefined, data, state));
    return {
      ...paid,
      inventory: addToGrid(paid.inventory, offer, data.items) ?? fail("No room"),
      merchant: { key: merchantKey(state), sold: [...soldOut(state), request.index] },
    };
  }
  if (request.kind === "gamble") {
    const paid = pay(state, craftCost(request, undefined, data, state));
    const [rng, next] = nextRng(paid);
    const item = gambleItem(next, data, request.slot, rng);
    const trophy = item.uniqueId && !next.legacy.trophies.includes(item.uniqueId);
    return {
      ...next,
      inventory: addToGrid(next.inventory, item, data.items) ?? fail("No room"),
      ...(trophy && item.uniqueId
        ? { legacy: { ...next.legacy, trophies: [...next.legacy.trophies, item.uniqueId] } }
        : {}),
    };
  }

  const location = findCraftItem(state, request.itemId) ?? fail("Item not found");
  const { item } = location;
  const paid = pay(state, craftCost(request, item, data, state));
  const quality = (rng: Rng) => Number(rollQuality(item.itemLevel, item.rarity, rng).toFixed(4));

  switch (request.kind) {
    case "upgrade":
      return replaceItem(paid, location, upgradedItem(item));
    case "addSocket":
      return replaceItem(paid, location, { ...item, sockets: (item.sockets ?? 0) + 1 });
    case "socketRune": {
      const runes = [...(item.runes ?? []), request.runeId];
      const slot = getBase(data.items, item.baseId).slot;
      const word = matchRuneword(data.items, slot, item.sockets ?? 0, runes);
      const socketed: Item = { ...item, runes, ...(word ? { name: word.name } : {}) };
      const placed = replaceItem(paid, location, socketed);
      if (!word || placed.legacy.runewords.includes(word.id)) return placed;
      return {
        ...placed,
        legacy: { ...placed.legacy, runewords: [...placed.legacy.runewords, word.id] },
      };
    }
    case "reforge": {
      const [rng, next] = nextRng(paid);
      const rolled = rollItem(
        data.items,
        { baseId: item.baseId, itemLevel: item.itemLevel, rarity: item.rarity },
        rng,
      );
      // Base, Tier, Rarity, Sockets, Runes and the Legendary Power stay; the lock is gone.
      const reforged: Item = {
        id: item.id,
        baseId: item.baseId,
        name: item.runes?.length ? item.name : rolled.name,
        rarity: item.rarity,
        itemLevel: item.itemLevel,
        tier: item.tier,
        affixes: rolled.affixes,
        ...(item.sockets ? { sockets: item.sockets } : {}),
        ...(item.runes ? { runes: item.runes } : {}),
        ...(item.powerId ? { powerId: item.powerId } : {}),
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
    case "kindle": {
      const [rng, next] = nextRng(paid);
      const index = request.affixIndex ?? item.affixes.length;
      const roll: AffixRoll = {
        affixId: kindledAffixId(request.conditionId, request.effectId),
        quality: Number((CODEX.kindleMaxQuality * quality(rng)).toFixed(4)),
        kindled: true,
        tier: kindleTier(state.legacy.codex, request.conditionId, request.effectId, item),
      };
      const affixes =
        index < item.affixes.length
          ? item.affixes.map((r, i) => (i === index ? roll : r))
          : [...item.affixes, roll];
      return replaceItem(next, location, { ...item, affixes, lockedAffix: index });
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

// --- Trigger Codex -----------------------------------------------------------------------------

function kindleBlockReason(
  state: GameState,
  item: Item,
  request: Extract<CraftRequest, { kind: "kindle" }>,
  catalog: ItemCatalog,
): CraftBlockReason | undefined {
  if (item.uniqueId || item.runes?.length) return "fixed";
  const codex = state.legacy.codex;
  if (
    codexMastery(codex, "condition", request.conditionId) === 0 ||
    codexMastery(codex, "effect", request.effectId) === 0 ||
    !catalog.affixes.has(kindledAffixId(request.conditionId, request.effectId))
  ) {
    return "unknownPart";
  }
  const kindled = kindledIndex(item);
  const isTrigger = (i: number) => {
    const roll = item.affixes[i];
    return roll !== undefined && catalog.affixes.get(roll.affixId)?.kind === "trigger";
  };
  if (request.affixIndex === undefined) {
    if (item.rarity === "normal") return "noTriggerPlace";
    if (item.affixes.some((_, i) => isTrigger(i))) return "notTrigger";
    if (item.lockedAffix !== undefined) return "locked";
    return undefined;
  }
  if (!item.affixes[request.affixIndex]) return "noAffix";
  if (!isTrigger(request.affixIndex)) return "notTrigger";
  if (kindled >= 0 && kindled !== request.affixIndex) return "kindled";
  if (!affixUnlocked(item, request.affixIndex)) return "locked";
  return undefined;
}

/** Trigger affix indexes Kindle can replace, or `[undefined]` for a free trigger place. */
export function kindleTargets(item: Item, catalog: ItemCatalog): (number | undefined)[] {
  const triggers = item.affixes.flatMap((r, i) =>
    catalog.affixes.get(r.affixId)?.kind === "trigger" ? [i] : [],
  );
  if (triggers.length === 0) return item.rarity === "normal" ? [] : [undefined];
  const kindled = kindledIndex(item);
  return kindled >= 0 ? [kindled] : triggers;
}

// --- Runes -------------------------------------------------------------------------------------

/** The Rune one rank higher (Combine Runes), if there is one. */
export function nextRune(data: GameData, rank: number): RuneDefinition | undefined {
  return [...data.items.runes.values()].find((r) => r.rank === rank + 1);
}

// --- Marisha (Merchant) ------------------------------------------------------------------------

/** The stock changes whenever the hero comes back from fighting. */
const merchantKey = (state: GameState) => state.stats.fights + 1000 * state.legacy.prestige;

/** Offers already sold from the current stock. */
export function soldOut(state: GameState): readonly number[] {
  return state.merchant.key === merchantKey(state) ? state.merchant.sold : [];
}

/** Item Level of Marisha's goods: the boss level of the act ahead. */
export function merchantItemLevel(state: GameState, data: GameData): number {
  const act = nextAct(state, data);
  return stageMonsterLevel(data, act, act.stages, state.legacy.prestige);
}

/** Item slots Marisha gambles on: every slot the loot can show. */
export function merchantSlots(data: GameData): ItemSlot[] {
  return [...new Set(data.lootBases.map((id) => getBase(data.items, id).slot))];
}

/**
 * Marisha's stock: Normal bases with the most Sockets they can have (Runeword bases), rolled
 * from the save's seed, so reloading does not change it.
 */
export function merchantStock(state: GameState, data: GameData): Item[] {
  const rng = new Rng((state.seed ^ Math.imul(merchantKey(state) + 7, 0x2c1b3c6d)) >>> 0);
  const socketable = data.lootBases.filter((id) => (getBase(data.items, id).maxSockets ?? 0) > 0);
  const level = merchantItemLevel(state, data);
  const stock: Item[] = [];
  const left = [...socketable];
  for (let i = 0; i < CRAFTING.merchantOffers && left.length; i++) {
    const baseId = left.splice(rng.int(0, left.length - 1), 1)[0] ?? "";
    const base = getBase(data.items, baseId);
    const item = rollItem(data.items, { baseId, itemLevel: level, rarity: "normal" }, rng);
    stock.push({ ...item, sockets: base.maxSockets ?? 0 });
  }
  return stock;
}

export function basePrice(item: Item): number {
  return CRAFTING.basePriceFlat + CRAFTING.basePricePerSocket * (item.sockets ?? 0) * item.tier;
}

export function gamblePrice(itemLevel: number): number {
  return CRAFTING.gambleFlat + CRAFTING.gamblePerItemLevel * itemLevel;
}

/** Whether a gamble for this slot would find room: checked with the slot's biggest base. */
function hasRoomFor(state: GameState, data: GameData, slot: ItemSlot): boolean {
  return data.lootBases
    .filter((id) => getBase(data.items, id).slot === slot)
    .every((baseId) => {
      const probe = rollItem(data.items, { baseId, itemLevel: 1, rarity: "normal" }, new Rng(1));
      return addToGrid(state.inventory, probe, data.items) !== null;
    });
}

/** A gambled item: random base of the slot, rarity by Marisha's odds, Uniques possible. */
export function gambleItem(state: GameState, data: GameData, slot: ItemSlot, rng: Rng): Item {
  const level = merchantItemLevel(state, data);
  const bases = data.lootBases.filter((id) => getBase(data.items, id).slot === slot);
  const rarity = rollRarity(rng, CRAFTING.gambleRarityWeights);
  if (rarity === "legendary") {
    const uniques = uniquesFor(data.items, level, bases);
    if (uniques.length && rng.chance(PROGRESSION.uniqueShare)) {
      const unique = uniques[rng.int(0, uniques.length - 1)];
      if (unique) return rollUnique(data.items, unique.id, level, rng);
    }
  }
  const baseId = bases[rng.int(0, bases.length - 1)] ?? fail("Nothing to gamble on");
  return rollItem(data.items, { baseId, itemLevel: level, rarity }, rng);
}
