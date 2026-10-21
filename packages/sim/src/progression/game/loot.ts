import {
  bossTrophies,
  getBase,
  pickWeighted,
  rollItem,
  rollRarity,
  rollUnique,
  uniquesFor,
} from "../../items/generate";
import {
  RARITIES,
  type AffixDefinition,
  type Item,
  type ItemSlot,
  type Rarity,
} from "../../items/types";
import { Rng } from "../../rng";
import { PROGRESSION, type LootGate } from "../constants";
import { type EnemyRank } from "../leveling";
import { fail, type ActData, type Encounter, type GameData } from "./state";

/** Loot rolls: the item pick, act affix weights and Rune drops. */

/** What a run can drop (`PROGRESSION.lootGates`), by Prestige level. */
export function lootGate(prestige: number): LootGate {
  const gates = PROGRESSION.lootGates;
  return gates[Math.min(prestige, gates.length - 1)] ?? fail("No loot gates");
}

/**
 * Rarity weights of the item pick. The run's loot gate sets a window per enemy rank, and Pity
 * raises the two highest allowed rarities.
 */
export function itemPickWeights(
  rank: EnemyRank,
  deathsInAct: number,
  prestige: number,
): Readonly<Record<Rarity, number>> {
  const idx = (r: Rarity) => RARITIES.indexOf(r);
  const window = lootGate(prestige)[rank];
  const pity = 1 + PROGRESSION.pityPerDeath * Math.min(deathsInAct, PROGRESSION.pityMaxDeaths);
  const weights = { ...PROGRESSION.rarityWeights } as Record<Rarity, number>;
  for (const r of RARITIES) {
    if (idx(r) < idx(window.floor) || idx(r) > idx(window.max)) weights[r] = 0;
  }
  if (window.topWeight !== undefined && idx(window.max) > idx(window.floor)) {
    weights[window.max] *= window.topWeight;
  }
  // Pity lifts the top two allowed rarities that can drop at all.
  const allowed = RARITIES.filter((r) => weights[r] > 0);
  for (const r of allowed.slice(-2)) {
    if (idx(r) > idx(window.floor) || allowed.length === 1) weights[r] *= pity;
  }
  // Make sure the floor always leaves something to roll.
  if (RARITIES.every((r) => weights[r] === 0)) weights[window.floor] = 1;
  return weights;
}

export function rollItemChoices(
  data: GameData,
  actId: string,
  encounter: Encounter,
  rank: EnemyRank,
  deathsInAct: number,
  prestige: number,
  rng: Rng,
  affixFactor?: (affix: AffixDefinition) => number,
  /** Wildfire: Legendary chances times this. */
  legendaryBoost = 1,
  /** The boss's build card (neuausrichtung-v1.md 6.3): the first card leans to these affixes. */
  buildFactor?: (affix: AffixDefinition) => number,
): Item[] {
  const champion = encounter.champion === true;
  const homeUniques = data.acts.find((a) => a.id === actId)?.homeUniques ?? [];
  const count =
    rank === "boss"
      ? PROGRESSION.bossHoardCards
      : encounter.thief
        ? PROGRESSION.thiefCards
        : champion
          ? PROGRESSION.champion.cards
          : PROGRESSION.itemChoices;
  // A caught Ember Thief (and the Lost Cub's luck) always drops one card that is at least Rare.
  const rareCard = encounter.thief || encounter.lucky ? rng.int(0, count - 1) : -1;
  const gate = lootGate(prestige);
  const weights = itemPickWeights(rank, deathsInAct, prestige);
  // The run's window may promise one card of at least a rarity (the boss of run 1: a Rare).
  // A Champion's hoard holds one sure Epic (neuausrichtung-v1.md 6.1).
  const sure = champion ? "epic" : gate[rank].sure;
  const sureCard = sure ? rng.int(0, count - 1) : -1;
  const bySlot = new Map<ItemSlot, string[]>();
  for (const baseId of data.lootBases) {
    const slot = getBase(data.items, baseId).slot;
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), baseId]);
  }
  const slots = [...bySlot.keys()];
  const items: Item[] = [];
  // Bosses (sometimes Elites) may turn one card Legendary, or even Unique.
  const legendaryChance = champion
    ? Math.max(PROGRESSION.champion.legendary, gate.legendary[rank])
    : gate.legendary[rank];
  const legendaryCard = rng.chance(Math.min(1, legendaryChance * legendaryBoost))
    ? rng.int(0, count - 1)
    : -1;
  // A boss may drop one of its own trophies (Teil 3 "Boss-Trophäen").
  const trophies =
    rank === "boss" && encounter.boss && gate.trophies
      ? bossTrophies(data.items, actId).filter((u) => u.minItemLevel <= encounter.level)
      : [];
  const trophy =
    trophies.length && rng.chance(PROGRESSION.bossTrophyChance)
      ? trophies[rng.int(0, trophies.length - 1)]
      : undefined;
  const trophyCard = trophy ? rng.int(0, count - 1) : -1;
  for (let i = 0; i < count; i++) {
    if (trophy && i === trophyCard) {
      items.push(rollUnique(data.items, trophy.id, encounter.level, rng));
      const slot = getBase(data.items, trophy.baseId).slot;
      if (slots.includes(slot)) slots.splice(slots.indexOf(slot), 1);
      continue;
    }
    // Different slots while possible, so the three cards differ.
    const pool = slots.length ? slots : [...bySlot.keys()];
    const slot = pickWeighted(pool, (s) => PROGRESSION.lootSlotWeights[s], rng);
    if (!slot) break;
    slots.splice(slots.indexOf(slot), 1);
    const bases = bySlot.get(slot) ?? [];
    if (i === legendaryCard) {
      const uniques = uniquesFor(data.items, encounter.level, bases);
      // Home Uniques of the act come up more often (act-beute-entwurf-v1.md A2).
      const unique =
        uniques.length > 0 && rng.chance(PROGRESSION.uniqueShare)
          ? pickWeighted(
              uniques,
              (u) => (homeUniques.includes(u.id) ? PROGRESSION.homeUniqueWeight : 1),
              rng,
            )
          : undefined;
      if (unique) {
        items.push(rollUnique(data.items, unique.id, encounter.level, rng));
        continue;
      }
    }
    const baseId = bases[rng.int(0, bases.length - 1)];
    if (!baseId) break;
    const rolled = i === legendaryCard ? "legendary" : rollRarity(rng, weights);
    const atLeast = (r: Rarity, min: Rarity) =>
      RARITIES.indexOf(r) < RARITIES.indexOf(min) ? min : r;
    let rarity = i === rareCard ? atLeast(rolled, "rare") : rolled;
    if (sure && i === sureCard) rarity = atLeast(rarity, sure);
    const base = affixFactor ?? (() => 1);
    const factor =
      buildFactor && i === 0
        ? (affix: AffixDefinition) => base(affix) * buildFactor(affix)
        : affixFactor;
    items.push(
      rollItem(
        data.items,
        {
          baseId,
          itemLevel: encounter.level,
          rarity,
          ...(factor ? { affixFactor: factor } : {}),
        },
        rng,
      ),
    );
  }
  return items;
}

/** Adds Runes to the pouch. */
/** Act loot (favored affixes, e.g. Fire Resistance in the Ember Wastes) on top of the Codex. */
/**
 * Affixes whose tags match `tags` roll `weight` times as often (Elite themes, the boss's build
 * card). No tags: no change.
 */
export function tagAffixFactor(
  tags: readonly string[],
  weight: number,
): (affix: AffixDefinition) => number {
  if (!tags.length) return () => 1;
  return (affix) => (affix.tags.some((t) => tags.includes(t)) ? weight : 1);
}

/**
 * Normal fights give an item pick only on every `PROGRESSION.normalPickEvery`th normal fight of
 * a trip (`normalFight` counts them, this one included); Elites, Gatekeepers, bosses and a caught
 * Ember Thief always do (neuausrichtung-v1.md 6.3, act-karte-entwurf-v1.md K4).
 */
export function itemPickAt(
  rank: EnemyRank,
  normalFight: number,
  thiefCaught: boolean,
  every: number = PROGRESSION.normalPickEvery,
): boolean {
  return rank !== "normal" || thiefCaught || normalFight % every === 0;
}

export function actAffixFactor(
  act: ActData,
  codex: (affix: AffixDefinition) => number,
): (affix: AffixDefinition) => number {
  const favored = act.favoredAffixes ?? {};
  return (affix) => codex(affix) * (favored[affix.id] ?? 1);
}

export function addRunes(
  pouch: Readonly<Record<string, number>>,
  runes: readonly string[],
): Record<string, number> {
  const next = { ...pouch };
  for (const id of runes) next[id] = (next[id] ?? 0) + 1;
  return next;
}

/** Highest Rune rank that drops at an Act Tier (act number + Prestige). */
export function maxRuneRank(actTier: number): number {
  return PROGRESSION.runeRankBase + PROGRESSION.runeRanksPerActTier * actTier;
}

/** Runes a win drops: by chance per rank, lower Rune ranks far more often (like D2). */
export function rollRuneDrops(
  data: GameData,
  rank: EnemyRank,
  actTier: number,
  rng: Rng,
  /** The act's Home Rune (act-beute-entwurf-v1.md A1). */
  home?: string,
): string[] {
  const drops: string[] = [];
  const count = PROGRESSION.runeDrops[rank];
  for (let i = 0; i < Math.ceil(count); i++) {
    if (!rng.chance(Math.min(1, count - i))) continue;
    const rune = rollRune(data, actTier, rank !== "normal", rng, home);
    if (rune) drops.push(rune);
  }
  return drops;
}

/**
 * One Rune of an Act Tier. The top ranks are the Ber and Jah of Emberheir: only `high` drops
 * (Elites, Bosses, Caches) may give them, and rarely.
 */
export function rollRune(
  data: GameData,
  actTier: number,
  high: boolean,
  rng: Rng,
  /** The act's Home Rune: this share of the drops is it, if it may drop here at all. */
  home?: string,
): string | undefined {
  const max = maxRuneRank(actTier);
  const topRank = Math.max(...[...data.items.runes.values()].map((r) => r.rank));
  const isHigh = (r: { rank: number }) => r.rank > topRank - PROGRESSION.highRuneRanks;
  const homeRune = home ? data.items.runes.get(home) : undefined;
  if (homeRune && homeRune.rank <= max && (high || !isHigh(homeRune))) {
    const share = isHigh(homeRune) ? PROGRESSION.homeHighRuneShare : PROGRESSION.homeRuneShare;
    if (rng.chance(share)) return homeRune.id;
  }
  const pool = [...data.items.runes.values()].filter((r) => r.rank <= max && (high || !isHigh(r)));
  const weight = (r: { rank: number }) =>
    PROGRESSION.runeRankFalloff ** (r.rank - 1) * (isHigh(r) ? PROGRESSION.highRuneFactor : 1);
  return pickWeighted(pool, weight, rng)?.id;
}
