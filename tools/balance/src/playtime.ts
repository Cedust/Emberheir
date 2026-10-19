import type { ActRunReport } from "./act";

/**
 * Time a player spends besides the fights (laengere-runs-v1.md): picking loot, cards and routes
 * after every fight, and gear, tree and crafting in the Camp before every trip. Rough values from
 * playtests; they turn the simulated fight seconds into playtime.
 */
export const PLAYTIME = { perFight: 12, perTrip: 90 };

/** Minutes a player spends on one act report: fights, the time between them and the trips. */
export function reportMinutes(r: ActRunReport): number {
  const fights = r.stageFights.reduce((sum, f) => sum + f.seconds, 0);
  const trips = r.deaths + 1;
  return (fights + PLAYTIME.perFight * r.stageFights.length + PLAYTIME.perTrip * trips) / 60;
}

/** Median of a list (0 when empty). */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/**
 * Playtime per run (generation) for each build: all acts of the run, averaged over the build's
 * seeds. A build stuck in an act counts only the attempts it made, so its time is too low.
 */
export function runMinutes(
  reports: readonly ActRunReport[],
  generation: number,
  seeds: number,
): number {
  const own = reports.filter((r) => r.generation === generation);
  return own.reduce((sum, r) => sum + reportMinutes(r), 0) / Math.max(1, seeds);
}
