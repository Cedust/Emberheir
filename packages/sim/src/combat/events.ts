import { type PerkId } from "./perks";
import { type DerivedStats } from "./stats";
import type { AilmentType, BuffStat, DamageType, HeatBehavior, Side } from "./types";

/** What a fight tells the outside world: the combat log and the snapshots. */

/**
 * A built-in payoff of an ailment (ailments-v2.md 3.1) or a Class Trait (neuausrichtung-v1.md
 * 2.1) did something. The arena gives each its own moment.
 */
export const PAYOFF_KINDS = [
  "overflow",
  "combust",
  "collapse",
  // Class Traits (klassengeruest-v1.md 2): full Fury, the Overcharge Nova.
  "fury",
  "overcharge",
  "spark",
  // Wand Mastery (sorcerer-ohne-fire-v1.md): the Spark that crits, built-up Crits, Shock as Heat.
  "flashpoint",
  "criticalMass",
  "conduction",
] as const;
export type PayoffKind = (typeof PAYOFF_KINDS)[number];

/** One entry of the combat log. `side` is always the fighter the event is about. */
export type CombatEvent =
  | {
      readonly t: number;
      readonly type: "skill";
      readonly side: Side;
      readonly skill: string;
      readonly heatCost: number;
      /** How it was cast, if not by the Rotation: a Reaction Slot or a free repeat. */
      readonly via?: "reaction" | "reverb" | "echo" | "opening";
    }
  | {
      readonly t: number;
      readonly type: "hit";
      /** Attacker. */
      readonly side: Side;
      /** Default Attack or skill name. */
      readonly source: string;
      readonly damage: number;
      readonly damageType: DamageType;
      readonly crit: boolean;
      readonly blocked: boolean;
      /** Weapon Mastery: the hit did not land cleanly (Glancing Blow). */
      readonly glancing?: boolean;
      /** The defender Parried the attack into a Glancing Blow. */
      readonly parried?: boolean;
      /** Weapon Mastery v2: a clean hit that rolled 125 % Weapon Damage or more. */
      readonly mighty?: boolean;
      /** A Heavy Attack hit held back by `COMBAT.heavyHitCap`. */
      readonly capped?: boolean;
      /** A spell Deflected by Evasion. */
      readonly deflected?: boolean;
    }
  | { readonly t: number; readonly type: "evade"; readonly side: Side; readonly source: string }
  | {
      readonly t: number;
      readonly type: "ailment";
      readonly side: Side;
      readonly ailment: AilmentType;
      /** Poison stacks after this application. */
      readonly stacks?: number;
    }
  | {
      readonly t: number;
      readonly type: "ailmentExpired";
      readonly side: Side;
      readonly ailment: AilmentType;
    }
  | {
      readonly t: number;
      readonly type: "dot";
      readonly side: Side;
      readonly ailment: AilmentType;
      readonly damage: number;
    }
  | { readonly t: number; readonly type: "heal"; readonly side: Side; readonly amount: number }
  /** A trigger affix (or weapon trigger) fired. Its effect follows as separate events. */
  | { readonly t: number; readonly type: "trigger"; readonly side: Side; readonly name: string }
  | {
      readonly t: number;
      readonly type: "barrier";
      readonly side: Side;
      readonly amount: number;
    }
  | {
      readonly t: number;
      readonly type: "buff";
      readonly side: Side;
      readonly stat: BuffStat;
      readonly amount: number;
      readonly stacks: number;
      readonly duration: number;
    }
  | {
      readonly t: number;
      readonly type: "heatGain";
      readonly side: Side;
      readonly amount: number;
    }
  /** A telegraphed Heavy Attack starts winding up; `skill` fires after `windup` seconds. */
  | {
      readonly t: number;
      readonly type: "telegraph";
      readonly side: Side;
      readonly skill: string;
      readonly windup: number;
    }
  /** The fighter is stunned and cannot act for `seconds`. */
  | { readonly t: number; readonly type: "stun"; readonly side: Side; readonly seconds: number }
  | { readonly t: number; readonly type: "death"; readonly side: Side }
  | {
      readonly t: number;
      readonly type: "fightEnd";
      readonly winner: Side | null;
      readonly fled?: Side;
    }
  /** A fighter with `fleeAfter` ran away; the fight ends without a winner. */
  | { readonly t: number; readonly type: "flee"; readonly side: Side }
  /** A payoff or Class Trait fired; `side` is its owner, `damage` what it dealt (if any). */
  | {
      readonly t: number;
      readonly type: "payoff";
      readonly side: Side;
      readonly payoff: PayoffKind;
      readonly damage?: number;
    }
  /** An Attribute Breakpoint Perk did something (attribute-v1.md section 4). */
  | { readonly t: number; readonly type: "perk"; readonly side: Side; readonly perk: PerkId };

export interface ReactionSlotSnapshot {
  readonly skillId: string;
  readonly name: string;
  readonly heatCost: number;
  /** Seconds until the slot is ready again. */
  readonly cooldownLeft: number;
  /** The condition was met; the skill fires as soon as Heat allows. */
  readonly pending: boolean;
}

export interface RotationSlotSnapshot {
  readonly skillId: string;
  readonly name: string;
  readonly heatCost: number;
  readonly threshold: number;
}

export interface FighterSnapshot {
  readonly side: Side;
  readonly name: string;
  readonly level: number;
  readonly weapon: string;
  readonly defaultAttack: string;
  readonly heatBehavior: HeatBehavior;
  readonly life: number;
  readonly maxLife: number;
  /** Temporary extra life that absorbs damage first. */
  readonly barrier: number;
  readonly heat: number;
  readonly maxHeat: number;
  readonly rotation: readonly RotationSlotSnapshot[];
  /** Index into `rotation` of the next skill. */
  readonly nextSlot: number;
  readonly reactions: readonly ReactionSlotSnapshot[];
  /** Active ailments; Poison also tells its stacks (`remaining` = longest stack). */
  readonly ailments: readonly {
    readonly type: AilmentType;
    readonly remaining: number;
    readonly stacks?: number;
  }[];
  readonly buffs: readonly {
    readonly name: string;
    readonly stat: BuffStat;
    readonly amount: number;
    readonly stacks: number;
    readonly remaining: number;
  }[];
  /** Curses on this fighter (Wither) and Sunder. */
  readonly curses: readonly {
    readonly name: string;
    readonly dotDamageTaken: number;
    /** Sunder: share of Armor that no longer counts. */
    readonly armor?: number;
    /** Stacking Sunder (Weapon Mastery): current stacks. */
    readonly stacks?: number;
    readonly remaining: number;
  }[];
  /** Current stats including active buffs. */
  readonly stats: DerivedStats;
  /** Seconds the fighter is still stunned (0 = can act). */
  readonly stunned: number;
  /** A Heavy Attack that is winding up right now. */
  readonly telegraph: {
    readonly skill: string;
    readonly remaining: number;
    readonly windup: number;
  } | null;
  /** 0..1 progress of the swing: the next action (skill or Default Attack) fires at 1. */
  readonly attackProgress: number;
  /** Swings per second right now (Attack Speed with Chill); 0 while stunned or winding up. */
  readonly attackRate: number;
  /** The next telegraphed Heavy Attack: starts winding up in `in` seconds (not while one winds up). */
  readonly nextHeavy: {
    readonly skill: string;
    readonly in: number;
    readonly windup: number;
  } | null;
  /**
   * The Class Trait's state for the arena (klassengeruest-v1.md 2): Fury gathered, Overcharge
   * charges, or Hunter's Mark on (1) or off (0). Missing without a trait.
   */
  readonly trait?: {
    readonly kind: "fury" | "overcharge" | "huntersMark";
    readonly value: number;
    readonly max: number;
    /** The weapon's damage type: the colour of the Overcharge sparks. */
    readonly damageType: DamageType;
  };
}

export interface FightSnapshot {
  readonly time: number;
  readonly over: boolean;
  /** `null` while running or after a draw (time limit). */
  readonly winner: Side | null;
  /** The side that ran away, if one did (the fight then has no winner). */
  readonly fled: Side | null;
  readonly hero: FighterSnapshot;
  readonly enemy: FighterSnapshot;
}

export interface FightResult {
  readonly winner: Side | null;
  /** The side that ran away (the Ember Thief), if one did. */
  readonly fled: Side | null;
  /** Fight length in seconds. */
  readonly duration: number;
  readonly events: readonly CombatEvent[];
  readonly final: FightSnapshot;
}
