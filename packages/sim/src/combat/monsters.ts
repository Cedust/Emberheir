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
  "brute" | "skirmisher" | "caster" | "afflicter" | "warden" | "thornback" | "harvester";

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

/**
 * Monster Level bands: one per run, ending at that run's Level Cap (5 levels per act played:
 * 5, 15, 30, ... 140, see `levelCap` in progression). Every band grows steeper than the one
 * before, because the hero's gear, tree and Battle Plan grow faster than linear too.
 */
export const MONSTER_BAND_ENDS: readonly number[] = (() => {
  const ends: number[] = [];
  let acts = 0;
  for (let run = 1; run <= 7; run++) {
    acts += Math.min(run, 7);
    ends.push(5 * acts);
  }
  return ends;
})();
/**
 * Growth per Monster Level in the first band, and how much steeper each band is: the step of
 * band b is 1 + perBand × b + perBandSquared × b². Later runs keep all their gear and get
 * steeper monsters for it.
 */
const MONSTER_GROWTH = { life: 0.15, damage: 0.08, perBand: 1, perBandSquared: 0.25 };

/**
 * The Monster Level alone sets a monster's power (docs/design/gegner-bosse-v1.md section 7).
 * One curve for life and one for damage, made of a straight piece per band. Starting values for
 * the balance CLI.
 */
export function monsterLevelScaling(level: number): {
  readonly life: number;
  readonly damage: number;
} {
  let weight = 0;
  for (let l = 2; l <= level; l++) {
    const band = MONSTER_BAND_ENDS.findIndex((end) => l <= end);
    const b = band < 0 ? MONSTER_BAND_ENDS.length : band;
    weight += 1 + MONSTER_GROWTH.perBand * b + MONSTER_GROWTH.perBandSquared * b * b;
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
