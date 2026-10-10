import { rollQuality, statAffixValue, unlockedStages } from "../items/affixes";
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
  Rarity,
  RuneDefinition,
} from "../items/types";
import { RARITIES } from "../items/types";
import { Rng } from "../rng";
import { CODEX, CRAFTING, PROGRESSION } from "./constants";
import { codexKnows, kindledIndex } from "./codex";
import { kindledAffixId } from "../items/codex";
import {
  type GameData,
  type GameState,
  addRunes,
  fail,
  lootGate,
  nextAct,
  nextRng,
  requireCamp,
  stageMonsterLevel,
} from "./game";
import { addToGrid } from "./inventory";

/**
 * Camp crafting (docs/design/town-crafting-v1.md section 3, entschlackung-v1.md): Thoric works
 * fire and metal (Upgrade, Reforge; Salvage stays the `salvage` action), Liora the fine magic of
 * affixes (Temper, Kindle), the Runesmith everything about Sockets. There is no Undo.
 *
 * Affix Lock (like the Mystic in Diablo 3): after Temper or Kindle, only that affix can be
 * changed again; Reforge clears the lock.
 */

export type CraftRequest =
  | { readonly kind: "upgrade"; readonly itemId: string }
  | { readonly kind: "reforge"; readonly itemId: string }
  | { readonly kind: "temper"; readonly itemId: string; readonly affixIndex: number }
  /** Runesmith: +1 Socket on a Normal item without Runes, up to the base's maximum. */
  | { readonly kind: "addSocket"; readonly itemId: string }
  /** Nyssa: a Rune from the pouch into the next free Socket. Runes never come out again. */
  | { readonly kind: "socketRune"; readonly itemId: string; readonly runeId: string }
  /** Nyssa: three Runes of one kind into one Rune of the next rank. */
  | { readonly kind: "combineRunes"; readonly runeId: string }
  /** Marisha (Black Market): a random item for a slot, with better rarity odds than loot. */
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

/** Thoric travels with the caravan from the start. */
export const BLACKSMITH_CRAFTS: readonly CraftKind[] = ["upgrade", "reforge"];
/** Liora joins the caravan with Kaelen, after the first act boss. */
export const MYSTIC_CRAFTS: readonly CraftKind[] = ["temper", "kindle"];
/** Nyssa joins after the first trip into the Rotwood. */
export const RUNESMITH_CRAFTS: readonly CraftKind[] = ["addSocket", "socketRune", "combineRunes"];

export interface CraftCost {
  readonly acorns: number;
  readonly ash: number;
  readonly emberCoal: number;
  readonly phoenixFeathers: number;
  /** Runes by id. */
  readonly runes: Readonly<Record<string, number>>;
}

export type CraftBlockReason =
  | "camp"
  /** Liora has not joined the caravan yet. */
  | "mystic"
  /** Nyssa has not joined the caravan yet. */
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
  | "acorns"
  | "ash"
  | "emberCoal"
  | "phoenixFeathers"
  /** Kindle: a Codex part that is not learned yet. */
  | "unknownPart"
  /** Kindle: the item already has a kindled trigger (only that one can be rekindled). */
  | "kindled"
  /** Kindle: the chosen affix is no trigger. */
  | "notTrigger"
  /** Kindle: a Normal item has no trigger place. */
  | "noTriggerPlace";

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
  acorns: 0,
  ash: 0,
  emberCoal: 0,
  phoenixFeathers: 0,
  runes: {},
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
        acorns: CRAFTING.addSocketAcorns,
        ash: CRAFTING.addSocketAsh * ((item?.sockets ?? 0) + 1),
      };
    case "socketRune":
      return {
        ...NO_COST,
        acorns: CRAFTING.socketRuneAcornsPerRank * runeRank(request.runeId),
        runes: { [request.runeId]: 1 },
      };
    case "combineRunes":
      return {
        ...NO_COST,
        acorns: CRAFTING.combineRunesAcornsPerRank * runeRank(request.runeId),
        runes: { [request.runeId]: CRAFTING.combineRunesCount },
      };
    case "gamble":
      return {
        ...NO_COST,
        acorns: state && data ? gamblePrice(merchantItemLevel(state, data)) : 0,
      };
    case "upgrade":
      return {
        ...NO_COST,
        acorns: CRAFTING.upgradeAcornsPerTier * (item?.tier ?? 1),
        phoenixFeathers: CRAFTING.upgradeFeathers,
      };
    case "reforge":
      return { ...NO_COST, emberCoal: CRAFTING.emberCoal };
    case "temper":
      return { ...NO_COST, ash: CRAFTING.temperAsh, acorns: CRAFTING.temperAcorns };
    case "kindle":
      return {
        ...NO_COST,
        ash: CODEX.kindleAshPerTier * Math.max(1, item?.tier ?? 1),
        emberCoal: CODEX.kindleEmberCoal,
      };
  }
}

/** The item one Tier higher. Affix qualities stay, so values grow with the Tier. */
export function upgradedItem(item: Item): Item {
  return { ...item, tier: Math.min(ITEMS.maxTier, item.tier + 1) };
}

/** Can the affix at this index be changed (not blocked by the Affix Lock)? */
export function affixUnlocked(item: Item, index: number): boolean {
  return item.lockedAffix === undefined || item.lockedAffix === index;
}

/** Value range a Temper can roll for a stat affix on this item (min and max). */
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
    min: statAffixValue(affix, item.tier, 0, item.rarity),
    max: statAffixValue(affix, item.tier, top, item.rarity),
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
  // Trigger affixes stay loot luck (or Kindle): no Temper.
  if (catalog.affixes.get(roll.affixId)?.kind !== "stat") return "trigger";
  return undefined;
}

function costBlockReason(state: GameState, cost: CraftCost): CraftBlockReason | undefined {
  const w = state.wallet;
  if (w.phoenixFeathers < cost.phoenixFeathers) return "phoenixFeathers";
  if (w.emberCoal < cost.emberCoal) return "emberCoal";
  for (const [id, n] of Object.entries(cost.runes)) {
    if ((w.runes[id] ?? 0) < n) return "runes";
  }
  if (w.ash < cost.ash) return "ash";
  if (w.acorns < cost.acorns) return "acorns";
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
  if (request.kind === "combineRunes") {
    const rune = data.items.runes.get(request.runeId);
    if (!rune) return "unknownRune";
    if (!nextRune(data, rune.rank)) return "maxRank";
    return costBlockReason(state, craftCost(request, undefined, data));
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
    case "kindle": {
      const reason = kindleBlockReason(state, item, request, catalog);
      if (reason) return reason;
      break;
    }
  }
  return costBlockReason(state, craftCost(request, item, data, state));
}

function pay(state: GameState, cost: CraftCost): GameState {
  const runes = Object.fromEntries(
    Object.entries(state.wallet.runes)
      .map(([id, n]) => [id, n - (cost.runes[id] ?? 0)] as const)
      .filter(([, n]) => n > 0),
  );
  return {
    ...state,
    wallet: {
      ...state.wallet,
      acorns: state.wallet.acorns - cost.acorns,
      ash: state.wallet.ash - cost.ash,
      emberCoal: state.wallet.emberCoal - cost.emberCoal,
      phoenixFeathers: state.wallet.phoenixFeathers - cost.phoenixFeathers,
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
      // A kindled trigger grows with the item's tier, like any other affix.
      const roll: AffixRoll = {
        affixId: kindledAffixId(request.conditionId, request.effectId),
        quality: Number((CODEX.kindleMaxQuality * quality(rng)).toFixed(4)),
        kindled: true,
      };
      const affixes =
        index < item.affixes.length
          ? item.affixes.map((r, i) => (i === index ? roll : r))
          : [...item.affixes, roll];
      return replaceItem(next, location, { ...item, affixes, lockedAffix: index });
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
    !codexKnows(codex, "condition", request.conditionId) ||
    !codexKnows(codex, "effect", request.effectId) ||
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

// --- Marisha (Black Market) --------------------------------------------------------------------

/** Item Level of Marisha's goods: the boss level of the act ahead. */
export function merchantItemLevel(state: GameState, data: GameData): number {
  const act = nextAct(state, data);
  return stageMonsterLevel(data, act, act.stages, state.legacy.prestige);
}

/** Item slots Marisha gambles on: every slot the loot can show. */
export function merchantSlots(data: GameData): ItemSlot[] {
  return [...new Set(data.lootBases.map((id) => getBase(data.items, id).slot))];
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

/** Marisha's rarity odds in a run: one step above what its enemies drop (`gambleMax`). */
export function gambleRarityWeights(prestige: number): Readonly<Record<Rarity, number>> {
  const max = RARITIES.indexOf(lootGate(prestige).gambleMax);
  const weights = { ...CRAFTING.gambleRarityWeights } as Record<Rarity, number>;
  for (const r of RARITIES) if (RARITIES.indexOf(r) > max) weights[r] = 0;
  return weights;
}

/** A gambled item: random base of the slot, rarity by Marisha's odds, Uniques possible. */
export function gambleItem(state: GameState, data: GameData, slot: ItemSlot, rng: Rng): Item {
  const level = merchantItemLevel(state, data);
  const bases = data.lootBases.filter((id) => getBase(data.items, id).slot === slot);
  const rarity = rollRarity(rng, gambleRarityWeights(state.legacy.prestige));
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
