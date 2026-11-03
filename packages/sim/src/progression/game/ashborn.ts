import { ashbornBlockReason, ashbornSpent, EMPTY_ASHBORN, type AshbornState } from "../ashborn";
import { PROGRESSION } from "../constants";
import { killPrice } from "../leveling";
import { requireCamp } from "./guards";
import { fail, type GameData, type GameState } from "./state";

/** Ashborn (neuausrichtung-v1.md 7.3): points spent in the Character Sheet, reset at Old Nan. */

export const heroAshborn = (state: GameState): AshbornState => state.hero.ashborn ?? EMPTY_ASHBORN;

/** Character Sheet: `count` points into one value (never mid-fight). */
export function spendAshborn(
  state: GameState,
  data: GameData,
  valueId: string,
  count = 1,
): GameState {
  if (state.run?.phase === "fight") return fail("Not during a fight");
  if (!Number.isInteger(count) || count < 1) return fail("Points must be whole and positive");
  let ashborn = heroAshborn(state);
  for (let i = 0; i < count; i++) {
    const reason = ashbornBlockReason(ashborn, data.ashbornValues ?? [], valueId);
    if (reason) return fail(reason);
    ashborn = {
      ...ashborn,
      points: { ...ashborn.points, [valueId]: (ashborn.points[valueId] ?? 0) + 1 },
    };
  }
  return { ...state, hero: { ...state.hero, ashborn } };
}

/**
 * Acorns Old Nan takes to give every Ashborn Point back: the spent points, each worth
 * `respecKillsPerPoint.ashborn` normal kills at the hero's level (economy-v2-plan.md W1).
 */
export function ashbornResetAcorns(state: GameState): number {
  const points = Math.max(1, ashbornSpent(heroAshborn(state)));
  return killPrice(state.hero.level, { acorns: points * PROGRESSION.respecKillsPerPoint.ashborn })
    .acorns;
}

/** Old Nan (Camp only): every Ashborn Point comes back, for Acorns. */
export function resetAshborn(state: GameState): GameState {
  requireCamp(state);
  const ashborn = heroAshborn(state);
  if (ashbornSpent(ashborn) === 0) return fail("No Ashborn Points spent");
  const price = ashbornResetAcorns(state);
  if (state.wallet.acorns < price) return fail("Not enough Acorns");
  return {
    ...state,
    hero: { ...state.hero, ashborn: { ...ashborn, points: {} } },
    wallet: { ...state.wallet, acorns: state.wallet.acorns - price },
  };
}
