import { COMBAT } from "./constants";
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
 * Monster Level bands (level-v2.md section 4): one per run, ending at the Monster Level of that
 * run's harvest boss: 10, 20, 30, 45, 60, 75 and 90 (the Harvester). The hero's Level Cap is 10
 * above it (`levelCap` in progression), so a wall can be out-levelled.
 */
export const MONSTER_BAND_ENDS: readonly number[] = [10, 20, 30, 45, 60, 75, 90];

/**
 * Growth weight per Monster Level in each band. Every band grows steeper than the one before,
 * because the hero's gear, tree and Battle Plan grow faster than linear too. The numbers keep
 * each band's total growth from Playtest 2 (bands 5, 15, 30, ... 140), spread over the new bands.
 */
const BAND_STEP: readonly number[] = (() => {
  const oldEnds = [5, 15, 30, 50, 75, 105, 140];
  return MONSTER_BAND_ENDS.map((end, b) => {
    const oldLength = (oldEnds[b] ?? 0) - (b === 0 ? 1 : (oldEnds[b - 1] ?? 0));
    const length = end - (b === 0 ? 1 : (MONSTER_BAND_ENDS[b - 1] ?? 0));
    return (oldLength * (1 + b + 0.25 * b * b)) / length;
  });
})();
const MONSTER_GROWTH = { life: 0.15, damage: 0.08 };

/** Same kind of growth before the level rework (+12 Life on 100, Weapon Damage + 1/16 per level). */
const OLD_GROWTH = { life: 0.12, damage: 1 / 16 };

/** The Playtest 2 hero level that a Monster Level stands for (piecewise along the band ends). */
function oldLevel(level: number): number {
  const oldEnds = [5, 15, 30, 50, 75, 105, 140];
  let prevNew = 1;
  let prevOld = 1;
  for (let b = 0; b < MONSTER_BAND_ENDS.length; b++) {
    const end = MONSTER_BAND_ENDS[b] ?? 1;
    const oldEnd = oldEnds[b] ?? 1;
    if (level <= end || b === MONSTER_BAND_ENDS.length - 1) {
      return prevOld + ((level - prevNew) * (oldEnd - prevOld)) / (end - prevNew);
    }
    prevNew = end;
    prevOld = oldEnd;
  }
  return level;
}

/**
 * The Monster Level alone sets a monster's power (docs/design/gegner-bosse-v1.md section 7).
 * A band curve (a straight piece per band) times the hero's own level growth: Life follows the
 * hero's Weapon Damage, damage follows the hero's Life. Starting values for the balance CLI.
 */
export function monsterLevelScaling(level: number): {
  readonly life: number;
  readonly damage: number;
} {
  let weight = 0;
  for (let l = 2; l <= level; l++) {
    const band = MONSTER_BAND_ENDS.findIndex((end) => l <= end);
    const b = band < 0 ? MONSTER_BAND_ENDS.length - 1 : band;
    weight += BAND_STEP[b] ?? 1;
  }
  // The hero's own level growth (COMBAT.heroLevelGrowth) is matched, so a hero at the Monster
  // Level keeps the same footing all game and every level above it is a real edge.
  // Undo the old hero growth the band curve was tuned against and add the new one.
  const old = oldLevel(level) - 1;
  const heroLife = (1 + COMBAT.heroLevelGrowth.life) ** (level - 1) / (1 + OLD_GROWTH.life * old);
  const heroDamage =
    (1 + COMBAT.heroLevelGrowth.damage) ** (level - 1) / (1 + OLD_GROWTH.damage * old);
  return {
    life: (1 + MONSTER_GROWTH.life * weight) * heroDamage,
    damage: (1 + MONSTER_GROWTH.damage * weight) * heroLife,
  };
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
