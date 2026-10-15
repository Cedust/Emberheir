export { Rng } from "./rng";
export * from "./combat/types";
export { COMBAT } from "./combat/constants";
export { deriveStats, heroBaseLife, sumBonuses, type DerivedStats } from "./combat/stats";
export {
  BREAKPOINTS,
  PERK,
  PERKS,
  PERK_IDS,
  getPerk,
  perksFor,
  type PerkDefinition,
  type PerkId,
} from "./combat/perks";
export {
  armorReduction,
  elementResistance,
  resistanceReduction,
  resolveHit,
  type HitInput,
  type HitOutcome,
} from "./combat/damage";
export { triggerThreshold } from "./combat/heat";
export { Fight, runFight } from "./combat/fight";
export { heavyHitCap, skillCost } from "./combat/fighter";
export type {
  CombatEvent,
  FightResult,
  FightSnapshot,
  FighterSnapshot,
  PayoffKind,
  RotationSlotSnapshot,
} from "./combat/events";
export { PAYOFF_KINDS } from "./combat/events";
export { outcomeOf, type FightOutcome } from "./combat/outcome";
export { AILMENT_SOURCE, damageShare, fightReport, type FightReport } from "./combat/report";
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
  lifeGrowth,
  isLifeLikeStat,
  unlockedStages,
  GREATER,
  greaterName,
  greaterRank,
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
  bossTrophies,
  type RollItemOptions,
} from "./items/generate";
export { activeRuneword, freeSockets, matchRuneword, runeBonuses, runeGroup } from "./items/runes";
export { codexPartsOf, kindledAffix, kindledAffixId, kindledAffixes } from "./items/codex";
export { mergeRules } from "./combat/rules";
export {
  addedDamageRange,
  itemFlaskCharges,
  itemModifiers,
  itemSlotFor,
  itemWeapon,
  missingRequirements,
  offHandFits,
  requiredLevel,
  requirementsFor,
  resolveEquipment,
  scaledBaseStats,
  scaledFlatBonuses,
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
export * from "./save/index";

/** Bumped whenever simulation rules change in a way that affects results or save games. */
export const SIM_VERSION = "0.12.0";
