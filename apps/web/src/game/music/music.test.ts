import type { GameState } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { MUSIC_MOODS, MUSIC_TRACKS, tracksOf } from "./musicCatalog";
import { createMusicController } from "./musicController";
import {
  FINALE_ACT_ID,
  HARVESTER_ID,
  type MusicCue,
  type MusicCueMood,
  selectMusicCue,
} from "./musicDirector";
import {
  LOOP_CROSSFADE_S,
  type MusicPlayer,
  dbToGain,
  equalPowerCurve,
  isNearEnd,
  volumeToGain,
} from "./musicPlayer";

function first<T>(list: readonly T[]): T {
  const item = list[0];
  if (item === undefined) throw new Error("empty list");
  return item;
}

/** Just the parts of the game state the director reads. */
function game(part: Record<string, unknown> = {}): GameState {
  return { run: null, notice: null, pendingPrestige: null, ...part } as unknown as GameState;
}
const run = (part: Record<string, unknown> = {}) => ({
  actId: "ashen-fields",
  phase: "intermission",
  encounter: null,
  ...part,
});
const fight = (encounter: Record<string, unknown>) =>
  run({ phase: "fight", encounter: { enemyId: "ash-rat", boss: false, ...encounter } });
const mood = (state: GameState | null, menu = false) => selectMusicCue(state, { menu });

describe("music catalog", () => {
  it("every mood has a song, and each loop window fits its file", () => {
    for (const m of MUSIC_MOODS) expect(tracksOf(m).length).toBeGreaterThan(0);
    for (const t of MUSIC_TRACKS) {
      expect(t.loopStart).toBeLessThan(t.loopEnd);
      expect(t.entry).toBeLessThan(t.loopEnd);
      expect(t.loopEnd).toBeLessThanOrEqual(t.durationS);
    }
  });
});

describe("music director", () => {
  it("title, Camp, and the Harvest", () => {
    expect(mood(null)).toEqual({ mood: "title", dampened: false });
    expect(mood(game()).mood).toBe("camp");
    expect(mood(game({ notice: { kind: "actCleared" } })).mood).toBe("camp");
    expect(mood(game({ pendingPrestige: {} })).mood).toBe("harvest");
    expect(mood(game({ notice: { kind: "ending" } })).mood).toBe("harvest");
    expect(mood(game({ notice: { kind: "death" } })).mood).toBe("silence");
  });

  it("a trip: battle in the fight, dampened on the map", () => {
    expect(mood(game({ run: fight({}) }))).toEqual({ mood: "battle", dampened: false });
    expect(mood(game({ run: run() }))).toEqual({ mood: "battle", dampened: true });
  });

  it("the boss song plays through the boss's Hoard; the Harvester and the finale get theirs", () => {
    expect(mood(game({ run: fight({ boss: true }) })).mood).toBe("boss");
    expect(mood(game({ run: run({ phase: "rewards", encounter: { boss: true } }) }))).toEqual({
      mood: "boss",
      dampened: true,
    });
    expect(mood(game({ run: fight({ boss: true, enemyId: HARVESTER_ID }) })).mood).toBe("finale");
    expect(mood(game({ run: run({ actId: FINALE_ACT_ID }) })).mood).toBe("finale");
  });

  it("a new Heir's story intro and class select already play the Camp's song", () => {
    expect(selectMusicCue(null, { menu: false, title: "newHeir" }).mood).toBe("camp");
    expect(selectMusicCue(null, { menu: false, title: "menu" }).mood).toBe("title");
  });

  it("the Menu dampens whatever plays", () => {
    expect(mood(game({ run: fight({}) }), true)).toEqual({ mood: "battle", dampened: true });
    expect(mood(null, true).dampened).toBe(true);
  });
});

describe("music player helpers", () => {
  it("decibels, the volume curve, and equal-power fades", () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(-6)).toBeCloseTo(0.501, 3);
    expect(volumeToGain(0.5)).toBe(0.25);
    expect(volumeToGain(2)).toBe(1);
    const fadeIn = equalPowerCurve(0, 1, 9);
    const fadeOut = equalPowerCurve(1, 0, 9);
    for (let i = 0; i < 9; i++)
      expect((fadeIn[i] ?? 0) ** 2 + (fadeOut[i] ?? 0) ** 2).toBeCloseTo(1, 5);
  });

  it("the loop jump starts one crossfade before loopEnd", () => {
    const t = first(MUSIC_TRACKS);
    expect(isNearEnd(t, t.loopEnd - LOOP_CROSSFADE_S - 0.1)).toBe(false);
    expect(isNearEnd(t, t.loopEnd - LOOP_CROSSFADE_S)).toBe(true);
  });
});

/** A player that writes down what it was told. */
function fakePlayer() {
  const played: { id: string; at: number }[] = [];
  const spots = new Map<string, number>();
  let stops = 0;
  let nearEnd: (() => void) | null = null;
  const player: MusicPlayer = {
    install: () => () => {},
    setMix: () => {},
    play: (track, o) => {
      played.push({ id: track.id, at: o.at });
      nearEnd = o.onNearEnd ?? null;
    },
    stop: () => void stops++,
    setDampened: () => {},
    positionOf: (id) => spots.get(id) ?? null,
    forget: (id) => void spots.delete(id),
    onReady: () => {},
  };
  return { player, played, spots, stops: () => stops, end: () => nearEnd?.() };
}

describe("music controller", () => {
  const cue = (m: MusicCueMood, dampened = false): MusicCue => ({ mood: m, dampened });

  it("one battle song per trip; the next trip takes the next one", () => {
    const f = fakePlayer();
    const c = createMusicController(f.player);
    c.update(cue("battle"), 1);
    c.update(cue("battle", true), 1);
    c.update(cue("camp"), 1);
    c.update(cue("battle"), 2);
    const battles = f.played.filter((p) => p.id.startsWith("battle")).map((p) => p.id);
    expect(battles).toEqual(["battle-01", "battle-02"]);
  });

  it("the Camp goes on where it was; the boss starts fresh", () => {
    const f = fakePlayer();
    const c = createMusicController(f.player);
    const camp = first(tracksOf("camp"));
    const boss = first(tracksOf("boss"));
    f.spots.set(camp.id, 60);
    f.spots.set(boss.id, 90);
    c.update(cue("camp"), 0);
    c.update(cue("boss"), 1);
    expect(f.played).toEqual([
      { id: camp.id, at: 60 },
      { id: boss.id, at: boss.entry },
    ]);
  });

  it("the title plays its songs one after another; other moods loop", () => {
    const f = fakePlayer();
    const c = createMusicController(f.player);
    c.update(cue("title"), 0);
    f.end();
    f.end();
    expect(f.played.map((p) => p.id)).toEqual(["title-01", "title-02", "title-01"]);
    c.update(cue("boss"), 1);
    f.end();
    expect(f.played).toHaveLength(4);
  });

  it("silence stops, and refresh replays the song once sound is unlocked", () => {
    const f = fakePlayer();
    const c = createMusicController(f.player);
    c.update(cue("title"), 0);
    c.update(cue("silence"), 0);
    expect(f.stops()).toBe(1);
    c.refresh();
    expect(f.stops()).toBe(1);
    c.update(cue("title"), 0);
    c.refresh();
    expect(f.played.map((p) => p.id)).toEqual(["title-01", "title-02", "title-02"]);
  });
});
