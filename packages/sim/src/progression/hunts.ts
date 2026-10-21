import type { Rng } from "../rng";

/**
 * Hunts (hunts-entwurf-v1.md, Längere Runs phase 4): every enemy has a hunt bar. Its kills
 * survive the fire; full tiers make the enemy a farming goal without new stats:
 *
 * The hunt sets how far the affixes of the enemy's items may roll (Timo): below tier II only in
 * the lowest of the three stages, at tier II up to the middle one, at tier III all of them. The
 * Item Level stays a second limit.
 *
 * - I Tracked: its Bestiary card, a few Acorns once.
 * - II Hunted: middle stage; one card of every item pick after a win over it carries one of its
 *   Signature Affixes (existing affixes, `GameData.huntSignatures`). A Warden: its trophy drops
 *   more often.
 * - III Mastered: all stages; that affix rolls in the best stage the Item Level allows.
 * - IV Apex (Timo, endgame): that affix drops as a Greater Affix (Greater I–V, 110–150 % of the
 *   tier's best roll). It takes a great many kills: a reason to farm in the Wildfire.
 *
 * The tiers are called Hunter's Marks in the game (Mark I–IV).
 */
export const HUNT = {
  /**
   * Kills for tiers I–IV per act (index = act number − 1, Timo: thresholds per act). The
   * early acts come back in every run, so their enemies need more kills.
   */
  actTiers: [
    [8, 25, 100, 300],
    [5, 15, 60, 180],
    [5, 15, 60, 180],
    [5, 15, 60, 180],
    [5, 15, 60, 180],
    [5, 15, 60, 180],
    [5, 12, 40, 120],
  ],
  /** The Ember Thief shows up in every act from Act 2. */
  thiefTiers: [3, 8, 20, 60],
  /** Wins over a Warden (act boss) for tiers I–IV. */
  bossTiers: [1, 3, 6, 15],
  /** An Elite or Gatekeeper counts this many kills, a Champion more. */
  eliteKills: 3,
  championKills: 5,
  /** A Hunt node on the act map: its quarry counts this many times. */
  nodeFactor: 2,
  /** Hunt nodes per map at most. */
  maxNodes: 2,
  /** Paid once when a tier fills (index = tier − 1). */
  rewards: [
    { acorns: 25, emberCoal: 0 },
    { acorns: 0, emberCoal: 2 },
    { acorns: 0, emberCoal: 0 },
    { acorns: 0, emberCoal: 0 },
  ],
  /** A hunted Warden (tier II) drops its trophy this often instead of `bossTrophyChance`. */
  bossTrophyChance: 0.25,
  /** Affix stages (of 3) the enemy's items may roll in, by hunt tier 0–IV. */
  stages: [1, 1, 2, 3, 3],
  /** Mark IV: weights of the Signature Affix's Greater rank I–V (low ranks likelier). */
  apexRanks: [5, 4, 3, 2, 1],
} as const;

export type HuntTier = 0 | 1 | 2 | 3 | 4;

/** Kills per enemy id (`LegacyState.hunts`). */
export type HuntKills = Readonly<Record<string, number>>;

/** Kills for tiers I–IV of one hunt. */
export type HuntThresholds = readonly number[];

/** What `huntThresholds` needs to know of the acts. */
interface HuntAct {
  readonly number: number;
  readonly enemies: readonly { readonly id: string }[];
  readonly boss: { readonly id: string };
}

/** The thresholds of an enemy's hunt: by its act, a Warden's own, the Ember Thief's own. */
export function huntThresholds(acts: readonly HuntAct[], enemyId: string): HuntThresholds {
  for (const act of acts) {
    if (act.boss.id === enemyId) return HUNT.bossTiers;
    if (act.enemies.some((e) => e.id === enemyId)) {
      return HUNT.actTiers[Math.min(act.number, HUNT.actTiers.length) - 1] ?? HUNT.thiefTiers;
    }
  }
  return HUNT.thiefTiers;
}

/** The tier a number of kills has reached. */
export function huntTier(kills: number, thresholds: HuntThresholds): HuntTier {
  return thresholds.filter((t) => kills >= t).length as HuntTier;
}

/** Kills the next tier needs in all, or `undefined` once the hunt is mastered. */
export function huntNextAt(kills: number, thresholds: HuntThresholds): number | undefined {
  return thresholds.find((t) => kills < t);
}

/** Affix stages the items of an enemy at this hunt tier may roll in. */
export function huntStages(tier: HuntTier): number {
  return HUNT.stages[tier];
}

/**
 * Affix stages of loot that no enemy dropped (Cache, Event, Marisha on the road, the Scout's
 * bounty): the act's least hunted enemy sets them, so there is no road around the hunt.
 */
export function actHuntStages(
  acts: readonly HuntAct[],
  act: HuntAct,
  kills: HuntKills,
): number {
  if (!act.enemies.length) return HUNT.stages[4];
  return Math.min(
    ...act.enemies.map((e) => huntStages(huntTier(kills[e.id] ?? 0, huntThresholds(acts, e.id)))),
  );
}

/** Kills a win counts for: Elites and Gatekeepers more, a Hunt node twice. */
export function huntKillsFor(
  win: { readonly elite: boolean; readonly champion?: boolean; readonly boss?: boolean },
  onHuntNode = false,
): number {
  const base = win.boss
    ? 1
    : win.champion
      ? HUNT.championKills
      : win.elite
        ? HUNT.eliteKills
        : 1;
  return base * (onHuntNode ? HUNT.nodeFactor : 1);
}

/** The enemy a Hunt node points at: the one with the fewest kills (ties by the dice). */
export function huntQuarry(enemyIds: readonly string[], kills: HuntKills, rng: Rng): string | undefined {
  if (!enemyIds.length) return undefined;
  const least = Math.min(...enemyIds.map((id) => kills[id] ?? 0));
  const open = enemyIds.filter((id) => (kills[id] ?? 0) === least);
  return open[rng.int(0, open.length - 1)];
}
