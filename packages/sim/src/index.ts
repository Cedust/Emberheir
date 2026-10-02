export { Rng } from "./rng";
export * from "./combat/types";
export { COMBAT } from "./combat/constants";
export { deriveStats, heroBaseLife, sumBonuses, type DerivedStats } from "./combat/stats";
export {
  armorReduction,
  elementResistance,
  resistanceReduction,
  resolveHit,
  type HitInput,
  type HitOutcome,
} from "./combat/damage";
export { triggerThreshold } from "./combat/heat";
export {
  Fight,
  runFight,
  skillCost,
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
  affixPosition,
  createItemCatalog,
  getBase,
  pickWeighted,
  powersForSlot,
  rollItem,
  rollRarity,
  rollSockets,
  rollUnique,
  uniquesFor,
  type RollItemOptions,
} from "./items/generate";
export { activeRuneword, freeSockets, matchRuneword, runeBonuses, runeGroup } from "./items/runes";
export { mergeRules } from "./combat/rules";
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
  SPEED_BASE_ATTACKS_PER_SECOND,
  STAT_NAMES,
  describeBonuses,
  describeCondition,
  describeEffect,
  describeItem,
  describeStat,
  describeTrigger,
  formatPercent,
  speedValue,
  type ItemTooltip,
} from "./items/describe";

export * from "./progression/index";

/** Bumped whenever simulation rules change in a way that affects results or save games. */
export const SIM_VERSION = "0.8.0";
