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
  /** Damage factor on top of the Monster Level (default 1), for a foe whose kit hits extra hard. */
  readonly damage?: number;
}

/**
 * Monster Level bands (level-v2.md section 4): one per run, ending at the Monster Level of that
 * run's harvest boss: 10, 20, 30, 45, 60, 75 and 90 (the Harvester). The hero's Level Cap is 10
 * above it (`levelCap` in progression), so a wall can be out-levelled.
 */
export const MONSTER_BAND_ENDS: readonly number[] = [10, 20, 30, 45, 60, 75, 90];

/**
 * Monster power per Monster Level (balancing-neustart-v1.md, step 3): one table, measured from the
 * hero. At each anchor, monster Life grows like the autopilot hero's damage per second and monster
 * damage like its effective Life (`npm run balance -- --act 7 --build all --mastery all --curve 1`,
 * medians of all 72 builds, 2026-10-19), both relative to Monster Level 1. Between anchors the
 * growth is even per level. Above 88 (Wildfire) it keeps the growth of the old level curve.
 */
export const MONSTER_TABLE: readonly {
  readonly level: number;
  readonly life: number;
  readonly damage: number;
}[] = [
  { level: 1, life: 1, damage: 1 },
  { level: 8, life: 1.3, damage: 1.75 },
  { level: 18, life: 6.1, damage: 5 },
  { level: 28, life: 19, damage: 13 },
  { level: 43, life: 45, damage: 29 },
  { level: 58, life: 135, damage: 77 },
  { level: 73, life: 360, damage: 180 },
  { level: 88, life: 1090, damage: 525 },
  { level: 100, life: 1760, damage: 945 },
  { level: 110, life: 2540, damage: 1490 },
];

/**
 * The Monster Level alone sets a monster's power (docs/design/gegner-bosse-v1.md section 7):
 * `MONSTER_TABLE`, evenly between its anchors (and on past the last one).
 */
export function monsterLevelScaling(level: number): {
  readonly life: number;
  readonly damage: number;
} {
  const table = MONSTER_TABLE;
  let i = 0;
  while (i < table.length - 2 && level > (table[i + 1]?.level ?? 0)) i++;
  const a = table[i] ?? { level: 1, life: 1, damage: 1 };
  const b = table[i + 1] ?? a;
  if (level <= a.level && i === 0) return { life: a.life, damage: a.damage };
  const t = b.level > a.level ? (level - a.level) / (b.level - a.level) : 0;
  const grow = (x: number, y: number) => x * (y / x) ** t;
  return { life: grow(a.life, b.life), damage: grow(a.damage, b.damage) };
}

/** Builds the fight setup for an enemy at a given Monster Level. */
export function createEnemySetup(enemy: EnemyDefinition, level: number): CombatantSetup {
  const scaling = monsterLevelScaling(level);
  // Monster Armor grows with the Monster Level like the hero's Armor constant does, so an armored
  // monster keeps the same footing all game and Physical Penetration stays worth something.
  const bonuses = {
    ...enemy.bonuses,
    increasedArmor: (enemy.bonuses?.increasedArmor ?? 0) + COMBAT.monsterArmorPerLevel * level - 1,
    allResistance: (enemy.bonuses?.allResistance ?? 0) + COMBAT.monsterResistance,
  };
  return {
    name: enemy.name,
    level,
    attributes: enemy.attributes,
    weapon: enemy.weapon,
    rotation: enemy.skills.map((skill) => ({ skill })),
    baseLife: enemy.baseLife * scaling.life,
    damageMultiplier: scaling.damage * (enemy.damage ?? 1),
    bonuses,
    ...(enemy.telegraphs ? { telegraphs: enemy.telegraphs } : {}),
    ...(enemy.triggers ? { triggers: enemy.triggers } : {}),
    ...(enemy.boss ? { rules: { stunTaken: COMBAT.bossStunTaken } } : {}),
  };
}
