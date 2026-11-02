import { type MusicMood, type MusicTrack, tracksOf } from "./musicCatalog";
import type { MusicCue } from "./musicDirector";
import type { MusicPlayer } from "./musicPlayer";

/**
 * Turns the director's cues into songs (ported from Crucible's music controller).
 *
 * - Each mood takes turns through its songs.
 * - A trip picks one battle song and starts it at `entry`; on the map and after the Menu it
 *   goes on where it was. The next trip takes the next battle song.
 * - Title and Camp go on where they were faded out; boss, finale and harvest start fresh.
 */
export interface MusicController {
  update: (cue: MusicCue, trip: number) => void;
  /** Plays the last cue again, e.g. once sound is unlocked. */
  refresh: () => void;
}

/** Crossfades in seconds. */
export const FADE_S = { change: 2, silence: 2.5 } as const;
/** A kept spot this close to the loop's end is not worth it: the song starts fresh. */
const RESUME_TAIL_S = 5;
const RESUMES: ReadonlySet<MusicMood> = new Set(["title", "camp", "battle"]);

export function createMusicController(player: MusicPlayer): MusicController {
  const turn = new Map<MusicMood, number>();
  let tripSong: { trip: number; track: MusicTrack } | null = null;
  let playing: { mood: MusicMood; track: MusicTrack } | null = null;
  let last: { cue: MusicCue; trip: number } | null = null;

  function next(mood: MusicMood): MusicTrack | undefined {
    const tracks = tracksOf(mood);
    if (tracks.length === 0) return undefined;
    const i = turn.get(mood) ?? 0;
    turn.set(mood, (i + 1) % tracks.length);
    return tracks[i % tracks.length];
  }

  function songFor(mood: MusicMood, trip: number): MusicTrack | undefined {
    if (mood !== "battle") return next(mood);
    if (tripSong?.trip === trip) return tripSong.track;
    const track = next("battle");
    if (!track) return undefined;
    player.forget(track.id);
    tripSong = { trip, track };
    return track;
  }

  function startAt(track: MusicTrack): number {
    if (!RESUMES.has(track.mood)) return track.entry;
    const spot = player.positionOf(track.id);
    if (spot === null || spot >= track.loopEnd - RESUME_TAIL_S) return track.entry;
    return Math.max(spot, track.loopStart);
  }

  function apply(cue: MusicCue, trip: number, force = false) {
    player.setDampened(cue.dampened);
    if (cue.mood === "silence") {
      if (playing) player.stop(FADE_S.silence);
      playing = null;
      return;
    }
    const sameTrip = cue.mood !== "battle" || tripSong?.trip === trip;
    if (!force && playing?.mood === cue.mood && sameTrip) return;
    const track = force && playing?.mood === cue.mood ? playing.track : songFor(cue.mood, trip);
    if (!track) return;
    playing = { mood: cue.mood, track };
    player.play(track, { at: startAt(track), fadeS: FADE_S.change });
  }

  return {
    update: (cue, trip) => {
      last = { cue, trip };
      apply(cue, trip);
    },
    refresh: () => {
      if (last) apply(last.cue, last.trip, true);
    },
  };
}
