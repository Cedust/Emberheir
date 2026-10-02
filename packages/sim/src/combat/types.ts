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

/** Ailments: Burn, Chill, Shock, Corruption (elemental) and Bleed, Poison (physical). */
export type AilmentType = "burn" | "chill" | "shock" | "corruption" | "bleed" | "poison";
export const AILMENT_TYPES = ["burn", "chill", "shock", "corruption", "bleed", "poison"] as const;

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
  /** Resistance against one element, added to All Resistance (same cap). */
  readonly fireResistance?: number;
  readonly coldResistance?: number;
  readonly lightningResistance?: number;
  readonly voidResistance?: number;
  readonly heatGain?: number;
  readonly startingHeat?: number;
  readonly ailmentDuration?: number;
  readonly tenacity?: number;
  readonly lifesteal?: number;
  readonly physicalPenetration?: number;
  readonly elementalPenetration?: number;
  /** Flat damage dealt back to the attacker for every hit taken. */
  readonly thorns?: number;
  /** Extra chance to inflict the ailment with every hit (0.05 = 5 %). */
  readonly burnChance?: number;
  readonly chillChance?: number;
  readonly shockChance?: number;
  readonly corruptionChance?: number;
  readonly bleedChance?: number;
  readonly poisonChance?: number;
}

/** Stats a timed buff may raise. Life is excluded so buffs never change max life mid-fight. */
export type BuffStat = Exclude<keyof StatBonuses, "life">;

/**
 * When a trigger fires (docs/design/stat-liste-v2.md section 8). "Attack" means the fighter's
 * Default Attack. Hits caused by triggers or Thorns never fire triggers themselves, so triggers
 * cannot loop.
 */
export type TriggerCondition =
  | { readonly kind: "fightStart" }
  | { readonly kind: "everySeconds"; readonly seconds: number }
  | { readonly kind: "everyNthAttack"; readonly n: number }
  /** Own Default Attack or skill hit landed. */
  | { readonly kind: "onHit" }
  | { readonly kind: "onCrit" }
  | { readonly kind: "onSkillUse" }
  /** Took a hit that was not evaded. */
  | { readonly kind: "whenHit" }
  | { readonly kind: "onEvade" }
  | { readonly kind: "onBlock" }
  /** Own life dropped below the fraction. Re-arms once life is back above it. */
  | { readonly kind: "lifeBelow"; readonly threshold: number };

export type TriggerEffect =
  /** Extra hit for X × Weapon Damage. Can be evaded like an attack. */
  | { readonly kind: "weaponHit"; readonly multiplier: number }
  /** Extra spell hit with its own damage. Cannot be evaded. */
  | {
      readonly kind: "spellHit";
      readonly name: string;
      readonly damage: DamageRange;
      readonly damageType: DamageType;
    }
  /** Inflicts an ailment on the enemy. Burn uses the damage of the hit that fired the trigger. */
  | { readonly kind: "ailment"; readonly ailment: AilmentType }
  /** Heals a fraction of max life. */
  | { readonly kind: "heal"; readonly fraction: number }
  /** Grants Barrier equal to a fraction of max life. Barrier absorbs damage before life. */
  | { readonly kind: "barrier"; readonly fraction: number }
  | { readonly kind: "heat"; readonly amount: number }
  /** Raises one stat for a while. Firing again adds a stack up to maxStacks and refreshes. */
  | {
      readonly kind: "buff";
      readonly stat: BuffStat;
      readonly amount: number;
      readonly duration: number;
      readonly maxStacks?: number;
    }
  /** An immediate extra Default Attack (e.g. the Sword's Riposte). */
  | { readonly kind: "extraAttack" };

/** A concrete trigger with final numbers: Condition → Chance → Effect → Internal Cooldown. */
export interface TriggerSpec {
  readonly id: string;
  /** Shown in the combat log, e.g. "Second Wind". */
  readonly name: string;
  readonly condition: TriggerCondition;
  /** 0..1 before Trigger Chance. Default 1. */
  readonly chance?: number;
  /** Internal Cooldown in seconds. Default 0. */
  readonly cooldown?: number;
  /** Fires at most once per fight. */
  readonly oncePerFight?: boolean;
  readonly effect: TriggerEffect;
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
  /** Innate triggers of the weapon type, e.g. the Sword's Riposte. */
  readonly triggers?: readonly TriggerSpec[];
  /**
   * Spells cast with this weapon deal this much more base damage. Hero weapons get their Item
   * Tier growth, so spells keep pace with weapon damage. Default 1.
   */
  readonly spellPower?: number;
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
      /** Ailments from this hit act as if the hit was this much stronger. Default 1. */
      readonly ailmentPower?: number;
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
      /** Ailments from this hit act as if the hit was this much stronger (Immolate). Default 1. */
      readonly ailmentPower?: number;
    };

/** What a skill does besides its hits. Effects follow the hits, in order. */
export type SkillEffect =
  /** Buff skills: raises a stat of the caster for a while (refreshes when cast again). */
  | {
      readonly kind: "buff";
      readonly stat: BuffStat;
      readonly amount: number;
      readonly duration: number;
    }
  /** Rend: ends the target's Bleed and deals its remaining damage × multiplier at once. */
  | { readonly kind: "consumeBleed"; readonly multiplier: number }
  /** Toxic Burst: multiplies the target's Poison stacks (up to the cap). */
  | { readonly kind: "multiplyPoison"; readonly factor: number }
  /** Heals the caster by a fraction of max life (Burn halves it). */
  | { readonly kind: "heal"; readonly fraction: number }
  /** Corrupt: the target's Corruption grows by this many ticks at once. */
  | { readonly kind: "advanceCorruption"; readonly ticks: number }
  /** Curse (Wither): the target takes `amount` more damage over time for a while. */
  | { readonly kind: "curse"; readonly dotDamageTaken: number; readonly duration: number }
  /** Soul Harvest: deals `seconds` worth of all DoTs on the target at once; they keep running. */
  | { readonly kind: "detonateDots"; readonly seconds: number };

export interface SkillDefinition {
  readonly id: string;
  readonly name: string;
  readonly type: SkillType;
  readonly heatCost: number;
  readonly tags: readonly string[];
  readonly description: string;
  readonly hits: readonly SkillHit[];
  readonly effects?: readonly SkillEffect[];
}

/** One Rotation Slot of the Battle Plan. */
export interface RotationSlot {
  readonly skill: SkillDefinition;
  /** Trigger Threshold. Default and minimum is the skill's Heat Cost. */
  readonly threshold?: number;
  /** Skill Level (node ranks + item bonuses). Default 1. */
  readonly level?: number;
}

/**
 * A telegraphed Heavy Attack (docs/design/gegner-bosse-v1.md section 5): every `interval`
 * seconds the fighter winds up for `windup` seconds (no Default Attacks meanwhile), then
 * unleashes `skill` for free. The wind-up is visible, so Reaction Slots can answer it later.
 */
export interface TelegraphSpec {
  readonly skill: SkillDefinition;
  readonly interval: number;
  readonly windup: number;
}

/** Rule changes, e.g. from Keystones. They change rules, not just numbers. */
export interface CombatRules {
  /** Extra damage taken from every source (0.2 = +20 %). */
  readonly damageTaken?: number;
  /** Multiplies the Heat Cost of every Rotation skill. */
  readonly skillCostMultiplier?: number;
  /** Multiplies the damage of the Default Attack. */
  readonly defaultAttackDamage?: number;
  /** "Heat no longer cools down": Cooling weapons keep their Heat without landing hits. */
  readonly noHeatDecay?: boolean;
  /** Blood Price: every Crit inflicts Bleed. */
  readonly critsApplyBleed?: boolean;
  /** Multiplies the final Crit Chance (Blood Price halves it). */
  readonly critChanceMultiplier?: number;
  /** Legendary Powers: inflicting `from` also inflicts `to` ("Your Burn also Shocks"). */
  readonly ailmentEcho?: readonly { readonly from: AilmentType; readonly to: AilmentType }[];
  /** Hits deal `bonus` more damage to an enemy below `below` of its max life. */
  readonly execute?: { readonly below: number; readonly bonus: number };
  /** Heals this fraction of the damage your ailments deal over time. */
  readonly dotLifesteal?: number;
  /** Multiplies the damage your ailments deal over time (Affliction Keystone). */
  readonly dotDamage?: number;
}

/** Everything the simulation needs to put one fighter into the arena. */
export interface CombatantSetup {
  readonly name: string;
  readonly level: number;
  readonly attributes: Attributes;
  readonly weapon: WeaponDefinition;
  readonly rotation: readonly RotationSlot[];
  /** Bonuses from gear etc. The weapon implicit is added automatically. */
  readonly bonuses?: StatBonuses;
  /** Trigger affixes from gear. Weapon triggers are added automatically. */
  readonly triggers?: readonly TriggerSpec[];
  /** Base life before Vitality. Defaults to the hero curve for `level`. */
  readonly baseLife?: number;
  /** Multiplies all damage dealt (monster level scaling). Default 1. */
  readonly damageMultiplier?: number;
  /** Fraction of max life the fighter starts with (life carries over between stages). */
  readonly lifeFraction?: number;
  /** Telegraphed Heavy Attacks (bosses). */
  readonly telegraphs?: readonly TelegraphSpec[];
  readonly rules?: CombatRules;
}
