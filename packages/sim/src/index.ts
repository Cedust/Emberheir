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

/** Bumped whenever simulation rules change in a way that affects results or save games. */
export const SIM_VERSION = "0.1.0";
