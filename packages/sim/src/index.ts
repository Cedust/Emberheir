export { Rng } from "./rng";
export * from "./combat/types";
export { COMBAT } from "./combat/constants";
export { deriveStats, heroBaseLife, sumBonuses, type DerivedStats } from "./combat/stats";
export {
  armorReduction,
  resistanceReduction,
  resolveHit,
  type HitInput,
  type HitOutcome,
} from "./combat/damage";
export { triggerThreshold } from "./combat/heat";
export {
  Fight,
  runFight,
  type CombatEvent,
  type FightResult,
  type FightSnapshot,
  type FighterSnapshot,
  type RotationSlotSnapshot,
} from "./combat/fight";
export {
  createEnemySetup,
  monsterLevelScaling,
  type EnemyArchetype,
  type EnemyDefinition,
} from "./combat/monsters";

export { type BuffState, applyBuff, buffBonuses, triggerChance } from "./combat/triggers";

export * from "./items/types";
export { ITEMS } from "./items/constants";
export {
  affixPool,
  affixWeight,
  isPercentStat,
  rawAffixValue,
  resolveTrigger,
  rollQuality,
  statAffixValue,
  tierForItemLevel,
  tierGrowth,
  unlockedStages,
} from "./items/affixes";
export {
  basesForSlot,
  createItemCatalog,
  getBase,
  pickWeighted,
  rollItem,
  rollRarity,
  type RollItemOptions,
} from "./items/generate";
export {
  addedDamageRange,
  itemModifiers,
  itemSlotFor,
  itemWeapon,
  missingRequirements,
  requirementsFor,
  resolveEquipment,
  scaledBaseStats,
  type InactiveReason,
  type ItemModifiers,
  type ResolvedEquipment,
} from "./items/equipment";
export {
  RARITY_NAMES,
  SLOT_NAMES,
  STAT_NAMES,
  describeBonuses,
  describeCondition,
  describeEffect,
  describeItem,
  describeStat,
  describeTrigger,
  formatPercent,
  type ItemTooltip,
} from "./items/describe";

/** Bumped whenever simulation rules change in a way that affects results or save games. */
export const SIM_VERSION = "0.2.0";
