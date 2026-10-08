import { COMBAT } from "./constants";
import type { HeatBehavior } from "./types";

/**
 * Heat rules per weapon behavior (docs/design/waffen-v1.md section 4):
 * - Cooling (melee): own hits (+ hits taken with the Skill Tree), always cools down.
 * - Steady (bow, crossbow): own hits only, never decays.
 * - Warming (wand, staff): fixed gain per second, independent of Attack Speed.
 * - Smoldering (Weapon Mastery Heat Form): mostly from hits taken, never decays.
 */

/** Multiplier on every Heat gain: (1 + Heat Gain) × Chill factor. */
export function heatGainMultiplier(heatGain: number, chillFactor: number): number {
  return Math.max(0, (1 + heatGain) * chillFactor);
}

export function addHeat(current: number, amount: number, multiplier: number): number {
  return Math.min(COMBAT.maxHeat, Math.max(0, current + amount * multiplier));
}

/** Heat from landing a Default Attack. */
export function heatFromOwnHit(behavior: HeatBehavior, heatPerHit: number): number {
  return behavior === "warming" ? 0 : heatPerHit;
}

/**
 * Heat from taking a hit (Cooling and Smoldering): 1 per 1 % of max life lost, at most 10 per hit.
 * Blocked and evaded hits give nothing; the caller only passes unblocked hits.
 */
export function heatFromHitTaken(behavior: HeatBehavior, damage: number, maxLife: number): number {
  if ((behavior !== "cooling" && behavior !== "smoldering") || maxLife <= 0) return 0;
  const percent = (damage / maxLife) * 100;
  return Math.min(COMBAT.maxHeatFromHitTaken, percent * COMBAT.heatPerPercentLifeTaken);
}

/** Heat change over time: Warming gains per second, Cooling cools down all the time. */
export function stepHeat(
  behavior: HeatBehavior,
  heat: number,
  dt: number,
  multiplier: number,
): number {
  if (behavior === "warming") return addHeat(heat, COMBAT.warmingHeatPerSecond * dt, multiplier);
  if (behavior === "cooling") return Math.max(0, heat - COMBAT.coolingDecayPerSecond * dt);
  return heat;
}

/** Effective Trigger Threshold of a Rotation Slot: never below the skill's Heat Cost. */
export function triggerThreshold(heatCost: number, threshold: number | undefined): number {
  return Math.min(COMBAT.maxHeat, Math.max(heatCost, threshold ?? heatCost));
}
