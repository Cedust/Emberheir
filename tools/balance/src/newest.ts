import { type ActRunReport, STAGE_KINDS, type StageKind } from "./act";

/**
 * Where the hero dies and how long fights take, per stage kind (neuausrichtung-v1.md 5.3, 5.5).
 * The targets are the acceptance test of the Sägezahn: deaths spread over the act, fights long
 * enough to watch the build.
 */

type Range = readonly [number, number];

/** Share of the deaths in the newest act per stage kind (5.3). */
export const DEATH_TARGETS: Readonly<Record<StageKind, Range>> = {
  normal: [0.05, 0.15],
  elite: [0.1, 0.2],
  gate: [0.2, 0.3],
  boss: [0.35, 0.55],
};

/** Attempts per newest act (deaths + 1): Timo's target with Runes in the game (13.10.). */
export const ATTEMPT_TARGET: Range = [3, 5];

/** Fight length in seconds per stage kind (5.5). */
export const SECONDS_TARGETS: Readonly<Record<StageKind, Range>> = {
  normal: [20, 30],
  elite: [35, 50],
  gate: [45, 70],
  boss: [60, 100],
};

export interface KindSummary {
  readonly fights: number;
  readonly deaths: number;
  /** Share of all deaths in the reports. */
  readonly deathShare: number;
  readonly medianSeconds: number;
  readonly p90Seconds: number;
}

export interface StageKindSummary {
  readonly runs: number;
  readonly clearRate: number;
  /** Attempts per act (deaths + 1) of the cleared ones. */
  readonly avgAttempts: number;
  readonly deaths: number;
  readonly kinds: Readonly<Record<StageKind, KindSummary>>;
}

/** Value at quantile `q` (0..1) of an ascending list; 0 for an empty one. */
export function quantile(sorted: readonly number[], q: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
}

/** The newest act of each run: Act n in run n (the finale and the Wildfire are their own). */
export function isNewestAct(report: ActRunReport): boolean {
  return report.act === report.generation;
}

export function summarizeStageKinds(reports: readonly ActRunReport[]): StageKindSummary {
  const fights = reports.flatMap((r) => r.stageFights);
  const deaths = fights.filter((f) => f.died).length;
  const kinds = Object.fromEntries(
    STAGE_KINDS.map((kind) => {
      const own = fights.filter((f) => f.kind === kind);
      const seconds = own.map((f) => f.seconds).sort((a, b) => a - b);
      const lost = own.filter((f) => f.died).length;
      return [
        kind,
        {
          fights: own.length,
          deaths: lost,
          deathShare: deaths ? lost / deaths : 0,
          medianSeconds: quantile(seconds, 0.5),
          p90Seconds: quantile(seconds, 0.9),
        },
      ];
    }),
  ) as Record<StageKind, KindSummary>;
  const cleared = reports.filter((r) => r.cleared);
  return {
    runs: reports.length,
    clearRate: reports.length ? cleared.length / reports.length : 0,
    avgAttempts: cleared.length
      ? cleared.reduce((n, r) => n + r.deaths + 1, 0) / cleared.length
      : 0,
    deaths,
    kinds,
  };
}

/** "✓" inside the target, "↑" below it (should go up), "↓" above it. */
export function targetMark(value: number, [low, high]: Range): string {
  if (value < low) return "↑";
  if (value > high) return "↓";
  return "✓";
}

/** One table row: attempts, death shares and fight lengths per stage kind. */
export function stageKindRow(s: StageKindSummary, marks: boolean): Record<string, string> {
  const row: Record<string, string> = {
    runs: String(s.runs),
    "cleared %": (s.clearRate * 100).toFixed(0),
    attempts: marks
      ? `${s.avgAttempts.toFixed(1)} ${targetMark(s.avgAttempts, ATTEMPT_TARGET)}`
      : s.avgAttempts.toFixed(1),
    deaths: String(s.deaths),
  };
  for (const kind of STAGE_KINDS) {
    const k = s.kinds[kind];
    const share = (k.deathShare * 100).toFixed(0);
    row[`% deaths ${kind}`] =
      marks && s.deaths ? `${share} ${targetMark(k.deathShare, DEATH_TARGETS[kind])}` : share;
  }
  for (const kind of STAGE_KINDS) {
    const k = s.kinds[kind];
    const text = k.fights ? `${k.medianSeconds.toFixed(0)} / ${k.p90Seconds.toFixed(0)}` : "-";
    row[`${kind} s med/p90`] =
      marks && k.fights ? `${text} ${targetMark(k.medianSeconds, SECONDS_TARGETS[kind])}` : text;
  }
  return row;
}
