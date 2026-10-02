import type {
  Attributes,
  CombatantSetup,
  SkillDefinition,
  StatBonuses,
  TelegraphSpec,
  TriggerSpec,
  WeaponDefinition,
} from "./types";

/** Enemy archetypes (docs/design/gegner-bosse-v1.md section 3): each asks the build a question. */
export type EnemyArchetype =
  "brute" | "skirmisher" | "caster" | "afflicter" | "warden" | "thornback";

/** An enemy template. Its numbers are for Monster Level 1 and scale with the level. */
export interface EnemyDefinition {
  readonly id: string;
  readonly name: string;
  readonly archetype: EnemyArchetype;
  readonly description: string;
  readonly attributes: Attributes;
  readonly weapon: WeaponDefinition;
  readonly skills: readonly SkillDefinition[];
  /** Base life at Monster Level 1 (before Vitality). */
  readonly baseLife: number;
  readonly bonuses?: StatBonuses;
  /** Telegraphed Heavy Attacks (bosses). */
  readonly telegraphs?: readonly TelegraphSpec[];
  /** Innate triggers, e.g. a Warden healing itself. */
  readonly triggers?: readonly TriggerSpec[];
  /** Act bosses are never Elites and give better rewards. */
  readonly boss?: boolean;
}

/** Monster Levels per band: every band the per-level growth below gets steeper. */
export const MONSTER_LEVELS_PER_BAND = 20;
/** Growth per Monster Level in the first band (levels 1–20), and how much steeper each band is. */
const MONSTER_GROWTH = { life: 0.15, damage: 0.08, perBand: 2.5 };

/**
 * The Monster Level alone sets a monster's power (docs/design/gegner-bosse-v1.md section 7).
 * One curve for life and one for damage. Each level adds a fixed step, and the step grows every
 * 20 levels (one run's Level Band), because the hero's gear, tree and Battle Plan grow faster than
 * linear too. Starting values for the balance CLI.
 */
export function monsterLevelScaling(level: number): {
  readonly life: number;
  readonly damage: number;
} {
  let weight = 0;
  for (let l = 2; l <= level; l++) {
    weight += 1 + MONSTER_GROWTH.perBand * Math.floor((l - 2) / MONSTER_LEVELS_PER_BAND);
  }
  return { life: 1 + MONSTER_GROWTH.life * weight, damage: 1 + MONSTER_GROWTH.damage * weight };
}

/** Builds the fight setup for an enemy at a given Monster Level. */
export function createEnemySetup(enemy: EnemyDefinition, level: number): CombatantSetup {
  const scaling = monsterLevelScaling(level);
  return {
    name: enemy.name,
    level,
    attributes: enemy.attributes,
    weapon: enemy.weapon,
    rotation: enemy.skills.map((skill) => ({ skill })),
    baseLife: enemy.baseLife * scaling.life,
    damageMultiplier: scaling.damage,
    ...(enemy.bonuses ? { bonuses: enemy.bonuses } : {}),
    ...(enemy.telegraphs ? { telegraphs: enemy.telegraphs } : {}),
    ...(enemy.triggers ? { triggers: enemy.triggers } : {}),
  };
}
