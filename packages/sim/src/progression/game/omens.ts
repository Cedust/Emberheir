import { Rng } from "../../rng";
import {
  minPeril,
  omenEffects,
  omenPeril,
  rollOmenOffer,
  type OmenDefinition,
  type OmenEffects,
} from "../omens";
import { getAct, isFinaleAct, isHarvestAct } from "./acts";
import { fail, mixSeed, type GameData, type GameState } from "./state";

/** The Omens of a trip (neuausrichtung-v1.md 5.2 and 7.2): offered, chosen and in effect. */

export function getOmen(data: GameData, id: string): OmenDefinition {
  return data.omens?.find((o) => o.id === id) ?? fail(`Unknown Omen "${id}"`);
}

/** An old act of the run: every act before the newest one. Setting out there takes an Omen. */
export function isOldAct(state: GameState, data: GameData, actId: string): boolean {
  return (
    !isFinaleAct(data, actId) &&
    (data.omens ?? []).some((o) => o.kind === "run") &&
    !isHarvestAct(data, actId, state.legacy.prestige)
  );
}

/** A small stable hash, so every act draws its own offer. */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * The two Run Omens Eldrin shows for an old act. The offer is fixed for the whole run (the same
 * act shows the same two every time), and the next Prestige burns a new one.
 */
export function omenOffer(state: GameState, data: GameData, actId: string): string[] {
  if (!isOldAct(state, data, actId)) return [];
  const rng = new Rng(mixSeed(state.seed ^ hashId(actId), 7919 * (state.legacy.prestige + 1)));
  return rollOmenOffer(data.omens ?? [], rng);
}

/** Checks the Omens of a set-out; returns them in a fixed order. */
export function checkOmens(
  state: GameState,
  data: GameData,
  actId: string,
  omens: readonly string[],
  wildfire?: number,
): string[] {
  if (new Set(omens).size !== omens.length) return fail("Each Omen only once");
  const chosen = omens.map((id) => getOmen(data, id));
  if (wildfire) {
    if (chosen.some((o) => o.kind !== "wildfire")) return fail("Only Wildfire Omens burn here");
    if (omenPeril(chosen) < minPeril(wildfire)) {
      return fail(`This Wildfire asks for at least ${minPeril(wildfire)} Peril`);
    }
    return [...omens];
  }
  getAct(data, actId);
  const offer = omenOffer(state, data, actId);
  if (!offer.length) return omens.length ? fail("No Omen hangs over this act") : [];
  if (omens.length !== 1 || !offer.includes(omens[0] ?? "")) {
    return fail("Choose one of the two Omens");
  }
  return [...omens];
}

/** The Omens of the current trip. */
export function tripOmens(state: GameState, data: GameData): OmenDefinition[] {
  return (state.run?.omens ?? []).map((id) => getOmen(data, id));
}

/** What the Omens of the current trip do, the Wildfire's Peril reward included. */
export function tripOmenEffects(state: GameState, data: GameData): OmenEffects {
  return omenEffects(tripOmens(state, data), (state.run?.wildfire ?? 0) > 0);
}

/** What a list of Omen ids does (the enemy side of an encounter). */
export function omenEffectsOf(data: GameData, ids: readonly string[]): OmenEffects {
  return omenEffects(ids.map((id) => getOmen(data, id)));
}
