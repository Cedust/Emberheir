import type { ItemSlot, Rarity } from "../items/types";

/**
 * Tuning numbers for progression and rewards. Starting values for the balance CLI
 * (`npm run balance -- --act 1`), not final design. Sources: game-design-document-v1.md
 * section 2 and 3, loot-rewards-v1.md, town-crafting-v1.md.
 */
/**
 * XP needed to go from level N to N + 1 (index 0 = level 1 → 2), up to level 200. Steep early: a
 * first clear of Act 1 lands around level 5–6 of 20. Past level 20 every level needs a little more
 * than the one before; later acts will tune this.
 */
function buildXpTable(): readonly number[] {
  const table = [
    80, 140, 220, 320, 450, 620, 830, 1100, 1450, 1900, 2400, 3000, 3700, 4500, 5400, 6400, 7500,
    8700, 10000,
  ];
  let step = 1300;
  while (table.length < 199) {
    step += 50;
    table.push((table[table.length - 1] ?? 0) + step);
  }
  return table;
}

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
  xpToNextLevel: buildXpTable(),
  /** XP of a normal enemy: base + perLevel × (Monster Level − 1). */
  xpBase: 20,
  xpPerMonsterLevel: 10,
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
  monsterLevelsPerEliteModifier: 10,
  maxEliteModifiers: 3,

  /** Spoils pick amounts (loot-rewards-v1.md section 4). */
  spoils: { flaskCharges: 1, reforgeStones: 2, essences: 1 },

  /** Ember Flask: heals a fraction of max life between stages, refilled in camp. */
  flaskStartCharges: 3,
  /** Spoils can push the flask above its start charges up to this many. */
  flaskMaxCharges: 5,
  flaskHeal: 0.35,

  /** Rotation Slots before the first prestige. */
  startRotationSlots: 1,

  /**
   * Prestige light (poc-umsetzungsplan-v1.md, M5): every Prestige gives one more Seal (Save
   * Token), Rotation Slot 2 (the first Battle Plan upgrade), one Harvester's Ember and a fixed
   * amount of Salvage Dust that replaces the burned stash (town-crafting-v1.md).
   */
  prestigeDustPerLevel: 150,
  prestigeHarvesterEmber: 1,
  /** Rotation Slots after the first Prestige. More Battle Plan upgrades come after the PoC. */
  prestigeRotationSlots: 2,
  /**
   * Monster Levels of every act go up by this much per Prestige. Act 1 stays easy for a hero
   * who keeps level and Seals but loses the rest of the gear (game-design-document-v1.md 3).
   */
  monsterLevelsPerPrestige: 2,

  /** Ascension Shards (Upgrade at the Blacksmith): every boss, sometimes an Elite. */
  bossAscensionShards: 1,
  eliteAscensionShardChance: 0.1,

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
} as const;
