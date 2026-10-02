import type { Rarity } from "./types";

/**
 * Tuning numbers for items. Starting values for the balance CLI, not final design
 * (docs/design/item-system-v1.md). Percentages are fractions.
 */
export const ITEMS = {
  /** Item Level 1–10 = T1, 11–20 = T2, ... */
  itemLevelsPerTier: 10,
  maxTier: 10,
  /**
   * Affix stages inside a tier, unlocked by the Item Level's position in the tier: position 1–3
   * rolls stage 1, 4–6 up to stage 2, 7–10 up to stage 3. Each stage is a third of the range.
   */
  stageUnlockPositions: [1, 4, 7],
  /** Weapon damage and flat base values (Armor, Block Value): × (1 + this × (tier − 1)). */
  baseScalePerTier: 1,
  /** Attribute Requirements grow by this many points per tier above 1. */
  requirementPerTier: 8,
  /** Magic items roll each affix this often and keep the best quality ("higher values"). */
  magicQualityRolls: 2,

  /** Number of affixes per rarity (docs/design/item-system-v1.md section 5). */
  affixCounts: {
    normal: { stat: [0, 0], trigger: [0, 0], extraTriggerChance: 0 },
    magic: { stat: [1, 2], trigger: [0, 0], extraTriggerChance: 0.1 },
    rare: { stat: [3, 4], trigger: [0, 0], extraTriggerChance: 0.25 },
    epic: { stat: [4, 5], trigger: [1, 1], extraTriggerChance: 0.2 },
    // Fewer affixes than Epic, but a Legendary Power on top.
    legendary: { stat: [3, 4], trigger: [1, 1], extraTriggerChance: 0 },
  } satisfies Record<
    Rarity,
    { stat: [number, number]; trigger: [number, number]; extraTriggerChance: number }
  >,

  /** Chance that a dropped Normal item of a socketable base has Sockets. */
  socketChance: 0.6,

  /** Default rarity weights for a random drop (Legendaries come from bosses and gambling). */
  rarityWeights: { normal: 40, magic: 35, rare: 20, epic: 5, legendary: 0 } satisfies Record<
    Rarity,
    number
  >,
} as const;
