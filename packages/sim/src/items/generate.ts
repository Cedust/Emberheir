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
  type LegendaryPowerDefinition,
  RARITIES,
  type Rarity,
  type RuneDefinition,
  type RunewordDefinition,
  type UniqueDefinition,
} from "./types";

/** Builds a catalog from content lists and checks ids and references. */
export function createItemCatalog(content: {
  bases: readonly ItemBaseDefinition[];
  affixes: readonly AffixDefinition[];
  rareNames: ItemCatalog["rareNames"];
  runes?: readonly RuneDefinition[];
  runewords?: readonly RunewordDefinition[];
  powers?: readonly LegendaryPowerDefinition[];
  uniques?: readonly UniqueDefinition[];
}): ItemCatalog {
  const bases = byId(content.bases, "item base");
  const affixes = byId(content.affixes, "affix");
  for (const affix of content.affixes) {
    if (affix.kind === "stat" && !affix.prefix === !affix.suffix) {
      throw new Error(`Affix "${affix.id}" needs either a prefix or a suffix`);
    }
  }
  const runes = byId(content.runes ?? [], "rune");
  const runewords = byId(content.runewords ?? [], "runeword");
  const powers = byId(content.powers ?? [], "legendary power");
  const uniques = byId(content.uniques ?? [], "unique");
  const needAffix = (id: string, owner: string) => {
    if (!affixes.has(id)) throw new Error(`${owner} uses unknown affix "${id}"`);
  };
  for (const word of runewords.values()) {
    for (const rune of word.runes) {
      if (!runes.has(rune)) throw new Error(`Runeword "${word.id}" uses unknown rune "${rune}"`);
    }
    for (const t of word.triggers ?? []) needAffix(t.affixId, `Runeword "${word.id}"`);
  }
  for (const power of powers.values()) {
    if (power.trigger) needAffix(power.trigger.affixId, `Power "${power.id}"`);
  }
  for (const unique of uniques.values()) {
    if (!bases.has(unique.baseId)) {
      throw new Error(`Unique "${unique.id}" uses unknown base "${unique.baseId}"`);
    }
    for (const a of unique.affixes) needAffix(a.affixId, `Unique "${unique.id}"`);
    if (unique.powerId && !powers.has(unique.powerId)) {
      throw new Error(`Unique "${unique.id}" uses unknown power "${unique.powerId}"`);
    }
  }
  return { bases, affixes, rareNames: content.rareNames, runes, runewords, powers, uniques };
}

function byId<T extends { readonly id: string }>(list: readonly T[], what: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const entry of list) {
    if (map.has(entry.id)) throw new Error(`Duplicate ${what} id "${entry.id}"`);
    map.set(entry.id, entry);
  }
  return map;
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

/** Whether an affix names a Magic item from the front or the back. Triggers are suffixes. */
export function affixPosition(affix: AffixDefinition): "prefix" | "suffix" {
  return affix.kind === "stat" && affix.prefix ? "prefix" : "suffix";
}

/**
 * Picks `count` different affixes from a pool by weight. `allowed` can rule out affixes given
 * the ones picked so far (Magic items: one prefix and one suffix at most).
 */
function pickAffixes(
  pool: readonly AffixDefinition[],
  base: ItemBaseDefinition,
  count: number,
  rng: Rng,
  allowed: (affix: AffixDefinition, picked: readonly AffixDefinition[]) => boolean = () => true,
): AffixDefinition[] {
  const left = [...pool];
  const picked: AffixDefinition[] = [];
  while (picked.length < count) {
    const next = pickWeighted(left, (a) => (allowed(a, picked) ? affixWeight(a, base) : 0), rng);
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
  const chosen: AffixDefinition[] = [];
  // Magic items carry one prefix and one suffix at most, like in D2.
  const allowed = (affix: AffixDefinition, picked: readonly AffixDefinition[]) =>
    options.rarity !== "magic" ||
    [...chosen, ...picked].every((c) => affixPosition(c) !== affixPosition(affix));
  chosen.push(...pickAffixes(affixPool(all, base.slot, "stat"), base, statCount, rng, allowed));
  chosen.push(
    ...pickAffixes(affixPool(all, base.slot, "trigger"), base, triggerCount, rng, allowed),
  );
  const rolls: AffixRoll[] = chosen.map((a) => ({
    affixId: a.id,
    quality: Number(rollQuality(itemLevel, options.rarity, rng).toFixed(4)),
  }));
  const power =
    options.rarity === "legendary"
      ? pickWeighted(powersForSlot(catalog, base.slot), () => 1, rng)
      : undefined;
  const sockets = options.rarity === "normal" ? rollSockets(base, rng) : 0;

  return {
    id: rng.int(0, 0x7fffffff).toString(36).padStart(6, "0"),
    baseId: base.id,
    name: itemName(catalog, base, options.rarity, chosen, rng),
    rarity: options.rarity,
    itemLevel,
    tier: tierForItemLevel(itemLevel),
    affixes: rolls,
    ...(sockets > 0 ? { sockets } : {}),
    ...(power ? { powerId: power.id } : {}),
  };
}

/** Legendary Powers that can roll on a slot. */
export function powersForSlot(catalog: ItemCatalog, slot: ItemSlot): LegendaryPowerDefinition[] {
  return [...catalog.powers.values()].filter((p) => p.slots.includes(slot));
}

/** Sockets of a dropped Normal item: sometimes none, else 1 up to the base's maximum. */
export function rollSockets(base: ItemBaseDefinition, rng: Rng): number {
  const max = base.maxSockets ?? 0;
  if (max <= 0 || !rng.chance(ITEMS.socketChance)) return 0;
  return rng.int(1, max);
}

/** Uniques that can drop at an Item Level for one of the given bases. */
export function uniquesFor(
  catalog: ItemCatalog,
  itemLevel: number,
  baseIds?: readonly string[],
): UniqueDefinition[] {
  return [...catalog.uniques.values()].filter(
    (u) => u.minItemLevel <= itemLevel && (!baseIds || baseIds.includes(u.baseId)),
  );
}

/** Rolls a Unique: its fixed affixes with a quality inside each range. */
export function rollUnique(
  catalog: ItemCatalog,
  uniqueId: string,
  itemLevel: number,
  rng: Rng,
): Item {
  const unique = catalog.uniques.get(uniqueId);
  if (!unique) throw new Error(`Unknown unique "${uniqueId}"`);
  const level = Math.max(1, Math.floor(itemLevel));
  return {
    id: rng.int(0, 0x7fffffff).toString(36).padStart(6, "0"),
    baseId: unique.baseId,
    name: unique.name,
    rarity: "legendary",
    itemLevel: level,
    tier: tierForItemLevel(level),
    affixes: unique.affixes.map((a) => ({
      affixId: a.affixId,
      quality: Number((a.quality.min + rng.next() * (a.quality.max - a.quality.min)).toFixed(4)),
    })),
    uniqueId: unique.id,
    ...(unique.powerId ? { powerId: unique.powerId } : {}),
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
    const prefix = affixes.find((a) => affixPosition(a) === "prefix");
    const suffix = affixes.find((a) => affixPosition(a) === "suffix");
    const front = prefix?.kind === "stat" ? `${prefix.prefix} ` : "";
    const back = !suffix
      ? ""
      : suffix.kind === "stat"
        ? ` ${suffix.suffix ?? ""}`
        : ` of ${suffix.name}`;
    return `${front}${base.name}${back}`;
  }
  const { first, second } = catalog.rareNames;
  if (first.length === 0 || second.length === 0) return base.name;
  const a = first[rng.int(0, first.length - 1)] ?? "";
  const b = second[rng.int(0, second.length - 1)] ?? "";
  return `${a} ${b}`.trim() || base.name;
}
