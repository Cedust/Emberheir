import { type Companion, type GameState, type StoryBlip } from "./state";

/**
 * Personas met on the road (camp-personas-freischalten-v1.md): Kaelen at the first Waymark,
 * Marisha at her third meeting on the act map, Liora when the first act boss falls, Nyssa at the
 * first won fight in the Rotwood. Each meeting leaves a Story Blip for the UI to show once.
 */

/** Marisha joins the caravan at this meeting on the road (Timo). */
export const MARISHA_MEETINGS = 3;

export function hasMet(state: GameState, who: Companion): boolean {
  return state.progress.met.includes(who);
}

/** The persona joins the caravan (no-op if already there); `blip` queues its scene. */
export function meet(
  state: GameState,
  who: Companion,
  blip: StoryBlip | null = who === "marisha" ? "marisha-3" : who,
): GameState {
  if (hasMet(state, who)) return state;
  return {
    ...state,
    progress: { ...state.progress, met: [...state.progress.met, who] },
    ...(blip ? { blips: [...(state.blips ?? []), blip] } : {}),
  };
}

/** Marisha on the road before she joined: one more meeting, its scene, and at the third she joins. */
export function meetMarisha(state: GameState): GameState {
  if (hasMet(state, "marisha")) return state;
  const n = Math.min(MARISHA_MEETINGS, (state.progress.marishaMeetings ?? 0) + 1);
  const blip = `marisha-${n}` as StoryBlip;
  const counted: GameState = {
    ...state,
    progress: { ...state.progress, marishaMeetings: n },
  };
  if (n >= MARISHA_MEETINGS) return meet(counted, "marisha", blip);
  return { ...counted, blips: [...(state.blips ?? []), blip] };
}

/** The UI showed the oldest Story Blip. */
export function dismissBlip(state: GameState): GameState {
  const [, ...rest] = state.blips ?? [];
  return { ...state, blips: rest };
}
