import type { ItemSlot, Rarity } from "../items/types";
import type { EnemyRank } from "./leveling";

/**
 * Tuning numbers for progression and rewards. Starting values for the balance CLI
 * (`npm run balance -- --act 1`), not final design. Sources: game-design-document-v1.md
 * section 2 and 3, loot-rewards-v1.md, town-crafting-v1.md.
 */
/**
 * XP needed to go from level N to N + 1 (index 0 = level 1 → 2), up to level 200. Each run spreads
 * its Level Band over all its stages (prestige-acts-v1.md section 4), one fight per stage, so a
 * level costs about `xpKillsPerLevel` normal kills of the same Monster Level. The hero keeps pace
 * with the monsters, and the XP penalty for being above them stops it from running ahead.
 */
function buildXpTable(base: number, perLevel: number, killsPerLevel: number): readonly number[] {
  const table: number[] = [];
  for (let level = 1; level < 200; level++)
    table.push(Math.round(killsPerLevel * (base + perLevel * (level - 1))));
  return table;
}

const XP_BASE = 20;
const XP_PER_MONSTER_LEVEL = 10;
const XP_KILLS_PER_LEVEL = 0.8;

export const PROGRESSION = {
  /**
   * Level Cap of the first run... Playtest 1: a cap of 10 was half reached after Act 1, so the
   * cap doubled and each level gives fewer Attribute Points.
   */
  levelCap: 20,
  /** ...and +20 per Prestige (level 200 in the tenth run). */
  levelCapPerPrestige: 20,
  attributePointsPerLevel: 2,
  skillPointsPerLevel: 1,
  xpToNextLevel: buildXpTable(XP_BASE, XP_PER_MONSTER_LEVEL, XP_KILLS_PER_LEVEL),
  /** XP of a normal enemy: base + perLevel × (Monster Level − 1). */
  xpBase: XP_BASE,
  xpPerMonsterLevel: XP_PER_MONSTER_LEVEL,
  /** Enemies below the hero's level give 10 % less XP per level, at least 10 %. */
  xpPenaltyPerLevel: 0.1,
  xpMinFactor: 0.1,

  goldBase: 4,
  goldPerMonsterLevel: 2,
  /** Salvage Dust every win gives on top of the auto-salvaged loot. */
  dustBase: 1,
  dustPerMonsterLevel: 1,

  /** Reward multipliers for Elites and Bosses (XP, Gold, Dust). */
  eliteRewardMultiplier: { xp: 3, gold: 2, dust: 2 },
  bossRewardMultiplier: { xp: 6, gold: 5, dust: 4 },
  /** Chance that one card of the item pick is Legendary, by enemy rank. */
  legendaryChance: { normal: 0, elite: 0.04, boss: 0.25 } satisfies Record<EnemyRank, number>,
  /** Share of those Legendary cards that become a Unique (if one fits). */
  uniqueShare: 0.35,
  /** Boss Hoard: cards after a boss and how many of them the hero takes. */
  bossHoardCards: 6,
  bossHoardPicks: 2,
  /** Chance per boss kill that one Hoard card is a trophy from the boss's own list. */
  bossTrophyChance: 0.1,
  /** The top Rune ranks only drop from Elites and Bosses, this much rarer on top of the falloff. */
  highRuneRanks: 2,
  highRuneFactor: 0.3,
  /** Expected Runes per win by rank (fractions are chances, 1.5 = one plus 50 % a second). */
  runeDrops: { normal: 0.06, elite: 0.5, boss: 1.5 } satisfies Record<EnemyRank, number>,
  /** Rune ranks that drop: base + per Act Tier (Act 1 → up to rank 3, Act 2 → 5). */
  runeRankBase: 1,
  runeRanksPerActTier: 2,
  /** Each Rune rank drops this much less often than the one below it. */
  runeRankFalloff: 0.5,
  /** Guaranteed Reforge Stones (min, max). */
  eliteReforgeStones: [2, 3],
  bossReforgeStones: [4, 6],

  /** Salvage Dust for one item: by rarity, × Item Tier. */
  salvageDust: { normal: 2, magic: 4, rare: 8, epic: 16, legendary: 32 } satisfies Record<
    Rarity,
    number
  >,

  /** Cards in the item pick after every win. */
  itemChoices: 3,
  /**
   * Item pick: each card picks an item slot by these weights (three different slots while
   * possible), then a random base of that slot. So adding bases to a slot never makes weapons
   * rarer. Rings fill two equipment slots and show up a bit more often.
   */
  lootSlotWeights: {
    mainHand: 1.2,
    offHand: 1,
    helm: 1,
    body: 1,
    gloves: 1,
    boots: 1,
    belt: 1,
    amulet: 1,
    ring: 1.5,
  } satisfies Record<ItemSlot, number>,
  /** Rarity weights of the item pick; Elites roll at least Rare, Bosses at least Epic. */
  rarityWeights: { normal: 40, magic: 35, rare: 20, epic: 5, legendary: 0 } satisfies Record<
    Rarity,
    number
  >,
  eliteMinRarity: "rare" as Rarity,
  bossMinRarity: "epic" as Rarity,
  /**
   * Highest rarity normal enemies drop, by Act Tier (act number + Prestige, index 0 = Act Tier 1).
   * Playtest 1: all slots were Epic within Act 1. Now Act 1 drops Normal and Magic, Rare comes
   * from Elites and Epic from the boss; Rare drops freely from Act Tier 2, Epic from Act Tier 3.
   * Elites never roll above Rare before Epic is unlocked.
   */
  maxRarityByActTier: ["magic", "rare"] as readonly Rarity[],
  /** Rarity for Act Tiers past the list. */
  maxRarityLate: "epic" as Rarity,
  /** Pity: every death in the current act raises the two highest allowed weights by this much... */
  pityPerDeath: 0.25,
  /** ...for at most this many deaths. Resets when the act boss falls. */
  pityMaxDeaths: 4,

  /** Elite chance = base + perStage × (stage in act − 1) (+ per act / prestige later). */
  eliteChanceBase: 0.05,
  /** No Elites on the first stages of an act, so a fresh Heir cannot lose its first fight. */
  eliteFreeStages: 2,
  eliteChancePerStage: 0.005,
  eliteChancePerAct: 0.02,
  eliteChanceCap: 0.5,
  /** Elites are tougher: life and damage multipliers on top of their modifiers. */
  eliteLifeMultiplier: 1.4,
  eliteDamageMultiplier: 1.15,
  /** Number of Elite modifiers: 1 + one more every this many Monster Levels, at most 3. */
  monsterLevelsPerEliteModifier: 25,
  maxEliteModifiers: 3,

  /** Spoils pick amounts (loot-rewards-v1.md section 4). */
  spoils: { flaskCharges: 1, reforgeStones: 2, essences: 1 },

  /** Ember Flask: heals a fraction of max life between stages, refilled in camp. */
  flaskStartCharges: 3,
  /** Spoils can push the flask above its start charges up to this many. */
  flaskMaxCharges: 5,
  flaskHeal: 0.35,

  /**
   * Every Prestige gives one more Seal (Save Token), one Battle Plan upgrade (battle-plan.ts),
   * a Prestige branch, one Harvester's Ember and a fixed amount of Salvage Dust that replaces the
   * burned stash (town-crafting-v1.md).
   */
  prestigeDustPerLevel: 150,
  prestigeHarvesterEmber: 1,
  /**
   * A run's level band starts this far below the previous Level Cap (prestige-acts-v1.md 4): a
   * hero who keeps level and Seals but loses the rest of the gear regears on the first stages.
   */
  levelBandStartBelowCap: 15,
  /** ...and 5 more per Prestige after the first, because the hero regears from further behind. */
  levelBandStartBelowCapPerPrestige: 5,
  /**
   * Run Pressure: a hero who regears from nothing grows much faster within a run than the Monster
   * Level alone. Along the run, monsters gain up to this much Life and damage per act after the
   * first, so a run's newest act stays the hardest.
   */
  runPressure: { life: 0.25, damage: 0.15 },

  /** Ascension Shards (Upgrade at the Blacksmith): every boss, sometimes an Elite. */
  bossAscensionShards: 1,
  eliteAscensionShardChance: 0.1,

  /** Switching to another Battle Plan Capstone at Kaelen. */
  capstoneChangeGold: 200,

  /** Skill Tree respec at Kaelen. */
  respecGold: 50,

  /** Inventory grid (D2 style). */
  inventoryWidth: 10,
  inventoryHeight: 4,
  /** Stash in the Supply Wagon: fixed size, no tabs. */
  stashWidth: 10,
  stashHeight: 10,
  /** Default item size per slot in grid cells (bases can override). */
  itemSizes: {
    mainHand: { w: 1, h: 3 },
    offHand: { w: 2, h: 2 },
    helm: { w: 2, h: 2 },
    body: { w: 2, h: 3 },
    gloves: { w: 2, h: 2 },
    boots: { w: 2, h: 2 },
    belt: { w: 2, h: 1 },
    amulet: { w: 1, h: 1 },
    ring: { w: 1, h: 1 },
  } satisfies Record<ItemSlot, { w: number; h: number }>,
} as const;

/**
 * Camp crafting costs (docs/design/town-crafting-v1.md section 3). Starting values: a full Act 1
 * run brings roughly 100–150 Gold and a few hundred Salvage Dust.
 */
export const CRAFTING = {
  /** Upgrade (+1 Tier) at Thoric: 1 Ascension Shard + this much Gold × current Tier. */
  upgradeGoldPerTier: 60,
  upgradeShards: 1,
  /** Temper (reroll one affix value) at Liora. */
  temperDust: 10,
  temperGold: 15,
  /** Reforge (reroll all affixes) at Liora. */
  reforgeStones: 1,
  /** Imbue (replace one affix with the Essence's affix) at Liora. */
  imbueEssences: 1,
  /** Distill: Salvage Dust into one Reforge Stone at Liora. */
  distillDust: 60,
  /** Add Socket at Thoric: Gold plus Dust × the new Socket count. */
  addSocketGold: 25,
  addSocketDust: 15,
  /** Eldrin: Socket a Rune / combine three into the next rank, Gold × rank. */
  socketRuneGoldPerRank: 8,
  combineRunesGoldPerRank: 15,
  combineRunesCount: 3,
  /** Marisha: offers in stock, prices. */
  merchantOffers: 6,
  basePriceFlat: 20,
  basePricePerSocket: 15,
  gambleFlat: 60,
  gamblePerItemLevel: 12,
  gambleRarityWeights: { normal: 0, magic: 55, rare: 30, epic: 12, legendary: 3 } satisfies Record<
    Rarity,
    number
  >,
} as const;

/** Trigger Codex (docs/design/trigger-codex-v1.md). Starting values for the balance CLI. */
export const CODEX = {
  /** Trigger affixes whose Condition or Effect has its home in the fight drop this much more. */
  homeWeight: 4,
  /** The Quarry part (marked at Old Nan) drops this much more on top. */
  quarryWeight: 3,
  /** After this many Elite or boss item picks without the Quarry part, the next one has it. */
  quarryPity: 5,
  /** Kindled triggers roll at most this share of the range; only drops reach 100 %. */
  kindleMaxQuality: 0.7,
  /** Kindle at Liora: Dust × the kindled tier plus Kindling. */
  kindleDustPerTier: 30,
  kindleKindling: 1,
  /** Kindling in the Spoils pick of Elites and bosses. */
  eliteKindling: 1,
  bossKindling: 2,
} as const;
