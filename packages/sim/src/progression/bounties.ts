import type { EnemyRank } from "./leveling";
import type { Rng } from "../rng";

/**
 * Bounties (entschlackung-v1.md): when the hero sets out, the Scout hands over one optional task
 * for this trip into the act. Done, it pays out right away; failed or abandoned, nothing is lost.
 * Content defines the bounties; this module rolls one and follows its progress.
 */

export type BountyGoal =
  /** Slay this many Elites. */
  | { readonly kind: "elites"; readonly count: number }
  /** Slay this many of one enemy of the act (picked when the bounty is handed out). */
  | { readonly kind: "slay"; readonly count: number }
  /** Catch the Ember Thief (it shows up more often while this bounty is open). */
  | { readonly kind: "thief" }
  /** Beat the act boss without drinking from the Ember Flask on this trip. */
  | { readonly kind: "bossNoFlask" }
  /** Beat the act boss with at least this share of Life left. */
  | { readonly kind: "bossHale"; readonly life: number };

export interface BountyDefinition {
  readonly id: string;
  readonly name: string;
  /** One line for the Scout and the run header: `#` is the count, `@` the enemy's name. */
  readonly text: string;
  readonly goal: BountyGoal;
  /** Acts it can be handed out in (by act number, both ends included). */
  readonly fromAct?: number;
  readonly toAct?: number;
}

export interface BountyState {
  readonly id: string;
  /** "slay": the enemy to hunt. */
  readonly enemyId?: string;
  readonly progress: number;
  readonly status: "open" | "done" | "failed";
}

/** What a won fight tells a bounty. */
export interface BountyWin {
  readonly rank: EnemyRank;
  readonly enemyId: string;
  /** The Ember Thief was caught. */
  readonly thiefCaught: boolean;
  /** Life left after the fight (0..1). */
  readonly lifeFraction: number;
}

/** How much of a goal has to be done. */
export function bountyTarget(goal: BountyGoal): number {
  return goal.kind === "elites" || goal.kind === "slay" ? goal.count : 1;
}

/** Bounties the Scout can hand out for an act. */
export function bountiesFor(
  defs: readonly BountyDefinition[],
  actNumber: number,
): BountyDefinition[] {
  return defs.filter(
    (d) => actNumber >= (d.fromAct ?? 1) && actNumber <= (d.toAct ?? Number.POSITIVE_INFINITY),
  );
}

/** Rolls the bounty of a trip; `enemies` are the act's stage enemies (for "slay"). */
export function rollBounty(
  defs: readonly BountyDefinition[],
  actNumber: number,
  enemies: readonly string[],
  rng: Rng,
): BountyState | undefined {
  const pool = bountiesFor(defs, actNumber).filter(
    (d) => d.goal.kind !== "slay" || enemies.length > 0,
  );
  if (pool.length === 0) return undefined;
  const def = pool[rng.int(0, pool.length - 1)];
  if (!def) return undefined;
  const enemyId = def.goal.kind === "slay" ? enemies[rng.int(0, enemies.length - 1)] : undefined;
  return { id: def.id, ...(enemyId ? { enemyId } : {}), progress: 0, status: "open" };
}

function advance(state: BountyState, goal: BountyGoal, by: number): BountyState {
  const progress = Math.min(bountyTarget(goal), state.progress + by);
  return { ...state, progress, status: progress >= bountyTarget(goal) ? "done" : "open" };
}

/** The bounty after a won fight. Only an open bounty moves. */
export function bountyAfterWin(state: BountyState, goal: BountyGoal, win: BountyWin): BountyState {
  if (state.status !== "open") return state;
  switch (goal.kind) {
    case "elites":
      return win.rank === "elite" ? advance(state, goal, 1) : state;
    case "slay":
      return win.rank !== "boss" && win.enemyId === state.enemyId ? advance(state, goal, 1) : state;
    case "thief":
      return win.thiefCaught ? advance(state, goal, 1) : state;
    case "bossNoFlask":
      return win.rank === "boss" ? advance(state, goal, 1) : state;
    case "bossHale":
      if (win.rank !== "boss") return state;
      return win.lifeFraction >= goal.life
        ? advance(state, goal, 1)
        : { ...state, status: "failed" };
  }
}

/** The bounty after a drink from the Ember Flask. */
export function bountyAfterFlask(state: BountyState, goal: BountyGoal): BountyState {
  return state.status === "open" && goal.kind === "bossNoFlask"
    ? { ...state, status: "failed" }
    : state;
}

/** The bounty's line with its numbers and enemy filled in. */
export function bountyText(def: BountyDefinition, enemyName?: string): string {
  const goal = def.goal;
  const count = String(bountyTarget(goal));
  const life = goal.kind === "bossHale" ? `${Math.round(goal.life * 100)} %` : "";
  return def.text
    .replace("#", count)
    .replace("@", enemyName ?? "")
    .replace("%", life);
}
