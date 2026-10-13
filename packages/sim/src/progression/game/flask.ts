import { itemFlaskCharges } from "../../items/equipment";
import { PROGRESSION } from "../constants";
import { DRAUGHT_FLASK_COST, DRAUGHT_FROM_PRESTIGE, type DraughtDefinition } from "../draughts";
import { type GameData, type GameState } from "./state";

/** The Ember Flask and the Draughts brewed from it. */

/** Draughts can be brewed from the first Prestige on (and when the game has any). */
export function draughtsOpen(state: GameState, data: GameData): boolean {
  return (data.draughts?.length ?? 0) > 0 && state.legacy.prestige >= DRAUGHT_FROM_PRESTIGE;
}

export function getDraught(data: GameData, id: string): DraughtDefinition | undefined {
  return data.draughts?.find((d) => d.id === id);
}

/** The Draught a set-out brews: the chosen one, if Draughts are open and the Flask can spare it. */
export function brewedDraught(state: GameState, data: GameData): DraughtDefinition | undefined {
  if (!state.draught || !draughtsOpen(state, data)) return undefined;
  if (flaskCapacity(state, data) < DRAUGHT_FLASK_COST) return undefined;
  return getDraught(data, state.draught);
}

/** The Draught working right now: the one brewed for this trip. */
export function activeDraught(state: GameState, data: GameData): DraughtDefinition | undefined {
  return state.run?.draught ? getDraught(data, state.run.draught) : undefined;
}

/** Charges the Ember Flask holds: its start charges plus the worn Belt's "Flask Charges". */
export function flaskCapacity(state: GameState, data: GameData): number {
  const belt = state.hero.equipment.belt;
  return PROGRESSION.flaskStartCharges + (belt ? itemFlaskCharges(belt, data.items) : 0);
}
