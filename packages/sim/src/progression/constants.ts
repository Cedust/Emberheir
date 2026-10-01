import type { ItemSlot, Rarity } from "../items/types";

/**
 * Tuning numbers for progression and rewards. Starting values for the balance CLI
 * (`npm run balance -- --act 1`), not final design. Sources: game-design-document-v1.md
 * section 2 and 3, loot-rewards-v1.md, town-crafting-v1.md.
 */
export const PROGRESSION = {
  /** Level Cap of the first run; +10 per prestige later. */
  levelCap: 10,
  attributePointsPerLevel: 3,
  skillPointsPerLevel: 1,
  /**
   * XP needed to go from level N to N + 1 (index 0 = level 1 → 2). Steep early: a first clear
   * of Act 1 lands around level 4–5.
   */
  xpToNextLevel: [80, 140, 220, 320, 450, 620, 830, 1100, 1450],
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
  /** Rarity weights of the item pick; Elites roll at least Rare, Bosses at least Epic. */
  rarityWeights: { normal: 40, magic: 35, rare: 20, epic: 5, legendary: 0 } satisfies Record<
    Rarity,
    number
  >,
  eliteMinRarity: "rare" as Rarity,
  bossMinRarity: "epic" as Rarity,
  /** Pity: every death in the current act raises Rare and Epic weights by this much... */
  pityPerDeath: 0.25,
  /** ...for at most this many deaths. Resets when the act boss falls. */
  pityMaxDeaths: 4,

  /** Elite chance = base + perStage × (stage in act − 1) (+ per act / prestige later). */
  eliteChanceBase: 0.05,
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

  /** Inventory grid (D2 style). */
  inventoryWidth: 10,
  inventoryHeight: 4,
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
