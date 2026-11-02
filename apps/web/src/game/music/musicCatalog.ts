import battle01 from "../../assets/music/battle-01.m4a?url";
import battle02 from "../../assets/music/battle-02.m4a?url";
import boss01 from "../../assets/music/boss-01.m4a?url";
import camp01 from "../../assets/music/camp-01.m4a?url";
import title02 from "../../assets/music/title-02.m4a?url";
import finale01 from "../../assets/music/finale-01.m4a?url";
import harvest01 from "../../assets/music/harvest-01.m4a?url";
import title01 from "../../assets/music/title-01.m4a?url";

/**
 * The game's songs (Suno, by Cedust; the Camp's is CC0) and the moments they play at (musicDirector.ts).
 *
 * `entry` is where a fresh start begins, `loopStart`..`loopEnd` the window a song circles in
 * (it fades back to `loopStart` shortly before `loopEnd`, before its fade-out), `gainDb` evens
 * out the loudness of the songs. The marks were tuned by ear for the same songs in Crucible.
 */
export const MUSIC_MOODS = ["title", "camp", "battle", "boss", "finale", "harvest"] as const;
export type MusicMood = (typeof MUSIC_MOODS)[number];

export interface MusicTrack {
  readonly id: string;
  readonly mood: MusicMood;
  readonly url: string;
  /** Length of the file in seconds. */
  readonly durationS: number;
  readonly gainDb: number;
  readonly entry: number;
  readonly loopStart: number;
  readonly loopEnd: number;
}

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    id: "title-01",
    mood: "title",
    url: title01,
    durationS: 212.76,
    gainDb: 0.9,
    entry: 1.9,
    loopStart: 1.9,
    loopEnd: 204,
  },
  {
    id: "title-02",
    mood: "title",
    url: title02,
    durationS: 277.2,
    gainDb: -0.9,
    entry: 0.5,
    loopStart: 0.5,
    loopEnd: 274,
  },
  // "The Old Tower Inn" by RandomMind (CC0): its 49.95 s loop four times over. The loop window
  // is a whole number of loops long, so the jump back lands on the same bar.
  {
    id: "camp-01",
    mood: "camp",
    url: camp01,
    durationS: 199.8,
    gainDb: 1,
    entry: 0,
    loopStart: 46.146,
    loopEnd: 196,
  },
  {
    id: "battle-01",
    mood: "battle",
    url: battle01,
    durationS: 223.28,
    gainDb: -0.2,
    entry: 12.4,
    loopStart: 12.4,
    loopEnd: 219,
  },
  {
    id: "battle-02",
    mood: "battle",
    url: battle02,
    durationS: 239.92,
    gainDb: -0.3,
    entry: 10.8,
    loopStart: 10.8,
    loopEnd: 236,
  },
  {
    id: "boss-01",
    mood: "boss",
    url: boss01,
    durationS: 263.96,
    gainDb: 0.6,
    entry: 0.1,
    loopStart: 0.1,
    loopEnd: 261,
  },
  {
    id: "finale-01",
    mood: "finale",
    url: finale01,
    durationS: 209.76,
    gainDb: -0.1,
    entry: 30.5,
    loopStart: 30.5,
    loopEnd: 206,
  },
  {
    id: "harvest-01",
    mood: "harvest",
    url: harvest01,
    durationS: 202.48,
    gainDb: 1.7,
    entry: 8.6,
    loopStart: 8.6,
    loopEnd: 191,
  },
];

/** The songs of a mood in catalog order. */
export function tracksOf(mood: MusicMood): readonly MusicTrack[] {
  return MUSIC_TRACKS.filter((t) => t.mood === mood);
}
