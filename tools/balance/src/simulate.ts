import type { CombatantSetup, Side } from "@emberheir/sim";
import { runFight } from "@emberheir/sim";

export interface MatchupReport {
  readonly runs: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  /** Average fight length in seconds. */
  readonly avgDuration: number;
  /** Average hero life left after a win, as a fraction of max life. */
  readonly avgLifeLeftOnWin: number;
}

/** Runs `runs` fights with seeds `seed, seed + 1, ...` and summarizes them. */
export function simulateMatchup(
  hero: CombatantSetup,
  enemy: CombatantSetup,
  runs: number,
  seed: number,
): MatchupReport {
  const count: Record<Side | "draw", number> = { hero: 0, enemy: 0, draw: 0 };
  let duration = 0;
  let lifeLeft = 0;
  for (let i = 0; i < runs; i++) {
    const result = runFight(hero, enemy, seed + i);
    count[result.winner ?? "draw"]++;
    duration += result.duration;
    if (result.winner === "hero") lifeLeft += result.final.hero.life / result.final.hero.maxLife;
  }
  return {
    runs,
    wins: count.hero,
    losses: count.enemy,
    draws: count.draw,
    avgDuration: runs ? duration / runs : 0,
    avgLifeLeftOnWin: count.hero ? lifeLeft / count.hero : 0,
  };
}
