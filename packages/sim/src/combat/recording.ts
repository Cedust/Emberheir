import { COMBAT } from "./constants";
import type { CombatEvent, FightResult, FightSnapshot } from "./events";
import { Fight } from "./fight";
import { type FightReport, fightReport } from "./report";
import type { CombatantSetup, Side } from "./types";

/**
 * A fight simulated to the end in one go, with what the arena needs to play it back: the
 * snapshot after every tick and where each tick's events end in the log.
 *
 * The game simulates each fight once, when it starts (`fightRecording` in the game loop). The
 * outcome is fixed from then on; the Battle view only plays the recording back at its own pace
 * (`FightReplay`), and resolving the fight reads the stored outcome instead of simulating again.
 */
export interface FightRecording {
  readonly result: FightResult;
  readonly outcome: FightOutcome;
  /** `frames[i]` is the fight after `i` ticks; `frames[0]` is the fight before it starts. */
  readonly frames: readonly FightSnapshot[];
  /** `eventEnds[i]`: the events of the log that have happened by `frames[i]`. */
  readonly eventEnds: readonly number[];
}

/** What the game loop keeps of a fight (it goes into the save game). */
export interface FightOutcome {
  readonly winner: Side | null;
  readonly fled: Side | null;
  /** Fight length in seconds. */
  readonly duration: number;
  /** The hero's Life afterwards, as a fraction of Max Life. */
  readonly heroLife: number;
  readonly report: FightReport;
}

export function outcomeOf(result: FightResult): FightOutcome {
  const hero = result.final.hero;
  return {
    winner: result.winner,
    fled: result.fled,
    duration: result.duration,
    heroLife: hero.maxLife > 0 ? Math.max(0, hero.life / hero.maxLife) : 0,
    report: fightReport(result.events),
  };
}

/** Simulates a whole fight and keeps every tick for the playback. */
export function recordFight(
  hero: CombatantSetup,
  enemy: CombatantSetup,
  seed: number,
): FightRecording {
  const fight = new Fight(hero, enemy, seed);
  const frames: FightSnapshot[] = [fight.snapshot()];
  const eventEnds: number[] = [0];
  while (!fight.over) {
    fight.step();
    frames.push(fight.snapshot());
    eventEnds.push(fight.events.length);
  }
  const result: FightResult = {
    winner: fight.winner,
    fled: fight.fled,
    duration: fight.time,
    events: fight.events,
    final: fight.snapshot(),
  };
  return { result, outcome: outcomeOf(result), frames, eventEnds };
}

/**
 * Plays a recorded fight back in real time. Same pacing as `Fight.advance` (a call shorter than
 * a tick shows no tick or one, never one per call), but nothing is simulated any more.
 */
export class FightReplay {
  private frame = 0;
  /** Fight time asked for by `advance` so far. */
  private requested = 0;

  constructor(readonly recording: FightRecording) {}

  private get last(): number {
    return this.recording.frames.length - 1;
  }

  get time(): number {
    return this.snapshot().time;
  }

  get over(): boolean {
    return this.frame >= this.last;
  }

  /** The outcome, known from the start; the playback has not necessarily reached it. */
  get outcome(): FightOutcome {
    return this.recording.outcome;
  }

  /** The events played so far. */
  get events(): readonly CombatEvent[] {
    return this.recording.result.events.slice(0, this.eventEnd);
  }

  private get eventEnd(): number {
    return this.recording.eventEnds[this.frame] ?? 0;
  }

  snapshot(): FightSnapshot {
    const snap = this.recording.frames[this.frame];
    if (!snap) throw new Error("Empty fight recording");
    return snap;
  }

  private moveTo(frame: number): readonly CombatEvent[] {
    const start = this.eventEnd;
    this.frame = Math.min(frame, this.last);
    return this.recording.result.events.slice(start, this.eventEnd);
  }

  /** Plays `seconds` more of the fight; returns the events that happened meanwhile. */
  advance(seconds: number): readonly CombatEvent[] {
    this.requested = Math.max(this.requested, this.time - COMBAT.tickSeconds) + seconds;
    let frame = this.frame;
    const frames = this.recording.frames;
    while (frame < this.last && (frames[frame]?.time ?? Infinity) + 1e-9 < this.requested) {
      frame++;
    }
    return this.moveTo(frame);
  }

  /** Jumps to the end (Skip); returns the events skipped over. */
  skipToEnd(): readonly CombatEvent[] {
    return this.moveTo(this.last);
  }
}
