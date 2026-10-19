import type { Rng } from "../rng";
import { COMBAT } from "./constants";
import type { DerivedStats } from "./stats";
import type { DamageType, Element } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Fraction of physical damage that Armor removes, with diminishing returns:
 * `armor / (armor + 20 × attacker level)`. Physical Penetration ignores part of the Armor.
 */
export function armorReduction(armor: number, attackerLevel: number, penetration = 0): number {
  const effective = Math.max(0, armor * (1 - clamp(penetration, 0, 1)));
  if (effective === 0) return 0;
  const reduction = effective / (effective + COMBAT.armorConstantPerLevel * attackerLevel);
  return Math.min(reduction, COMBAT.maxArmorReduction);
}

/**
 * Fraction of elemental damage that Resistance removes (capped, minus Penetration). The cap is
 * 75 % unless something raised it (a Fire Draught: the defender's final Resistance carries it).
 */
export function resistanceReduction(
  resistance: number,
  penetration = 0,
  cap: number = COMBAT.maxResistance,
): number {
  return clamp(Math.min(resistance, cap) - penetration, 0, cap);
}

/** The defender's final Resistance against one element. */
export function elementResistance(stats: DerivedStats, element: Element): number {
  switch (element) {
    case "fire":
      return stats.fireResistance;
    case "cold":
      return stats.coldResistance;
    case "lightning":
      return stats.lightningResistance;
    case "void":
      return stats.voidResistance;
  }
}

/** Damage % that applies to a damage type (Physical Damage % or Elemental Damage %). */
export function increasedDamage(stats: DerivedStats, type: DamageType): number {
  return type === "physical" ? stats.physicalDamage : stats.elementalDamage;
}

/** Damage after the defender's Armor or Resistance. */
export function mitigate(
  amount: number,
  type: DamageType,
  attacker: DerivedStats,
  attackerLevel: number,
  defender: DerivedStats,
): number {
  const reduction =
    type === "physical"
      ? armorReduction(defender.armor, attackerLevel, attacker.physicalPenetration)
      : resistanceReduction(
          elementResistance(defender, type),
          attacker.elementalPenetration,
          Math.max(COMBAT.maxResistance, elementResistance(defender, type)),
        );
  return amount * (1 - reduction);
}

export interface HitInput {
  /** Damage before increases, crit and mitigation (weapon roll × skill multiplier). */
  readonly baseDamage: number;
  /**
   * The "more" pool (balancing-neustart-v1.md, step 2): all damage bonuses of Ash Tree, Mastery,
   * Heirloom and Keystones added up (1.2 = +120 %). Default 0.
   */
  readonly more?: number;
  readonly type: DamageType;
  /** Attacks can be evaded (any damage type), spells only Deflected. Only Physical hits are blocked. */
  readonly evadable: boolean;
  /** The defender's Evasion Deflects spells (the hero). Default false. */
  readonly deflects?: boolean;
  readonly attacker: DerivedStats;
  readonly attackerLevel: number;
  /** Damage multiplier outside the pools: skill strength, monster scaling, "less" penalties. */
  readonly multiplier: number;
  readonly defender: DerivedStats;
  /** Defender's "+X % damage taken" (Shock). */
  readonly defenderDamageTaken: number;
  /**
   * Weapon Mastery: chance to land cleanly. A miss is a Glancing Blow: `glancingDamage` of the
   * damage and never a Crit. Undefined = always clean (no extra roll).
   */
  readonly precision?: number;
  /** Damage share of a Glancing Blow. Default 0.5. */
  readonly glancingDamage?: number;
  /** The hit lands cleanly and crits (Read the Blow, Deadeye). */
  readonly forceCrit?: boolean;
  /** Crits ignore this extra share of Armor (Killshot). */
  readonly critPenetration?: number;
  /** Crits get this much extra Elemental Penetration (Overwhelm). */
  readonly critElementalPenetration?: number;
  /** The defender's Parry: chance an attack becomes a Glancing Blow (half damage, no Crit). */
  readonly parry?: number;
  /** More damage only a clean hit gets (Mighty Hits, Clean Line), into the "more" pool. */
  readonly cleanMore?: number;
  /** Decides the Crit instead of the roll (Repeater: one roll for the volley). */
  readonly critOverride?: boolean;
  /** Conversion: this share of the hit is dealt as `to` (its Damage % and the defender's layer). */
  readonly conversion?: { readonly to: DamageType; readonly share: number };
}

export type HitOutcome =
  | { readonly kind: "evaded" }
  | {
      readonly kind: "hit";
      readonly damage: number;
      /**
       * What the hit's ailments grow from: the hit before Crit, the "more" pool and the
       * defender's "damage taken" (balancing-neustart-v1.md, step 2), unrounded.
       */
      readonly ailmentDamage: number;
      readonly crit: boolean;
      readonly blocked: boolean;
      /** A spell Deflected by Evasion: `COMBAT.deflectDamage` of the damage. */
      readonly deflected: boolean;
      /** Weapon Mastery: the hit did not land cleanly. */
      readonly glancing: boolean;
      /** The defender Parried it (a Glancing Blow from the other side). */
      readonly parried: boolean;
    };

/**
 * Resolves one hit: Evasion (attacks) → Precision → Block (Physical only) → Crit → Damage % → Armor/Resistance → Shock.
 * Rolls happen in this fixed order so the same seed always gives the same result. The Precision
 * roll only happens for fighters that have Precision (the hero's Weapon Mastery).
 */
export function resolveHit(input: HitInput, rng: Rng): HitOutcome {
  const { defender } = input;
  // Evasion dodges every attack, magic ones too, but no spell (Timo, PoE rule). Block only stops
  // Physical hits.
  const physical = input.type === "physical";
  if (input.evadable && rng.chance(defender.evasion)) return { kind: "evaded" };
  // Spells are Deflected instead, with the same chance: they land, but weaker (Timo 2026-10-13).
  const deflected =
    input.deflects === true &&
    !input.evadable &&
    defender.evasion > 0 &&
    rng.chance(defender.evasion);

  // Parry (the defender's weapon) rolls only when there is some, so other fights keep their rolls.
  const parried = input.evadable && (input.parry ?? 0) > 0 && rng.chance(input.parry ?? 0);
  const glancing =
    parried || (!input.forceCrit && input.precision !== undefined && !rng.chance(input.precision));
  const blocked = physical && rng.chance(defender.blockChance);
  const critRoll = rng.chance(input.attacker.critChance);
  const crit = !glancing && (input.forceCrit === true || (input.critOverride ?? critRoll));
  const attacker =
    crit && (input.critPenetration || input.critElementalPenetration)
      ? {
          ...input.attacker,
          physicalPenetration: input.attacker.physicalPenetration + (input.critPenetration ?? 0),
          elementalPenetration:
            input.attacker.elementalPenetration + (input.critElementalPenetration ?? 0),
        }
      : input.attacker;

  let damage = input.baseDamage * input.multiplier;
  if (glancing) {
    damage *= parried ? COMBAT.glancingDamage : (input.glancingDamage ?? COMBAT.glancingDamage);
  }
  // The pools stay out of the ailments: they have their own (DoT pool, `dotFactor`).
  const pool = Math.max(0, 1 + (input.more ?? 0) + (glancing ? 0 : (input.cleanMore ?? 0)));
  const boost = pool * (crit ? COMBAT.critMultiplier : 1);
  damage *= boost;
  // Each part of the hit takes its own Damage % and the defender's layer against its type.
  const conv = input.conversion;
  const share = conv && conv.to !== input.type ? clamp(conv.share, 0, 1) : 0;
  const part = (type: DamageType, amount: number) =>
    amount > 0
      ? mitigate(
          amount * (1 + increasedDamage(attacker, type)),
          type,
          attacker,
          input.attackerLevel,
          defender,
        )
      : 0;
  damage =
    part(input.type, damage * (1 - share)) +
    (conv && share > 0 ? part(conv.to, damage * share) : 0);
  // A block stops a share of the hit (D2: the shield takes the blow), so it keeps its worth
  // against the biggest late hits.
  if (blocked) damage *= 1 - defender.blockReduction;
  if (deflected) damage *= COMBAT.deflectDamage;
  const ailmentDamage = boost > 0 ? damage / boost : 0;
  damage *= 1 + input.defenderDamageTaken;

  return {
    kind: "hit",
    damage: Math.max(1, Math.round(damage)),
    ailmentDamage,
    crit,
    blocked,
    deflected,
    glancing,
    parried,
  };
}
