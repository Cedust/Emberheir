import type { Rng } from "../rng";

/**
 * Hunts (hunts-entwurf-v1.md, Längere Runs phase 4): every enemy has a hunt bar. Its kills
 * survive the fire, and each full tier makes the enemy more worth farming.
 *
 * Item Tier and Item Level still set every affix's range. Only the enemy's own Hunt Affix (one
 * of its two Signature Affixes, `GameData.huntSignatures`) rolls better with its Trail (Timo):
 *
 * - I Tracked: its Bestiary card, a few Acorns once.
 * - II Hunted: one card of every item pick after a win over it carries a Hunt Affix. A Warden:
 *   its trophy drops more often.
 * - III Cornered: the Hunt Affix rolls in the best stage the Item Level allows.
 * - IV Apex (endgame): the Hunt Affix rolls past the top, as a Greater Affix (Greater I–V,
 *   110–150 % of the tier's best roll). It takes a great many kills: a reason to farm in the
 *   Wildfire.
 *
 * The tiers are called Trails in the game (Trail I–IV).
 */
export const HUNT = {
  /**
   * Kills for tiers I–IV per act (index = act number − 1, Timo: thresholds per act). The
   * early acts come back in every run, so their enemies need more kills.
   */
  actTiers: [
    [10, 25, 100, 300],
    [5, 15, 60, 200],
    [5, 15, 60, 200],
    [5, 15, 60, 200],
    [5, 15, 60, 200],
    [5, 15, 60, 200],
    [5, 10, 40, 100],
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

/** Kills a win counts for: Elites and Gatekeepers more, a Hunt node twice. */
export function huntKillsFor(
  win: { readonly elite: boolean; readonly champion?: boolean; readonly boss?: boolean },
  onHuntNode = false,
): number {
  const base = win.boss ? 1 : win.champion ? HUNT.championKills : win.elite ? HUNT.eliteKills : 1;
  return base * (onHuntNode ? HUNT.nodeFactor : 1);
}

/** The enemy a Hunt node points at: the one with the fewest kills (ties by the dice). */
export function huntQuarry(
  enemyIds: readonly string[],
  kills: HuntKills,
  rng: Rng,
): string | undefined {
  if (!enemyIds.length) return undefined;
  const least = Math.min(...enemyIds.map((id) => kills[id] ?? 0));
  const open = enemyIds.filter((id) => (kills[id] ?? 0) === least);
  return open[rng.int(0, open.length - 1)];
}
