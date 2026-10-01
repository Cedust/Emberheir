import type {
  Attributes,
  CombatantSetup,
  SkillDefinition,
  StatBonuses,
  TelegraphSpec,
  WeaponDefinition,
} from "./types";

export type EnemyArchetype = "brute" | "skirmisher" | "caster";

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
  /** Act bosses are never Elites and give better rewards. */
  readonly boss?: boolean;
}

/**
 * The Monster Level alone sets a monster's power (docs/design/gegner-bosse-v1.md section 7).
 * One curve for life and one for damage; starting values for the balance CLI.
 */
export function monsterLevelScaling(level: number): {
  readonly life: number;
  readonly damage: number;
} {
  const steps = Math.max(0, level - 1);
  return { life: 1 + 0.25 * steps, damage: 1 + 0.15 * steps };
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
  };
}
