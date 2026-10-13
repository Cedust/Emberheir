import type { Fight } from "./fight";
import { type FightReport, fightReport } from "./report";
import type { Side } from "./types";

/** What the game loop keeps of a finished fight. */
export interface FightOutcome {
  readonly winner: Side | null;
  readonly fled: Side | null;
  /** Fight length in seconds. */
  readonly duration: number;
  /** The hero's Life afterwards, as a fraction of Max Life. */
  readonly heroLife: number;
  readonly report: FightReport;
}

/** The outcome of a fight that is over. */
export function outcomeOf(fight: Fight): FightOutcome {
  if (!fight.over) throw new Error("The fight is not over yet");
  const hero = fight.snapshot().hero;
  return {
    winner: fight.winner,
    fled: fight.fled,
    duration: fight.time,
    heroLife: hero.maxLife > 0 ? Math.max(0, hero.life / hero.maxLife) : 0,
    report: fightReport(fight.events),
  };
}
