import type { Rng } from "../rng";
import { affixPool, affixWeight, rollQuality, tierForItemLevel } from "./affixes";
import { ITEMS } from "./constants";
import {
  type AffixDefinition,
  type AffixRoll,
  type Item,
  type ItemBaseDefinition,
  type ItemCatalog,
  type ItemSlot,
  RARITIES,
  type Rarity,
} from "./types";

/** Builds a catalog from content lists and checks that ids are unique. */
export function createItemCatalog(content: {
  bases: readonly ItemBaseDefinition[];
  affixes: readonly AffixDefinition[];
  rareNames: ItemCatalog["rareNames"];
}): ItemCatalog {
  const bases = new Map<string, ItemBaseDefinition>();
  for (const base of content.bases) {
    if (bases.has(base.id)) throw new Error(`Duplicate item base id "${base.id}"`);
    bases.set(base.id, base);
  }
  const affixes = new Map<string, AffixDefinition>();
  for (const affix of content.affixes) {
    if (affixes.has(affix.id)) throw new Error(`Duplicate affix id "${affix.id}"`);
    affixes.set(affix.id, affix);
  }
  return { bases, affixes, rareNames: content.rareNames };
}

export function getBase(catalog: ItemCatalog, baseId: string): ItemBaseDefinition {
  const base = catalog.bases.get(baseId);
  if (!base) throw new Error(`Unknown item base "${baseId}"`);
  return base;
}

/** Picks one entry by weight. Returns undefined if nothing has a positive weight. */
export function pickWeighted<T>(
  entries: readonly T[],
  weight: (entry: T) => number,
  rng: Rng,
): T | undefined {
  const total = entries.reduce((sum, e) => sum + Math.max(0, weight(e)), 0);
  if (total <= 0) return undefined;
  let roll = rng.next() * total;
  for (const entry of entries) {
    roll -= Math.max(0, weight(entry));
    if (roll < 0) return entry;
  }
  return entries[entries.length - 1];
}

/** Rolls a rarity from weights (default: ITEMS.rarityWeights). */
export function rollRarity(
  rng: Rng,
  weights: Readonly<Record<Rarity, number>> = ITEMS.rarityWeights,
): Rarity {
  return pickWeighted(RARITIES, (r) => weights[r], rng) ?? "normal";
}

/** Bases of a slot, e.g. to roll a random Body Armor. */
export function basesForSlot(catalog: ItemCatalog, slot: ItemSlot): ItemBaseDefinition[] {
  return [...catalog.bases.values()].filter((b) => b.slot === slot);
}

/** Picks `count` different affixes from a pool by weight. */
function pickAffixes(
  pool: readonly AffixDefinition[],
  base: ItemBaseDefinition,
  count: number,
  rng: Rng,
): AffixDefinition[] {
  const left = [...pool];
  const picked: AffixDefinition[] = [];
  while (picked.length < count) {
    const next = pickWeighted(left, (a) => affixWeight(a, base), rng);
    if (!next) break;
    picked.push(next);
    left.splice(left.indexOf(next), 1);
  }
  return picked;
}

export interface RollItemOptions {
  readonly baseId: string;
  readonly itemLevel: number;
  readonly rarity: Rarity;
}

/**
 * Rolls a random item: affix count by rarity, affixes from the slot pool weighted by the base,
 * no affix twice, quality by Item Level stages.
 */
export function rollItem(catalog: ItemCatalog, options: RollItemOptions, rng: Rng): Item {
  const base = getBase(catalog, options.baseId);
  const itemLevel = Math.max(1, Math.floor(options.itemLevel));
  const counts = ITEMS.affixCounts[options.rarity];
  const statCount = rng.int(counts.stat[0], counts.stat[1]);
  const triggerCount =
    rng.int(counts.trigger[0], counts.trigger[1]) + (rng.chance(counts.extraTriggerChance) ? 1 : 0);

  const all = [...catalog.affixes.values()];
  const chosen = [
    ...pickAffixes(affixPool(all, base.slot, "stat"), base, statCount, rng),
    ...pickAffixes(affixPool(all, base.slot, "trigger"), base, triggerCount, rng),
  ];
  const rolls: AffixRoll[] = chosen.map((a) => ({
    affixId: a.id,
    quality: Number(rollQuality(itemLevel, options.rarity, rng).toFixed(4)),
  }));

  return {
    id: rng.int(0, 0x7fffffff).toString(36).padStart(6, "0"),
    baseId: base.id,
    name: itemName(catalog, base, options.rarity, chosen, rng),
    rarity: options.rarity,
    itemLevel,
    tier: tierForItemLevel(itemLevel),
    affixes: rolls,
  };
}

function itemName(
  catalog: ItemCatalog,
  base: ItemBaseDefinition,
  rarity: Rarity,
  affixes: readonly AffixDefinition[],
  rng: Rng,
): string {
  if (rarity === "normal" || affixes.length === 0) return base.name;
  if (rarity === "magic") {
    const first = affixes[0];
    if (!first) return base.name;
    return `${base.name} ${first.kind === "stat" ? first.suffix : `of ${first.name}`}`;
  }
  const { first, second } = catalog.rareNames;
  if (first.length === 0 || second.length === 0) return base.name;
  const a = first[rng.int(0, first.length - 1)] ?? "";
  const b = second[rng.int(0, second.length - 1)] ?? "";
  return `${a} ${b}`.trim() || base.name;
}
