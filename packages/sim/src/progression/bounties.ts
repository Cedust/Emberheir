import type { EnemyRank } from "./leveling";
import { huntNextAt, type HuntKills, type HuntThresholds } from "./hunts";
import type { Rng } from "../rng";

/**
 * Bounties (bounties-v2-plan.md): when the hero sets out, Eldrin offers two optional tasks for
 * this trip into the act, and the hero takes one (or none). Done, it is paid in the Camp as
 * Eldrin's Cache; failed or abandoned, nothing is lost. Content defines the bounties; this module
 * rolls the offer and follows a bounty's progress.
 */

export type BountyGoal =
  /** Slay this many Elites; Gatekeepers do not count (the act map has Elite nodes). */
  | { readonly kind: "elites"; readonly count: number }
  /** Slay one enemy of the act a number of times: the one whose next Trail is closest. */
  | { readonly kind: "trail" }
  /** Catch the Ember Thief before it flees (it shows up more often while this bounty is open). */
  | { readonly kind: "thief" }
  /** Beat the act boss without drinking from the Ember Flask on this trip. */
  | { readonly kind: "bossNoFlask" };

/** What a bounty adds to Eldrin's Cache on top of the Home Rune and the item pick. */
export type BountyBonus =
  /** Ember Coal (min and max). */
  | { readonly kind: "emberCoal"; readonly min: number; readonly max: number }
  /** Trail kills on the bounty's enemy; one card of the pick carries its Hunt Affix. */
  | { readonly kind: "trail"; readonly kills: number }
  /** A hoard like the Ember Thief's: more cards and this many picks. */
  | { readonly kind: "picks"; readonly picks: number }
  /** Every card of the pick one rarity higher (inside the run's loot window). */
  | { readonly kind: "rarity" };

export interface BountyDefinition {
  readonly id: string;
  readonly name: string;
  /** One line for Eldrin and the run header: `#` is the count, `@` the enemy's name. */
  readonly text: string;
  readonly goal: BountyGoal;
  readonly bonus: BountyBonus;
  /** Acts it can be offered in (by act number, both ends included). */
  readonly fromAct?: number;
  readonly toAct?: number;
}

export interface BountyState {
  readonly id: string;
  /** "trail": the enemy to hunt. */
  readonly enemyId?: string;
  /** "trail": how many kills it asks for. */
  readonly count?: number;
  readonly progress: number;
  readonly status: "open" | "done" | "failed";
}

/** What a won fight tells a bounty. */
export interface BountyWin {
  readonly rank: EnemyRank;
  readonly enemyId: string;
  /** The Ember Thief was caught. */
  readonly thiefCaught: boolean;
  /** A Gatekeeper of a Waymark (not an Elite for "elites"). */
  readonly gate?: boolean;
}

/** A Trail Hunt asks for this many kills at least and at most. */
export const TRAIL_BOUNTY_KILLS = { min: 4, max: 8 } as const;

/** How much of a goal has to be done. */
export function bountyTarget(goal: BountyGoal, state?: Pick<BountyState, "count">): number {
  if (goal.kind === "elites") return goal.count;
  if (goal.kind === "trail") return state?.count ?? TRAIL_BOUNTY_KILLS.min;
  return 1;
}

/** Bounties Eldrin can offer for an act. */
export function bountiesFor(
  defs: readonly BountyDefinition[],
  actNumber: number,
): BountyDefinition[] {
  return defs.filter(
    (d) => actNumber >= (d.fromAct ?? 1) && actNumber <= (d.toAct ?? Number.POSITIVE_INFINITY),
  );
}

/**
 * The quarry of a Trail Hunt: the act's enemy whose next Trail needs the fewest kills (ties by
 * the dice), and how many kills the bounty asks for. None once every Trail is at its top.
 */
export function trailQuarry(
  enemyIds: readonly string[],
  kills: HuntKills,
  thresholds: (enemyId: string) => HuntThresholds,
  rng: Rng,
): { readonly enemyId: string; readonly count: number } | undefined {
  const left = enemyIds.flatMap((enemyId) => {
    const have = kills[enemyId] ?? 0;
    const next = huntNextAt(have, thresholds(enemyId));
    return next === undefined ? [] : [{ enemyId, need: next - have }];
  });
  if (!left.length) return undefined;
  const fewest = Math.min(...left.map((l) => l.need));
  const closest = left.filter((l) => l.need === fewest);
  const pick = closest[rng.int(0, closest.length - 1)];
  if (!pick) return undefined;
  const count = Math.max(TRAIL_BOUNTY_KILLS.min, Math.min(TRAIL_BOUNTY_KILLS.max, pick.need));
  return { enemyId: pick.enemyId, count };
}

/**
 * Eldrin's offer for an act: up to `size` different bounties. A Trail Hunt needs a quarry; the
 * caller finds it (`trailQuarry`) and passes it in.
 */
export function rollBountyOffer(
  defs: readonly BountyDefinition[],
  actNumber: number,
  quarry: { readonly enemyId: string; readonly count: number } | undefined,
  rng: Rng,
  size = 2,
): BountyState[] {
  const pool = bountiesFor(defs, actNumber).filter((d) => d.goal.kind !== "trail" || quarry);
  const offer: BountyState[] = [];
  while (offer.length < size && pool.length) {
    const [def] = pool.splice(rng.int(0, pool.length - 1), 1);
    if (!def) break;
    offer.push({
      id: def.id,
      ...(def.goal.kind === "trail" && quarry ? quarry : {}),
      progress: 0,
      status: "open",
    });
  }
  return offer;
}

function advance(state: BountyState, goal: BountyGoal, by: number): BountyState {
  const target = bountyTarget(goal, state);
  const progress = Math.min(target, state.progress + by);
  return { ...state, progress, status: progress >= target ? "done" : "open" };
}

/** The bounty after a won fight. Only an open bounty moves. */
export function bountyAfterWin(state: BountyState, goal: BountyGoal, win: BountyWin): BountyState {
  if (state.status !== "open") return state;
  switch (goal.kind) {
    case "elites":
      return win.rank === "elite" && !win.gate ? advance(state, goal, 1) : state;
    case "trail":
      return win.rank !== "boss" && win.enemyId === state.enemyId ? advance(state, goal, 1) : state;
    case "thief":
      return win.thiefCaught ? advance(state, goal, 1) : state;
    case "bossNoFlask":
      return win.rank === "boss" ? advance(state, goal, 1) : state;
  }
}

/** The bounty after a drink from the Ember Flask. */
export function bountyAfterFlask(state: BountyState, goal: BountyGoal): BountyState {
  return state.status === "open" && goal.kind === "bossNoFlask"
    ? { ...state, status: "failed" }
    : state;
}

/** The bounty's line with its numbers and enemy filled in. */
export function bountyText(
  def: BountyDefinition,
  enemyName?: string,
  state?: Pick<BountyState, "count">,
): string {
  return def.text.replace("#", String(bountyTarget(def.goal, state))).replace("@", enemyName ?? "");
}
