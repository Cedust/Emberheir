import { itemFlaskCharges } from "../../items/equipment";
import { PROGRESSION } from "../constants";
import type { EnemyDefinition } from "../../combat/monsters";
import {
  DRAUGHT_ACORN_KILLS,
  DRAUGHT_FLASK_COST,
  DRAUGHT_FROM_PRESTIGE,
  type DraughtDefinition,
  enemyHitsWith,
} from "../draughts";
import { bossLevel, killPrice } from "../leveling";
import { type GameData, type GameState } from "./state";

/** The Ember Flask and the Draughts brewed from it. */

/** Draughts can be brewed from the first Prestige on (and when the game has any). */
export function draughtsOpen(state: GameState, data: GameData): boolean {
  return (data.draughts?.length ?? 0) > 0 && state.legacy.prestige >= DRAUGHT_FROM_PRESTIGE;
}

export function getDraught(data: GameData, id: string): DraughtDefinition | undefined {
  return data.draughts?.find((d) => d.id === id);
}

/** Every foe of the game: the acts' enemies and bosses, the finale's and the Ember Thief. */
function allEnemies(data: GameData): EnemyDefinition[] {
  const acts = [...data.acts, ...(data.finale ? [data.finale] : [])];
  return [...acts.flatMap((a) => [...a.enemies, a.boss]), ...(data.thief ? [data.thief] : [])];
}

/**
 * Whether the hero knows a Draught (draughts-einfuehrung-v1.md): Iron, Ward and Vigor come with
 * the first Prestige; an element Draught once a foe that hits with its element was beaten.
 */
export function draughtKnown(
  state: GameState,
  data: GameData,
  draught: DraughtDefinition,
): boolean {
  if (!draughtsOpen(state, data)) return false;
  const element = draught.element;
  if (!element) return true;
  const kills = state.legacy.hunts ?? {};
  return allEnemies(data).some((e) => (kills[e.id] ?? 0) > 0 && enemyHitsWith(e, element));
}

/** The Draughts the hero can brew, in the game's order. */
export function knownDraughts(state: GameState, data: GameData): DraughtDefinition[] {
  return (data.draughts ?? []).filter((d) => draughtKnown(state, data, d));
}

/** The Acorns a brewed Draught costs on top of its Flask charge (rises with the run). */
export function draughtAcorns(state: GameState): number {
  return killPrice(bossLevel(state.legacy.prestige), { acorns: DRAUGHT_ACORN_KILLS }).acorns;
}

/**
 * The Draught a set-out brews: the chosen one, if the hero knows it, the Flask can spare a
 * charge and the Acorns are there.
 */
export function brewedDraught(state: GameState, data: GameData): DraughtDefinition | undefined {
  if (!state.draught) return undefined;
  const draught = getDraught(data, state.draught);
  if (!draught || !draughtKnown(state, data, draught)) return undefined;
  if (flaskCapacity(state, data) < DRAUGHT_FLASK_COST) return undefined;
  if (state.wallet.acorns < draughtAcorns(state)) return undefined;
  return draught;
}

/**
 * A set-out from the Camp: the Flask leaves full, as much as the worn Belt allows, minus the
 * charge of a brewed Draught, whose Acorns leave the wallet.
 */
export function brewForTrip(
  state: GameState,
  data: GameData,
): { readonly state: GameState; readonly draught?: string } {
  const draught = brewedDraught(state, data);
  const capacity = flaskCapacity(state, data);
  if (!draught) return { state: { ...state, flaskCharges: capacity } };
  return {
    state: {
      ...state,
      flaskCharges: capacity - DRAUGHT_FLASK_COST,
      wallet: { ...state.wallet, acorns: state.wallet.acorns - draughtAcorns(state) },
    },
    draught: draught.id,
  };
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
