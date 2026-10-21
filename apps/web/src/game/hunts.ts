import { GAME_DATA, ITEM_CATALOG } from "@emberheir/content";
import {
  type EnemyDefinition,
  type GameState,
  HUNT,
  STAT_NAMES,
  huntNextAt,
  huntThresholds,
  huntTier,
} from "@emberheir/sim";

/** Hunts (hunts-entwurf-v1.md) in plain words: an enemy's Trail, its Hunt Affixes, the Bestiary. */

/** The Trails' names, by tier (0 = not tracked yet). */
export const TRAIL_NAMES = ["Untracked", "Tracked", "Hunted", "Cornered", "Apex"] as const;
export const TRAIL_NUMERALS = ["", "I", "II", "III", "IV"] as const;

/** What each Trail brings, for tooltips and the Bestiary. */
export const TRAIL_TEXT = [
  "",
  "Its Bestiary page. A few Acorns.",
  "One card of every item pick after a win carries one of its Hunt Affixes.",
  "Its Hunt Affix rolls in the best range the Item Level allows.",
  "Its Hunt Affix rolls past the top: a Greater Affix (110–150 %).",
] as const;

export const BOSS_TRAIL_TEXT = [
  "",
  "Its Bestiary page. A few Acorns.",
  `Its trophies drop more often (${Math.round(HUNT.bossTrophyChance * 100)} %).`,
  "A gold frame in the Bestiary.",
  "A burning frame in the Bestiary.",
] as const;

export interface HuntView {
  readonly enemyId: string;
  readonly kills: number;
  readonly tier: number;
  /** Kills for each Trail I–IV. */
  readonly scale: readonly number[];
  /** Kills the next Trail needs in all; missing at Apex. */
  readonly next?: number;
  /** Kills the current Trail started at (0 before Trail I). */
  readonly from: number;
  readonly boss: boolean;
  /** Its two Hunt Affixes by name (none for Wardens). */
  readonly affixes: readonly string[];
}

/** An affix's name for the Hunt texts ("Crit Chance"). */
export function affixName(id: string): string {
  const affix = ITEM_CATALOG.affixes.get(id);
  if (!affix) return id;
  return affix.kind === "stat" ? (STAT_NAMES[affix.stat] ?? affix.id) : affix.name;
}

export function huntView(state: GameState, enemyId: string, extraKills = 0): HuntView {
  const kills = (state.legacy.hunts?.[enemyId] ?? 0) + extraKills;
  const scale = huntThresholds(GAME_DATA.acts, enemyId);
  const tier = huntTier(kills, scale);
  const next = huntNextAt(kills, scale);
  return {
    enemyId,
    kills,
    tier,
    scale,
    ...(next !== undefined ? { next } : {}),
    from: tier > 0 ? (scale[tier - 1] ?? 0) : 0,
    boss: GAME_DATA.acts.some((a) => a.boss.id === enemyId),
    affixes: (GAME_DATA.huntSignatures?.[enemyId] ?? []).map(affixName),
  };
}

/** Every huntable enemy by act: its enemies and its Warden; the Ember Thief at the end. */
export function bestiary(): readonly {
  readonly act: string;
  readonly number: number;
  readonly enemies: readonly EnemyDefinition[];
}[] {
  const acts = GAME_DATA.acts.map((a) => ({
    act: a.name,
    number: a.number,
    enemies: [...a.enemies, a.boss],
  }));
  return GAME_DATA.thief
    ? [...acts, { act: "Everywhere", number: 0, enemies: [GAME_DATA.thief] }]
    : acts;
}

/** The act an enemy belongs to (0 for the Ember Thief). */
export function enemyAct(enemyId: string): number {
  return (
    GAME_DATA.acts.find((a) => a.boss.id === enemyId || a.enemies.some((e) => e.id === enemyId))
      ?.number ?? 0
  );
}

/** "Trail II · Hunted". */
export const trailTitle = (tier: number) =>
  tier > 0 ? `Trail ${TRAIL_NUMERALS[tier]} · ${TRAIL_NAMES[tier]}` : "Untracked";
