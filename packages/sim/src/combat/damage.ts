import type { Rng } from "../rng";
import { COMBAT } from "./constants";
import type { DerivedStats } from "./stats";
import type { DamageType, Element } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Fraction of physical damage that Armor removes, with diminishing returns:
 * `armor / (armor + 40 × attacker level)`. Physical Penetration ignores part of the Armor.
 */
export function armorReduction(armor: number, attackerLevel: number, penetration = 0): number {
  const effective = Math.max(0, armor * (1 - clamp(penetration, 0, 1)));
  if (effective === 0) return 0;
  const reduction = effective / (effective + COMBAT.armorConstantPerLevel * attackerLevel);
  return Math.min(reduction, COMBAT.maxArmorReduction);
}

/** Fraction of elemental damage that Resistance removes (capped at 75 %, minus Penetration). */
export function resistanceReduction(resistance: number, penetration = 0): number {
  return clamp(Math.min(resistance, COMBAT.maxResistance) - penetration, 0, COMBAT.maxResistance);
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
      : resistanceReduction(elementResistance(defender, type), attacker.elementalPenetration);
  return amount * (1 - reduction);
}

export interface HitInput {
  /** Damage before increases, crit and mitigation (weapon roll × skill multiplier). */
  readonly baseDamage: number;
  readonly type: DamageType;
  /** Attacks can be evaded, spells cannot. Both can be blocked. */
  readonly evadable: boolean;
  readonly attacker: DerivedStats;
  readonly attackerLevel: number;
  /** Extra damage multiplier, e.g. monster level scaling or Execute. */
  readonly multiplier: number;
  readonly defender: DerivedStats;
  /** Defender's "+X % damage taken" (Shock). */
  readonly defenderDamageTaken: number;
}

export type HitOutcome =
  | { readonly kind: "evaded" }
  | {
      readonly kind: "hit";
      readonly damage: number;
      readonly crit: boolean;
      readonly blocked: boolean;
    };

/**
 * Resolves one hit: Evasion → Block → Crit → Damage % → Armor/Resistance → Shock.
 * Rolls happen in this fixed order so the same seed always gives the same result.
 */
export function resolveHit(input: HitInput, rng: Rng): HitOutcome {
  const { attacker, defender } = input;
  if (input.evadable && rng.chance(defender.evasion)) return { kind: "evaded" };

  const blocked = rng.chance(defender.blockChance);
  const crit = rng.chance(attacker.critChance);

  let damage = input.baseDamage * input.multiplier * (1 + increasedDamage(attacker, input.type));
  if (crit) damage *= COMBAT.critMultiplier;
  damage = mitigate(damage, input.type, attacker, input.attackerLevel, defender);
  damage *= 1 + input.defenderDamageTaken;
  if (blocked) damage -= defender.blockValue;

  // A hit that lands always deals at least 1, a blocked hit can be absorbed completely.
  const minimum = blocked ? 0 : 1;
  return { kind: "hit", damage: Math.max(minimum, Math.round(damage)), crit, blocked };
}
