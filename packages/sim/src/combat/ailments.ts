import { COMBAT } from "./constants";
import type { AilmentType } from "./types";

/** Burn: Fire DoT. Refreshes on re-application and reduces the target's healing. */
export interface BurnState {
  /** Damage per tick (one tick per second). */
  readonly damagePerSecond: number;
  readonly remaining: number;
  /** Seconds until the next damage tick. */
  readonly nextTickIn: number;
}

/** Chill (-Attack Speed, -Heat Gain) and Shock (+damage taken) only have a duration. */
export interface TimedAilmentState {
  readonly remaining: number;
}

export interface AilmentStates {
  readonly burn?: BurnState;
  readonly chill?: TimedAilmentState;
  readonly shock?: TimedAilmentState;
}

const EPSILON = 1e-9;

const BASE_DURATION: Record<AilmentType, number> = {
  burn: COMBAT.burnDurationSeconds,
  chill: COMBAT.chillDurationSeconds,
  shock: COMBAT.shockDurationSeconds,
};

/**
 * Ailment duration: base × (1 + attacker's Ailment Duration) × (1 − defender's Tenacity).
 */
export function ailmentDuration(
  type: AilmentType,
  attackerAilmentDuration: number,
  defenderTenacity: number,
): number {
  return BASE_DURATION[type] * (1 + attackerAilmentDuration) * (1 - defenderTenacity);
}

/**
 * Applies an ailment. All three ailments refresh their duration on re-application; Burn keeps
 * the stronger of the old and the new damage.
 *
 * @param hitDamage damage of the hit that caused the ailment (Burn scales with it)
 */
export function applyAilment(
  states: AilmentStates,
  type: AilmentType,
  duration: number,
  hitDamage: number,
): AilmentStates {
  if (duration <= 0) return states;
  if (type === "burn") {
    const previous = states.burn;
    const damagePerSecond = Math.max(
      previous?.damagePerSecond ?? 0,
      hitDamage * COMBAT.burnDamagePerSecond,
    );
    return {
      ...states,
      burn: { damagePerSecond, remaining: duration, nextTickIn: previous?.nextTickIn ?? 1 },
    };
  }
  return { ...states, [type]: { remaining: duration } };
}

export interface AilmentStepResult {
  readonly states: AilmentStates;
  /** Burn damage ticks that happened during this step (before Shock). */
  readonly burnTicks: readonly number[];
  readonly expired: readonly AilmentType[];
}

/** Advances all ailments on one fighter by `dt` seconds. */
export function stepAilments(states: AilmentStates, dt: number): AilmentStepResult {
  const next: { -readonly [K in keyof AilmentStates]: AilmentStates[K] } = {};
  const burnTicks: number[] = [];
  const expired: AilmentType[] = [];

  if (states.burn) {
    let { nextTickIn } = states.burn;
    const remaining = states.burn.remaining - dt;
    nextTickIn -= dt;
    // A tick counts if it falls inside this step and not after the Burn ran out.
    while (nextTickIn <= EPSILON && nextTickIn <= remaining + EPSILON) {
      burnTicks.push(states.burn.damagePerSecond);
      nextTickIn += 1;
    }
    if (remaining <= EPSILON) expired.push("burn");
    else next.burn = { damagePerSecond: states.burn.damagePerSecond, remaining, nextTickIn };
  }

  for (const type of ["chill", "shock"] as const) {
    const state = states[type];
    if (!state) continue;
    const remaining = state.remaining - dt;
    if (remaining <= EPSILON) expired.push(type);
    else next[type] = { remaining };
  }

  return { states: next, burnTicks, expired };
}

/** "+X % damage taken" from Shock. */
export function damageTakenBonus(states: AilmentStates): number {
  return states.shock ? COMBAT.shockDamageTaken : 0;
}

/** Multiplier on Attack Speed and Heat Gain from Chill. */
export function chillFactor(states: AilmentStates): number {
  return states.chill ? 1 - COMBAT.chillSlow : 1;
}

/** Multiplier on healing received (Burn reduces healing). */
export function healingFactor(states: AilmentStates): number {
  return states.burn ? 1 - COMBAT.burnHealingReduction : 1;
}
