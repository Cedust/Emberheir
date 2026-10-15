import { mergeRules } from "../combat/rules";
import { sumBonuses } from "../combat/stats";
import type { CombatRules, StatBonuses } from "../combat/types";

/**
 * Ashborn (neuausrichtung-v1.md 7.3): the endgame's paragon. From level 100 on XP no longer
 * levels the hero but its Ashborn Level; each one gives a point for the four Ashborn Boards. At
 * most 100 points, at most 15 in one value, so no build maxes everything and the points go where
 * the build is weak. Distributed in the Character Sheet, reset at Old Nan for Acorns.
 */

export const ASHBORN_BOARDS = ["onslaught", "aegis", "mending", "ignite"] as const;
export type AshbornBoard = (typeof ASHBORN_BOARDS)[number];

/** What one point in a value gives; `points` multiplies it. */
export interface AshbornPerPoint {
  readonly bonuses?: StatBonuses;
  /** Heals this share of the damage the hero's ailments deal over time. */
  readonly dotLifesteal?: number;
  /** Barrier recharges this much faster (0.04 = +4 %). */
  readonly barrierRecharge?: number;
  /** Skills cost this much less Heat (0.01 = −1 %). */
  readonly skillCost?: number;
  /** Raises the cap of every Resistance. */
  readonly maxResistance?: number;
  /** One Flask charge heals this much more (0.03 = +3 %). */
  readonly flaskHeal?: number;
}

export interface AshbornValue {
  readonly id: string;
  readonly name: string;
  readonly board: AshbornBoard;
  /** One point in words, e.g. "+2 % Damage". */
  readonly text: string;
  readonly perPoint: AshbornPerPoint;
}

export interface AshbornState {
  /** Ashborn Level: one point each. */
  readonly level: number;
  /** XP towards the next Ashborn Level. */
  readonly xp: number;
  /** Points per value id. */
  readonly points: Readonly<Record<string, number>>;
}

export const ASHBORN = {
  /** XP turns into Ashborn from this hero level on (the last Level Cap). */
  fromLevel: 100,
  maxLevel: 100,
  maxPerValue: 15,
  /** XP of the first Ashborn Level; every further one costs `growth` of it more (linear). */
  baseXp: 12_000,
  growth: 0.04,
  /** Acorns Old Nan takes to give every point back. */
  resetAcorns: 2_000,
} as const;

export const EMPTY_ASHBORN: AshbornState = { level: 0, xp: 0, points: {} };

/** XP from Ashborn Level `level` to the next one; Infinity at the top. */
export function ashbornXpToNext(level: number): number {
  if (level >= ASHBORN.maxLevel) return Infinity;
  return Math.round(ASHBORN.baseXp * (1 + ASHBORN.growth * level));
}

/** XP into Ashborn Levels. */
export function gainAshbornXp(
  ashborn: AshbornState,
  amount: number,
): { readonly ashborn: AshbornState; readonly levelsGained: number } {
  let { level } = ashborn;
  let xp = ashborn.xp + amount;
  while (xp >= ashbornXpToNext(level)) {
    xp -= ashbornXpToNext(level);
    level++;
  }
  if (level >= ASHBORN.maxLevel) xp = 0;
  return { ashborn: { ...ashborn, level, xp }, levelsGained: level - ashborn.level };
}

export const ashbornSpent = (ashborn: AshbornState): number =>
  Object.values(ashborn.points).reduce((sum, n) => sum + n, 0);

export const ashbornUnspent = (ashborn: AshbornState): number =>
  Math.max(0, Math.min(ashborn.level, ASHBORN.maxLevel) - ashbornSpent(ashborn));

/** Why a point cannot go into this value now, or null. */
export function ashbornBlockReason(
  ashborn: AshbornState,
  values: readonly AshbornValue[],
  id: string,
): string | null {
  if (!values.some((v) => v.id === id)) return `Unknown Ashborn value "${id}"`;
  if (ashbornUnspent(ashborn) <= 0) return "No Ashborn Points left";
  if ((ashborn.points[id] ?? 0) >= ASHBORN.maxPerValue) {
    return `At most ${ASHBORN.maxPerValue} points in one value`;
  }
  return null;
}

const scaleBonuses = (b: StatBonuses | undefined, n: number): StatBonuses =>
  Object.fromEntries(Object.entries(b ?? {}).map(([k, v]) => [k, (v as number) * n]));

/** What the spent points do in a fight, and the Flask's extra healing. */
export function ashbornEffects(
  ashborn: AshbornState | undefined,
  values: readonly AshbornValue[],
): { readonly bonuses: StatBonuses; readonly rules: CombatRules; readonly flaskHeal: number } {
  const bonuses: StatBonuses[] = [];
  const rules: CombatRules[] = [];
  let flaskHeal = 1;
  for (const v of values) {
    const n = ashborn?.points[v.id] ?? 0;
    if (n <= 0) continue;
    const p = v.perPoint;
    bonuses.push(scaleBonuses(p.bonuses, n));
    if (p.dotLifesteal) rules.push({ dotLifesteal: p.dotLifesteal * n });
    if (p.barrierRecharge) rules.push({ barrierRecharge: 1 + p.barrierRecharge * n });
    if (p.skillCost) rules.push({ skillCostMultiplier: 1 - p.skillCost * n });
    if (p.maxResistance) {
      const m = p.maxResistance * n;
      rules.push({ maxResistance: { fire: m, cold: m, lightning: m, void: m } });
    }
    if (p.flaskHeal) flaskHeal += p.flaskHeal * n;
  }
  return { bonuses: sumBonuses(...bonuses), rules: mergeRules(...rules), flaskHeal };
}
