/**
 * Data shapes for the combat core. Content (weapons, skills, enemies) is written against these
 * types in `@emberheir/content`; the simulation only ever reads them.
 */

export const ATTRIBUTES = [
  "strength",
  "dexterity",
  "agility",
  "intelligence",
  "wisdom",
  "vitality",
] as const;
export type Attribute = (typeof ATTRIBUTES)[number];
export type Attributes = Readonly<Record<Attribute, number>>;

export const ELEMENTS = ["fire", "cold", "lightning", "void"] as const;
export type Element = (typeof ELEMENTS)[number];
export type DamageType = "physical" | Element;

/** Ailments implemented so far (PoC: Burn, Chill, Shock). */
export type AilmentType = "burn" | "chill" | "shock";

/** How a weapon fills the Heat bar, see docs/design/waffen-v1.md section 4. */
export type HeatBehavior = "cooling" | "steady" | "warming";

export type Side = "hero" | "enemy";

export interface DamageRange {
  readonly min: number;
  readonly max: number;
}

/** "X % chance to inflict an ailment" attached to a hit. */
export interface AilmentChance {
  readonly ailment: AilmentType;
  /** 0..1 */
  readonly chance: number;
}

/**
 * Flat stat bonuses from implicits, items and buffs. All percentages are fractions
 * (0.05 = 5 %). Missing keys mean 0.
 */
export interface StatBonuses {
  readonly life?: number;
  readonly armor?: number;
  readonly physicalDamage?: number;
  readonly elementalDamage?: number;
  readonly critChance?: number;
  readonly triggerChance?: number;
  readonly attackSpeed?: number;
  readonly evasion?: number;
  readonly blockChance?: number;
  readonly blockValue?: number;
  readonly allResistance?: number;
  readonly heatGain?: number;
  readonly startingHeat?: number;
  readonly ailmentDuration?: number;
  readonly tenacity?: number;
  readonly lifesteal?: number;
  readonly physicalPenetration?: number;
  readonly elementalPenetration?: number;
}

export interface WeaponDefinition {
  readonly id: string;
  readonly name: string;
  /** Name of the weapon's Default Attack, e.g. "Slash" or "Spark". */
  readonly defaultAttack: string;
  readonly damage: DamageRange;
  readonly damageType: DamageType;
  readonly attacksPerSecond: number;
  readonly heatBehavior: HeatBehavior;
  /** Heat per landed Default Attack (Cooling / Steady). Ignored for Warming. */
  readonly heatPerHit: number;
  readonly range: "melee" | "ranged";
  readonly implicit: StatBonuses;
  readonly ailmentChances?: readonly AilmentChance[];
}

export type SkillType = "attack" | "spell" | "buff" | "curse";

/** A single damaging hit a skill performs. Skills combine one or more of these. */
export type SkillHit =
  | {
      /** Weapon-based hit (Attack skills). Uses weapon damage, type and evasion rules. */
      readonly kind: "weapon";
      /** 2.2 = 220 % Weapon Damage. */
      readonly multiplier: number;
      /** Number of separate hits (Flurry). Default 1. */
      readonly count?: number;
      readonly ailmentChances?: readonly AilmentChance[];
      /** Execute: multiply damage when the target is below this life fraction. */
      readonly lowLifeBonus?: { readonly threshold: number; readonly multiplier: number };
    }
  | {
      /** Spell hit with its own base damage, scaled by skill level. Cannot be evaded. */
      readonly kind: "spell";
      readonly damage: DamageRange;
      readonly damageType: DamageType;
      readonly count?: number;
      /** Each further hit deals this fraction of the previous one (Chain Lightning). */
      readonly falloff?: number;
      readonly ailmentChances?: readonly AilmentChance[];
    };

export interface SkillDefinition {
  readonly id: string;
  readonly name: string;
  readonly type: SkillType;
  readonly heatCost: number;
  readonly tags: readonly string[];
  readonly description: string;
  readonly hits: readonly SkillHit[];
}

/** One Rotation Slot of the Battle Plan. */
export interface RotationSlot {
  readonly skill: SkillDefinition;
  /** Trigger Threshold. Default and minimum is the skill's Heat Cost. */
  readonly threshold?: number;
  /** Skill Level (node ranks + item bonuses). Default 1. */
  readonly level?: number;
}

/** Everything the simulation needs to put one fighter into the arena. */
export interface CombatantSetup {
  readonly name: string;
  readonly level: number;
  readonly attributes: Attributes;
  readonly weapon: WeaponDefinition;
  readonly rotation: readonly RotationSlot[];
  /** Bonuses from gear etc. (M2). The weapon implicit is added automatically. */
  readonly bonuses?: StatBonuses;
  /** Base life before Vitality. Defaults to the hero curve for `level`. */
  readonly baseLife?: number;
  /** Multiplies all damage dealt (monster level scaling). Default 1. */
  readonly damageMultiplier?: number;
  /** Fraction of max life the fighter starts with (life carries over between stages). */
  readonly lifeFraction?: number;
}
