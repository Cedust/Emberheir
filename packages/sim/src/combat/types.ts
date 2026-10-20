import type { PerkId } from "./perks";

/**
 * Data shapes for the combat core. Content (weapons, skills, enemies) is written against these
 * types in `@emberheir/content`; the simulation only ever reads them.
 */

/** Display order everywhere (Timo, after Playtest 2): Strength, Dexterity, Intelligence first. */
export const ATTRIBUTES = [
  "strength",
  "dexterity",
  "intelligence",
  "agility",
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

/**
 * How a weapon fills the Heat bar, see docs/design/waffen-v1.md section 4. Smoldering is the
 * Weapon Mastery Heat Form that charges from hits taken (waffe-als-system-v1.md section 3).
 */
export type HeatBehavior = "cooling" | "steady" | "warming" | "smoldering";

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
  /** % more max Life (adds up with Vitality's share). */
  readonly increasedLife?: number;
  readonly armor?: number;
  /** % more Armor (adds up with Strength's share). */
  readonly increasedArmor?: number;
  /** Barrier from gear (caster bases), like Energy Shield: absorbs damage before Life. */
  readonly barrier?: number;
  /** % more Barrier (adds up with Intelligence's share). */
  readonly increasedBarrier?: number;
  readonly physicalDamage?: number;
  readonly elementalDamage?: number;
  readonly critChance?: number;
  readonly triggerChance?: number;
  readonly attackSpeed?: number;
  readonly evasion?: number;
  readonly blockChance?: number;
  readonly allResistance?: number;
  /** Resistance against one element, added to All Resistance (same cap). */
  readonly fireResistance?: number;
  readonly coldResistance?: number;
  readonly lightningResistance?: number;
  readonly voidResistance?: number;
  readonly heatGain?: number;
  readonly startingHeat?: number;
  /** Cooling: share of the Heat from hits taken (0.5 = +50 %). */
  readonly heatFromHitsTaken?: number;
  readonly ailmentEffect?: number;
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
export type BuffStat = Exclude<keyof StatBonuses, "life" | "increasedLife">;

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
  | { readonly kind: "lifeBelow"; readonly threshold: number }
  /** Every Nth hit taken that was not evaded (Storm Herald's reflect). */
  | { readonly kind: "everyNthHitTaken"; readonly n: number }
  /** The opponent starts winding up a telegraphed Heavy Attack (Ice Shell). */
  | { readonly kind: "enemyWindup" }
  /** Parried an attack: it became a Glancing Blow (Weapon Mastery, `WeaponRules.parry`). */
  | { readonly kind: "onParry" };

export type TriggerEffect =
  /**
   * Extra hit for X × Weapon Damage. Can be evaded like an attack. `extra` marks an extra attack
   * of the weapon (Split Shot, Rain of Arrows): Extra-Attack Damage and the Path Masters apply.
   */
  | { readonly kind: "weaponHit"; readonly multiplier: number; readonly extra?: boolean }
  /** Combust: sets off part of the target's Burn at once (Pyroclast). */
  | { readonly kind: "combust" }
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
  | { readonly kind: "extraAttack" }
  /**
   * The enemy cannot act for a moment: no attacks, skills or wind-ups (the Mace's Smash). Its
   * swing pauses; `breaksSwing` starts it over (the Mace's Stagger).
   */
  | { readonly kind: "stun"; readonly seconds: number; readonly breaksSwing?: boolean }
  /**
   * Sends a fraction of the hit that fired the trigger back to the attacker, at most `cap` of the
   * attacker's max life, so big hits are punished without one-shotting.
   */
  | {
      readonly kind: "reflect";
      readonly fraction: number;
      readonly cap: number;
      readonly damageType: DamageType;
    };

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
  /** Boss phases: only active while own life is below this fraction. */
  readonly belowLife?: number;
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
  /**
   * The ailment of the weapon's build (Heirloom path): what its Nova and payoffs apply. Default:
   * the element's ailment, or the first of `ailmentChances`.
   */
  readonly ailment?: AilmentType;
  /** Innate triggers of the weapon type, e.g. the Sword's Riposte. */
  readonly triggers?: readonly TriggerSpec[];
  /**
   * Spells cast with this weapon deal this much more base damage. Hero weapons get their Item
   * Tier growth, so spells keep pace with weapon damage. Default 1.
   */
  readonly spellPower?: number;
  /**
   * Weapon Mastery: chance that a hit lands cleanly (0..1). The rest are Glancing Blows: less
   * damage, no Crit, no ailments, no on-hit triggers. Default 1 (enemies never glance).
   */
  readonly precision?: number;
  /**
   * Weapon Mastery v2: a clean weapon hit whose roll (before skill multipliers) reaches this damage
   * is a Mighty Hit (125 % Weapon Damage, weapon-mastery-v2.md 1.2). Undefined = never.
   */
  readonly mightyAt?: number;
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
      /** Ignores this share of the target's Armor, on top of Physical Penetration (Heavy Bolt). */
      readonly penetration?: number;
      /** Deals this damage type instead of the weapon's (Explosive Bolt, Thunder Crack). */
      readonly damageType?: DamageType;
      /** Never a Glancing Blow (Seeking Bolt). */
      readonly precise?: boolean;
      /** Always a Mighty Hit: the roll is at least the Mighty threshold (Master of Payload). */
      readonly mighty?: boolean;
      /** Takes the weapon's ailment instead of the listed ones (Mastery skills). */
      readonly infused?: boolean;
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
      /** Never a Glancing Blow (Seeking Bolt). */
      readonly precise?: boolean;
      /**
       * Takes the weapon's damage type and ailment instead of its own (Mastery skills follow the
       * Heirloom path, klassengeruest-v1.md 5).
       */
      readonly infused?: boolean;
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
  /**
   * Rend: ends the target's Bleed and deals its remaining damage × multiplier at once; `leech`
   * heals the caster for that share of it.
   */
  | {
      readonly kind: "consumeBleed";
      readonly multiplier: number;
      readonly leech?: number;
      /** Only this share of the Bleed is set off; the rest keeps running (Hooked Rend). */
      readonly share?: number;
    }
  /** Toxic Burst: multiplies the target's Poison stacks (up to the cap). */
  | { readonly kind: "multiplyPoison"; readonly factor: number }
  /** Heals the caster by a fraction of max life (Burn halves it). */
  | { readonly kind: "heal"; readonly fraction: number }
  /** Gives the caster Barrier: a fraction of max life, +Skill Level like spell damage. */
  | { readonly kind: "barrier"; readonly fraction: number }
  /** Stuns the target (Tenacity shortens it). */
  | { readonly kind: "stun"; readonly seconds: number }
  /** Sunder: the target's Armor counts `armor` less against the caster's hits for a while. */
  | { readonly kind: "sunder"; readonly armor: number; readonly duration: number }
  /** Corrupt: the target's Corruption grows by this many ticks at once. */
  | { readonly kind: "advanceCorruption"; readonly ticks: number }
  /** Curse (Wither): the target takes `amount` more damage over time for a while. */
  | { readonly kind: "curse"; readonly dotDamageTaken: number; readonly duration: number }
  /**
   * Soul Harvest: deals `seconds` worth of all DoTs on the target at once; they keep running. The
   * caster heals `leech` of the damage dealt.
   */
  | { readonly kind: "detonateDots"; readonly seconds: number; readonly leech?: number }
  /**
   * Cash In (Burst Masteries, klassengeruest-v1.md 5): ends every DoT on the target and deals
   * their remaining damage × `multiplier` at once, as a hit of the skill (Lifesteal works).
   * `own`: only the weapon's own ailment (the Heirloom path's) is cashed in, before the skill's
   * hits land (it never cashes in the ailment it applies itself).
   */
  | { readonly kind: "cashIn"; readonly multiplier: number; readonly own?: boolean }
  /** Immolate: Combust `times` over after the hit (ailments-v2.md 3.2). */
  | { readonly kind: "combust"; readonly times: number }
  /** Weapon Mastery Sunder: adds stacks of the caster's stacking Sunder (Bone Breaker). */
  | { readonly kind: "sunderStacks"; readonly stacks: number }
  /** Gives back this share of the paid Heat if a hit of the skill landed cleanly (Rising Strike). */
  | { readonly kind: "refundHeat"; readonly fraction: number };

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

/**
 * Slot Modifiers (skills-v1.md section 6): one per slot from the 5th Prestige, two from the 9th.
 * - `thrifty`: −15 % Heat Cost.
 * - `empowered`: +1 Skill Level.
 * - `reverb`: 20 % chance to repeat the skill at once for free.
 * - `overcharge`: Heat above the Cost is spent too and adds as much % effect (up to +50 %).
 */
export type SlotModifier = "thrifty" | "empowered" | "reverb" | "overcharge";

/** "Skip if…" for Rotation Slots (8th Prestige): the slot only fires while this holds. */
export type SlotCondition =
  | { readonly kind: "enemyHas"; readonly ailment: AilmentType }
  | { readonly kind: "enemyBelow"; readonly fraction: number }
  | { readonly kind: "lifeBelow"; readonly fraction: number };

/** One Rotation Slot of the Battle Plan. */
export interface RotationSlot {
  readonly skill: SkillDefinition;
  /** Trigger Threshold. Default and minimum is the skill's Heat Cost. */
  readonly threshold?: number;
  /** Skill Level (node ranks + item bonuses). Default 1. */
  readonly level?: number;
  readonly modifiers?: readonly SlotModifier[];
  /** The slot is passed over while the condition does not hold. */
  readonly condition?: SlotCondition;
}

/**
 * When a Reaction Slot fires (skills-v1.md section 6). Thresholds fire once on crossing and
 * re-arm once the value is back above; events fire whenever they happen.
 */
export type ReactionCondition =
  | { readonly kind: "fightStart" }
  | { readonly kind: "lifeBelow"; readonly fraction: number }
  | { readonly kind: "enemyWindup" }
  | { readonly kind: "enemyBelow"; readonly fraction: number }
  | { readonly kind: "ailmented" }
  /** The opponent regains Life (Lifesteal, heals). */
  | { readonly kind: "enemyHeals" }
  /** Own Barrier is used up by a hit. */
  | { readonly kind: "barrierBreaks" }
  /** The opponent carries at least `count` ailment stacks (each Poison stack counts). */
  | { readonly kind: "enemyStacks"; readonly count: number };

/**
 * A Reaction Slot: outside the Rotation, fires when its condition is met. It pays Heat from the
 * same bar and goes before the next Rotation skill; the Rotation pointer stays where it is.
 */
export interface ReactionSlot {
  readonly skill: SkillDefinition;
  readonly level?: number;
  readonly condition: ReactionCondition;
  /** Seconds before the slot can fire again. */
  readonly cooldown: number;
  readonly modifiers?: readonly SlotModifier[];
}

/** Battle Plan Capstones (skills-v1.md section 6): one of six at the 10th Prestige. */
export type Capstone =
  | { readonly kind: "echo"; readonly slot: number }
  | { readonly kind: "crescendo" }
  | { readonly kind: "vigil" }
  | { readonly kind: "ignition" }
  | { readonly kind: "lingeringFlame" }
  | { readonly kind: "emberWard" };

/**
 * A telegraphed Heavy Attack (docs/design/gegner-bosse-v1.md section 5): every `interval`
 * seconds the fighter winds up for `windup` seconds (no Default Attacks meanwhile), then
 * unleashes `skill` for free. The wind-up is visible, so Reaction Slots can answer it later.
 */
export interface TelegraphSpec {
  readonly skill: SkillDefinition;
  readonly interval: number;
  readonly windup: number;
  /** Boss phases: only winds up while own life is below this fraction. */
  readonly belowLife?: number;
}

/** Rule changes, e.g. from Keystones. They change rules, not just numbers. */
export interface CombatRules {
  // Class Traits (klassengeruest-v1.md 2): each one works in every fight, with every build.
  /**
   * Cinderguard, Fury (balancing-neustart-v1.md, step 4: the weapon is the heart): every Default
   * Attack that lands gives 1 Fury, up to `maxStacks`. The Innate spends all of it and deals
   * `perStack` more damage per Fury (the "more" pool). Fury starts at 0 in every fight.
   */
  readonly fury?: { readonly perStack: number; readonly maxStacks: number };
  /**
   * Ashstrider, Hunter's Mark (balancing restart step 5): every clean Default Attack that does not
   * crit marks the enemy, up to `maxStacks`. Your next Crit spends all Marks and deals `perStack`
   * more damage per Mark (the "more" pool). Marks start at 0 in every fight.
   */
  readonly huntersMark?: { readonly perStack: number; readonly maxStacks: number };
  /**
   * Emberseer, Overcharge: every skill gives a charge; at `charges` they break loose as a Nova of
   * the weapon's element for `multiplier` × Weapon Damage that always applies its ailment.
   */
  readonly overcharge?: { readonly charges: number; readonly multiplier: number };
  /**
   * Spark (Wand): after each skill the next Default Attack deals `damage` more and always applies
   * the ailment of its element.
   */
  readonly spark?: { readonly damage: number };
  /** Skills deal this much more damage (Masteries, klassengeruest-v1.md 5). */
  readonly skillDamage?: number;
  /** + chance of every ailment your hits can apply (Ailment Masteries). */
  readonly ailmentChance?: number;
  /** Your ailments last this much longer (0.2 = +20 %). */
  readonly ailmentDuration?: number;
  /** Crits always apply your weapon's ailment (Ravager). */
  readonly critsApplyAilment?: boolean;
  /** Own ailments deal `perSecond` more per second of fight, up to `max` (Warlock Mastery). */
  readonly lingering?: { readonly perSecond: number; readonly max: number };
  /** Extra damage taken from every source (0.2 = +20 %). */
  readonly damageTaken?: number;
  /** Multiplies the Heat Cost of every Rotation skill. */
  readonly skillCostMultiplier?: number;
  /**
   * Damage of the Default Attack: above 1 a bonus in the "more" pool, below 1 a "less" factor.
   * After `mergeRules` it holds only the penalties; the bonuses are in `defaultAttackMore`.
   */
  readonly defaultAttackDamage?: number;
  /** Merged Default Attack bonuses for the "more" pool (0.3 = +30 %). */
  readonly defaultAttackMore?: number;
  /**
   * Twin Cast (Spellweaver): every n-th action happens twice, for each listed n. A Default Attack
   * strikes again, a Rotation skill is cast again for free.
   */
  readonly twinCast?: readonly number[];
  /** "Heat no longer cools down": Cooling weapons keep their Heat without landing hits. */
  readonly noHeatDecay?: boolean;
  /** Blood Price: every Crit inflicts Bleed. */
  readonly critsApplyBleed?: boolean;
  /** Multiplies the final Crit Chance (Blood Price halves it). */
  readonly critChanceMultiplier?: number;
  /** Legendary Powers: inflicting `from` also inflicts `to` ("Your Burn also Shocks"). */
  readonly ailmentEcho?: readonly { readonly from: AilmentType; readonly to: AilmentType }[];
  /**
   * Hits deal `bonus` more damage to an enemy below `below` of its max life (and `above` less
   * while it is above: Final Verdict).
   */
  readonly execute?: { readonly below: number; readonly bonus: number; readonly above?: number };
  /** Heals this fraction of the damage your ailments deal over time. */
  readonly dotLifesteal?: number;
  /** Multiplies how long stuns hold you (bosses shrug them off, `COMBAT.bossStunTaken`). */
  readonly stunTaken?: number;
  /**
   * Damage your ailments deal over time: above 1 a bonus in the DoT pool, below 1 a "less"
   * factor (merged like `defaultAttackDamage`, bonuses in `dotMore`).
   */
  readonly dotDamage?: number;
  /** Merged DoT bonuses for the DoT pool. */
  readonly dotMore?: number;
  /** Damage over time of single ailments, like `dotDamage` (bonuses merge into `ailmentMore`). */
  readonly ailmentDamage?: Readonly<Partial<Record<AilmentType, number>>>;
  /** Merged bonuses of single ailments for the DoT pool. */
  readonly ailmentMore?: Readonly<Partial<Record<AilmentType, number>>>;
  /** Multiplies max life (Iron Lineage, Keystones). */
  readonly lifeMultiplier?: number;
  /**
   * Damage of your hits: above 1 a bonus in the "more" pool, below 1 a "less" factor (merged like
   * `defaultAttackDamage`, bonuses in `hitMore`).
   */
  readonly hitDamage?: number;
  /** Merged hit bonuses for the "more" pool. */
  readonly hitMore?: number;
  /** Damage of your hits against a Chilled enemy, like `hitDamage` (bonuses in `chilledMore`). */
  readonly chilledDamage?: number;
  /** Merged bonuses against a Chilled enemy for the "more" pool. */
  readonly chilledMore?: number;
  /** Multiplies how fast your Barrier recharges (Ward Draught, Barrier Notables). */
  readonly barrierRecharge?: number;
  /** Raises the Resistance cap of single elements (Fire Draught: +5 %). */
  readonly maxResistance?: Readonly<Partial<Record<Element, number>>>;
  /**
   * Share of Life + Barrier a telegraphed Heavy Attack can take at most, instead of
   * `COMBAT.heavyHitCap` (Crushing Weight Omen: 0.5). The highest one counts.
   */
  readonly heavyHitCap?: number;
  // Skill Web v3 (neuausrichtung-v1.md 4): Notables are "if, then", not plain numbers.
  /** Your hits deal `amount` more damage while the condition holds (into the "more" pool). */
  readonly conditionalDamage?: readonly RuleBonus[];
  /** More Crit Chance (added) while the condition holds. */
  readonly conditionalCrit?: readonly RuleBonus[];
  /** Your ailments of a type deal `amount` more damage while the condition holds (DoT pool). */
  readonly ailmentDamageWhen?: readonly {
    readonly ailment: AilmentType;
    readonly amount: number;
    readonly condition: RuleCondition;
  }[];
  /** Spellblade: every skill with hits also strikes with your weapon for `multiplier`. */
  readonly spellblade?: { readonly multiplier: number };
  /** Arcane Conduit: skills spend all your Heat and deal 1 % more per Heat paid above the cost. */
  readonly arcaneConduit?: boolean;
  /** Black Flame: your Corruption cuts the enemy's healing like Burn. */
  readonly corruptionStopsHeal?: boolean;
  /** Slow Death: your hits deal `hit` of their damage, their ailments stay as strong as before. */
  readonly slowDeath?: { readonly hit: number };
  /** Conversion: `share` of your `from` damage is dealt as `to` (shares add up, at most all). */
  readonly conversion?: readonly {
    readonly from: DamageType;
    readonly to: DamageType;
    readonly share: number;
  }[];
}

/**
 * A state of the fight a Skill Web Notable can depend on (neuausrichtung-v1.md 4.3): the Weapon
 * Mastery ones, Heat, an own Barrier, and "within N s after a Crit / Evade / Block / Parry / skill".
 */
export type RuleCondition =
  | MasteryCondition
  | { readonly kind: "heatAtLeast"; readonly amount: number }
  | { readonly kind: "barrierActive" }
  | {
      readonly kind: "within";
      readonly event: FightMoment;
      readonly seconds: number;
    };

/** Moments a fighter remembers for `within` conditions. */
export type FightMoment = "crit" | "evade" | "block" | "parry" | "skill";

export interface RuleBonus {
  readonly condition: RuleCondition;
  readonly amount: number;
}

/** A state of the fight a Weapon Mastery bonus can depend on. */
export type MasteryCondition =
  | SlotCondition
  | { readonly kind: "enemyStunned" }
  /** The enemy carries the caster's Sunder at its maximum stacks. */
  | { readonly kind: "enemySundered" }
  /** The enemy winds up a telegraphed Heavy Attack right now. */
  | { readonly kind: "enemyWindup" }
  /** The enemy carries at least `count` stacks of the ailment (Poison stacks count one by one). */
  | { readonly kind: "enemyStacks"; readonly ailment: AilmentType; readonly count: number };

/** A Weapon Mastery bonus that holds while its condition holds. */
export interface MasteryBonus {
  readonly condition: MasteryCondition;
  readonly amount: number;
}

/** Stacking Sunder from Weapon Mastery: each stack ignores `perStack` of the target's Armor. */
export interface SunderRule {
  /** Chance per clean weapon hit to add a stack (0 = only from other sources). */
  readonly chance: number;
  readonly perStack: number;
  readonly maxStacks: number;
  /** Seconds the stacks last without a new one. */
  readonly duration: number;
}

/**
 * Weapon Mastery mechanics (weapon-mastery-baeume-v1.md): how the hero's own weapon behaves.
 * Built and merged by the Weapon Mastery tree in `progression`; the fight only reads them.
 */
export interface WeaponRules {
  /** Heat gained (or, negative, lost) on every Glancing Blow (Loaded Spring, Flowing Blade). */
  readonly glancingHeat?: number;
  /** Extra attacks (Riposte, Double Stab) always land cleanly. */
  readonly extraAttacksPrecise?: boolean;
  /** Extra attacks add a Sunder stack. */
  readonly extraAttackSunder?: boolean;
  /** Hits on a stunned enemy add this many Sunder stacks (the Mace's Stun path). */
  readonly stunnedSunder?: number;
  readonly sunder?: SunderRule;
  /** After these defences the next own hit is clean and a Crit (Read the Blow, Shadowstep). */
  readonly critAfter?: readonly ("evade" | "block" | "parry")[];
  /** Every clean hit in a row adds a stack of this buff; a Glancing Blow ends the streak. */
  readonly streak?: { readonly stat: BuffStat; readonly amount: number; readonly max: number };
  /** Cooling and Steady Heat do not decay while the last hit was clean (Flowing Blade). */
  readonly flow?: boolean;
  /** More hit damage while the condition holds (fractions add up). */
  readonly conditionalDamage?: readonly {
    readonly condition: MasteryCondition;
    readonly amount: number;
  }[];
  /** More Attack Speed while the condition holds. */
  readonly conditionalAttackSpeed?: readonly {
    readonly condition: MasteryCondition;
    readonly amount: number;
  }[];
  /** Multiplies the duration of own stuns. */
  readonly stunDuration?: number;
  /** A stunned enemy gains no Heat. */
  readonly stunnedNoHeat?: boolean;
  /** Multiplies the own Block Chance. */
  readonly blockMultiplier?: number;
  /** Own hit damage (not damage over time): above 1 into the "more" pool, below 1 "less". */
  readonly damageDealt?: number;
  /** Heat per damage tick of an own ailment (Bloodrush). */
  readonly heatPerDotTick?: { readonly ailment: AilmentType; readonly amount: number };
  /** Clean hits refresh these running ailments on the target (Bloodbath). */
  readonly refreshOnHit?: readonly AilmentType[];
  /** Every damage tick of the ailment adds `perTick` hit damage for the rest of the fight. */
  readonly rampage?: { readonly ailment: AilmentType; readonly perTick: number };
  /** Extra Poison stacks above the cap. */
  readonly poisonMaxStacks?: number;
  /** Longer (or shorter) own ailments by type, on top of Ailment Effect. */
  readonly ailmentDurationBy?: Readonly<Partial<Record<AilmentType, number>>>;
  /** The first clean hit of a fight crits and deals this much more damage (Assassinate). */
  readonly openerDamage?: number;
  /**
   * At `stacks` Poison stacks (0: at the cap) all of them burst for `multiplier` × their rest (Toxic Bloom);
   * `leech` heals the attacker for that share of the burst.
   */
  readonly poisonBurst?: {
    readonly stacks: number;
    readonly multiplier: number;
    readonly lockout: number;
    readonly leech?: number;
  };
  /** Every Poison stack on the target ignores this share of its Armor (Festering). */
  readonly poisonArmorShred?: number;
  /** Extra Precision while not hit for `seconds` (Steady Aim). */
  readonly steadyAim?: { readonly seconds: number; readonly precision: number };
  /** Hits deal `perSecond` more damage per second since the last own skill (Patient Draw). */
  readonly patience?: { readonly perSecond: number; readonly max: number };
  /** The first clean hit marks the target: `bonus` more damage for the fight; until then Glancing Blows deal nothing. */
  readonly mark?: { readonly bonus: number };
  /** Crits ignore this share of the target's Armor (Killshot). */
  readonly critPenetration?: number;
  /** Every Nth Default Attack is clean and a Crit (Deadeye). */
  readonly everyNthCrit?: number;
  /** The enemy gains this much more (negative: less) Heat while the condition holds. */
  readonly enemyHeatGain?: readonly {
    readonly amount: number;
    readonly condition?: MasteryCondition;
  }[];
  /** The Default Attack alternates Lightning and Cold and carries their ailments (Prism). */
  readonly prism?: boolean;
  /** Skills cost `discount` less while Heat is at least `above` (Overflow). */
  readonly overflow?: { readonly above: number; readonly discount: number };
  /** Every ailment on the target adds this much hit damage (Eclipse). */
  readonly damagePerAilment?: number;
  /** The Default Attack inflicts no ailments of its own (Eclipse). */
  readonly noDefaultAilments?: boolean;

  // Weapon Mastery v2 (weapon-mastery-v2.md): Mighty Hits, Parry, forks and Path Masters.
  /** The weapon's Innate skill (id), for rules that change it in the fight. */
  readonly innateId?: string;
  /** Chance that an enemy attack (not a spell) becomes a Glancing Blow (Parry, at most 30 %). */
  readonly parry?: number;
  /** Extra attacks can fire your trigger affixes (Path Masters); not the ones they cause. */
  readonly extraAttacksTrigger?: boolean;
  /** Extra attacks always inflict these ailments (Thousand Needles). */
  readonly extraAttackAilments?: readonly AilmentType[];
  /** Mighty Hits deal this much more damage. */
  readonly mightyDamage?: number;
  /** Mighty Hits always crit (Headsplitter). */
  readonly mightyCrit?: boolean;
  /** A roll that would be a Mighty Hit never glances (Wild Shot). */
  readonly mightyNeverGlances?: boolean;
  /** Mighty Hits stun for this long (Earthbreaker). */
  readonly mightyStun?: number;
  /** Mighty Hits always Bleed, this much stronger (Ragged Cut). */
  readonly mightyBleed?: number;
  /** Mighty Hits deal `bonus` more against an enemy below `below` Life (Executioner's Swing). */
  readonly mightyExecute?: { readonly below: number; readonly bonus: number };
  /** Mighty Hits roll your on-hit triggers twice (Master of Cleave). */
  readonly mightyTriggersTwice?: boolean;
  /** At full Sunder the next Mighty Hit sets off every stack for `perStack` Weapon Damage. */
  readonly rupture?: { readonly perStack: number };
  /** Every Sunder stack also lowers the target's Evasion and Block by its Armor share. */
  readonly sunderDefense?: boolean;
  /** After `hits` clean hits in a row the next hit deals `bonus` more (Clean Line). */
  readonly cleanLine?: { readonly hits: number; readonly bonus: number };
  /** Bleed from Crits is this much stronger (Deep Wound). */
  readonly critBleedPower?: number;
  /** The enemy attacks this much faster (negative: slower) while the condition holds. */
  readonly enemyAttackSpeed?: readonly MasteryBonus[];
  /** The Innate costs this much less Heat per clean hit since your last skill (Building Edge). */
  readonly innateDiscountPerHit?: number;
  /** A stun during a telegraph breaks the Heavy Attack, once per `cooldown` s (Interrupt). */
  readonly interrupt?: { readonly cooldown: number };
  /** Your stuns also start the enemy's swing over (Jolt, Quake); other stuns only pause it. */
  readonly stunResetsSwing?: boolean;
  /** Reaction Slots cost no Heat while the enemy is stunned (Master of Quake). */
  readonly freeReactionsVsStunned?: boolean;
  /** After a Block you take `reduction` less damage for `seconds` (Braced). */
  readonly braced?: { readonly seconds: number; readonly reduction: number };
  /**
   * Damage stored and released by the next Innate as an extra hit: `blocked` of the damage your
   * blocks stopped (Master of the Wall), `clean` of your clean hits (Impale).
   */
  readonly store?: { readonly blocked?: number; readonly clean?: number };
  /** Lifesteal × `multiplier` below `below` Life (Thirst). */
  readonly lowLifeLifesteal?: { readonly below: number; readonly multiplier: number };
  /** Ticks of these own ailments heal you for this share of their damage. */
  readonly ailmentLeech?: Readonly<Partial<Record<AilmentType, number>>>;
  /** Rend and Hemorrhage set off only this share of the Bleed; the rest runs on (Master Butcher). */
  readonly consumeBleedShare?: number;
  /** Own ailments deal `amount` more damage while the condition holds (Bleeding Out). */
  readonly ailmentDamageWhen?: readonly {
    readonly ailment: AilmentType;
    readonly amount: number;
    readonly condition: MasteryCondition;
  }[];
  /** Landed Default Attacks give Heat while the condition holds (Master of Barbs). */
  readonly heatOnHitWhen?: readonly MasteryBonus[];
  /** Every `every`-th Default Attack sets off `share` of the Poison stacks at once (Toxic Cascade). */
  readonly cascade?: { readonly every: number; readonly share: number };
  /** Ticks of `from` inflict `to` with this chance (Lingering Cloud). */
  readonly tickAilment?: readonly {
    readonly from: AilmentType;
    readonly to: AilmentType;
    readonly chance: number;
  }[];
  /** Poison set off at once (Overflow, Toxic Bloom, Toxic Cascade) heals this share (Master of Toxin). */
  readonly burstLeech?: number;
  /** Physical Penetration also lowers Resistances (Master of Pierce). */
  readonly penetrationToElemental?: boolean;
  /** Rotation Slot `slot` (0-based) costs `discount` less Heat (Master of Reload). */
  readonly slotDiscount?: { readonly slot: number; readonly discount: number };
  /** Skills cost `amount` less while the condition holds (Master of Storm). */
  readonly skillDiscountWhen?: readonly MasteryBonus[];
  /** `chills` Chills within `seconds` freeze the enemy for `freeze` s (Frozen Solid). */
  readonly frozenSolid?: {
    readonly chills: number;
    readonly seconds: number;
    readonly freeze: number;
  };
  /** A Chilled enemy winds up its Heavy Attacks this much slower (Cold Snap: 0.3). */
  readonly coldSnap?: number;
  /** A Chill during a wind-up delays the Heavy Attack by this many seconds, once per wind-up. */
  readonly chillDelay?: number;
  /** Hits against an enemy with at least `stacks` Shock stacks arc for `share` of their damage (Arc Chain). */
  readonly arcChain?: { readonly share: number; readonly stacks: number };
  /** Extra Shock stacks (Static Build). */
  readonly shockMaxStacks?: number;
  /** Every Shock stack you add gives this much Heat (Conduction). */
  readonly heatPerShockStack?: number;
  /** The charged Spark (Sorcerer) is always a clean Crit (Flashpoint). */
  readonly sparkCrit?: boolean;
  /** Every Default Attack without a Crit adds this much Crit Chance until the next Crit (Critical Mass). */
  readonly critBuildup?: number;
  /** Crits get this much extra Elemental Penetration (Overwhelm). */
  readonly critElementalPenetration?: number;
  /** A skill that crits charges the Spark for this many Default Attacks (Master of Starfall). */
  readonly skillCritSparks?: number;
  /** Burning enemies deal this much less damage (Ashen Veil). */
  readonly ashenVeil?: number;
  /** Corruption grows this many extra steps per tick (Hollow). */
  readonly corruptionRamp?: number;
  /** Collapse deals this many more seconds at once (Collapse Deeper). */
  readonly collapseSeconds?: number;
  /** Corruption starts this many steps grown (Master of the Hollow). */
  readonly corruptionStart?: number;
  /** Own skills deal this much more hit damage (Channel). */
  readonly skillDamage?: number;
  /** Every `every`-th skill repeats itself with `power` (Echoing Chant). */
  readonly echoChant?: { readonly every: number; readonly power: number };
  /** Skills heal this share of max Life per 10 Heat they cost (Siphon Ember). */
  readonly siphonEmber?: number;
  /** Reaction Slots cost this much less Heat (Master of Channel). */
  readonly reactionDiscount?: number;
  /** The first hit after a skill gets this much more Crit Chance (Find the Gap). */
  readonly critAfterSkill?: number;
  /** Every hit in the first `seconds` of a fight is a clean Crit (Ambush). */
  readonly ambush?: number;
  /** `stabs` Default Attacks within `seconds` make the next Innate free (Whirl). */
  readonly whirl?: { readonly stabs: number; readonly seconds: number };
  /** After an Evade, this many hits are clean Crits (Vanishing Act). */
  readonly critsAfterEvade?: number;
  /** Every clean Default Attack sets off all Sunder stacks: `perStack` more damage each (Siege Engine). */
  readonly siegeEngine?: { readonly perStack: number };
  /** Default Attacks are volleys of `count` bolts of `multiplier` sharing one Crit roll (Repeater). */
  readonly volley?: { readonly count: number; readonly multiplier: number };
  /** Default Attacks hit for `share` of the max Barrier extra (Glass Cannon). */
  readonly glassCannon?: { readonly share: number };
  /** Every clean hit adds a Poison stack; Poison Chance no longer counts (Thousand Cuts). */
  readonly thousandCuts?: boolean;
  /** More Ailment Effect for single ailments of this weapon ("+12 % Bleed effect of the Axe"). */
  readonly ailmentEffectBy?: Readonly<Partial<Record<AilmentType, number>>>;
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
  /**
   * Share of the Heat from hits taken before bonuses (Cooling). Default 1 (enemies); the hero
   * starts at 0 and raises it in the Skill Tree.
   */
  readonly baseHeatFromHitsTaken?: number;
  /** Reaction Slots of the Battle Plan. */
  readonly reactions?: readonly ReactionSlot[];
  readonly capstone?: Capstone;
  /** Runs away after this many seconds of fight time (the Ember Thief). */
  readonly fleeAfter?: number;
  /** The fight ends without a winner after this many seconds (Short Fuse Omen: a lost fight). */
  readonly timeLimit?: number;
  /** Opening Move: cast for free right when the fight starts. */
  readonly openingMove?: { readonly skill: SkillDefinition; readonly level?: number };
  /** Weapon Mastery mechanics of the hero's weapon. */
  readonly weaponRules?: WeaponRules;
  /**
   * How attributes turn into stats. "heir" is the hero's 1–10 scale with big steps per point
   * (attribute-v1.md); monsters keep the old small steps ("classic", the default).
   */
  readonly attributeScale?: "classic" | "heir";
  /**
   * The class's main attribute (klassengeruest-v1.md 3): on the "heir" scale it gives % damage of
   * every type. Without it no attribute adds damage.
   */
  readonly mainAttribute?: Attribute;
  /** Attribute Breakpoint Perks (attribute-v1.md section 4). */
  readonly perks?: readonly PerkId[];
  /**
   * Ember Penalty (D2/PoE rule, balance-grundlagen-v1.md C): taken off every Resistance before
   * the cap, so later runs need real Resistance gear.
   */
  readonly resistancePenalty?: number;
}
