import { useEffect, useRef } from "react";
import type { GameState } from "@emberheir/sim";
import { createMusicController } from "./musicController";
import { type MusicCue, sameCue, selectMusicCue } from "./musicDirector";
import { createMusicPlayer } from "./musicPlayer";

/** The one music player and controller of the app. */
const player = createMusicPlayer();
const controller = createMusicController(player);
player.onReady(() => controller.refresh());

/**
 * Plays the music of the moment (musicDirector.ts) at the Music settings. Browser tests run
 * without music, so the songs are never fetched there.
 */
export function useMusic(
  state: GameState | null,
  options: { menu: boolean; on: boolean; volume: number },
) {
  const { menu, on, volume } = options;
  useEffect(() => {
    if (navigator.webdriver) return;
    return player.install();
  }, []);
  useEffect(() => player.setMix({ on, volume }), [on, volume]);

  // Each trip from the Camp counts once: it picks its own battle song.
  const trip = useRef({ inRun: false, count: 0 });
  const lastCue = useRef<MusicCue | null>(null);
  useEffect(() => {
    const t = trip.current;
    const inRun = !!state?.run;
    if (inRun && !t.inRun) t.count += 1;
    t.inRun = inRun;
    const cue = selectMusicCue(state, { menu });
    if (sameCue(lastCue.current, cue)) return;
    lastCue.current = cue;
    controller.update(cue, t.count);
  }, [state, menu]);
}
