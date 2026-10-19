import { deriveStats, enemySetup, type GameData, type GameState } from "@emberheir/sim";
import { stageKind, type StageKind } from "./act";
import { heroPower } from "./gear-value";
import { quantile } from "./newest";

/**
 * The hero's power along the game (balancing-neustart-v1.md, step 3): at the first stage of
 * every act, every fifth stage and every boss, the autopilot's hero is measured (damage per
 * second at the dummy, effective Life) next to the enemy it meets. Monster Life and damage per
 * Monster Level follow these curves.
 */

export interface PowerSample {
  readonly generation: number;
  readonly act: number;
  readonly newest: boolean;
  readonly kind: StageKind;
  /** Monster Level of the stage. */
  readonly level: number;
  readonly heroLevel: number;
  readonly dps: number;
  readonly effectiveLife: number;
  readonly enemyLife: number;
  /** The enemy's damage multiplier (Monster Level, pressure, walls, Elite). */
  readonly enemyDamage: number;
}

/** A probe for `playGenerations`' `onFight`: collects samples into `out`. */
export function powerProbe(data: GameData, out: PowerSample[]) {
  return (state: GameState, generation: number, act: number): void => {
    const run = state.run;
    const encounter = run?.encounter;
    if (!run || !encounter) return;
    if (!encounter.boss && run.stage !== 1 && run.stage % 5 !== 0) return;
    const { dps, effectiveLife } = heroPower(state, data);
    const enemy = enemySetup(encounter, run.actId, data);
    out.push({
      generation,
      act,
      newest: act === generation,
      kind: stageKind(encounter),
      level: encounter.level,
      heroLevel: state.hero.level,
      dps,
      effectiveLife,
      enemyLife: deriveStats(enemy).maxLife,
      enemyDamage: enemy.damageMultiplier ?? 1,
    });
  };
}

export interface CurveRow {
  readonly from: number;
  readonly to: number;
  readonly samples: number;
  readonly heroLevel: number;
  readonly dps: number;
  readonly effectiveLife: number;
  /** Enemy Life ÷ hero damage per second (seconds at the dummy pace). */
  readonly lifeOverDps: number;
  /** Hero effective Life ÷ enemy damage multiplier. */
  readonly ehpOverDamage: number;
}

const median = (values: readonly number[]) =>
  quantile(
    [...values].sort((a, b) => a - b),
    0.5,
  );

/** Medians per Monster Level bucket of `width` levels. */
export function powerCurve(samples: readonly PowerSample[], width = 5): CurveRow[] {
  const buckets = new Map<number, PowerSample[]>();
  for (const s of samples) {
    const key = Math.floor((s.level - 1) / width);
    buckets.set(key, [...(buckets.get(key) ?? []), s]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([key, own]) => ({
      from: key * width + 1,
      to: key * width + width,
      samples: own.length,
      heroLevel: median(own.map((s) => s.heroLevel)),
      dps: median(own.map((s) => s.dps)),
      effectiveLife: median(own.map((s) => s.effectiveLife)),
      lifeOverDps: median(own.map((s) => s.enemyLife / s.dps)),
      ehpOverDamage: median(own.map((s) => s.effectiveLife / s.enemyDamage)),
    }));
}
