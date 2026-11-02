import type { GameState } from "@emberheir/sim";
import type { MusicMood } from "./musicCatalog";

/**
 * The music director: which mood a moment of the game carries. Pure; which song of a mood
 * plays is the controller's call (musicController.ts).
 *
 * Title → title; the story intro, the class select and the Camp → camp; a trip's fights and the map between them →
 * battle (dampened off the fight); a boss → boss; the Harvester and The Last Ember → finale;
 * the Harvest and the ending → harvest; a death fades to silence.
 */
export type MusicCueMood = MusicMood | "silence";

export interface MusicCue {
  readonly mood: MusicCueMood;
  /** Quieter and behind a low-pass, as if through a tent wall (map, Menu). */
  readonly dampened: boolean;
}

/** The boss of Emberfall: the run's last fight gets the finale's song. */
export const HARVESTER_ID = "ashen-harvester";
/** The finale act (`LAST_EMBER` in content). */
export const FINALE_ACT_ID = "last-ember";

export interface MusicOptions {
  /** The Menu is open. */
  readonly menu: boolean;
  /** Before a game: the title, or the story intro and the class select of a new Heir. */
  readonly title?: "menu" | "newHeir";
}

export function selectMusicCue(state: GameState | null, options: MusicOptions): MusicCue {
  const cue = (mood: MusicCueMood, dampened = false): MusicCue => ({
    mood,
    dampened: dampened || options.menu,
  });
  // A new Heir leaves the title behind: Old Nan's tale and the class select sit by the fire.
  if (!state) return cue(options.title === "newHeir" ? "camp" : "title");
  if (state.pendingPrestige || state.notice?.kind === "ending" || state.notice?.kind === "prestige")
    return cue("harvest");
  if (state.notice?.kind === "death") return cue("silence");
  const run = state.run;
  if (!run || state.notice) return cue("camp");
  const fight = run.phase === "fight";
  if (run.actId === FINALE_ACT_ID) return cue("finale", !fight);
  const encounter = run.encounter;
  if (encounter?.enemyId === HARVESTER_ID) return cue("finale", !fight);
  // The boss song plays through its fight and its Hoard, then the trip ends.
  if (encounter?.boss) return cue("boss", !fight);
  return cue("battle", !fight);
}

export function sameCue(a: MusicCue | null, b: MusicCue): boolean {
  return a !== null && a.mood === b.mood && a.dampened === b.dampened;
}
