import { MONSTER_BAND_ENDS } from "../combat/monsters";
import { PROGRESSION } from "./constants";

/** Monster Level of the harvest boss of the run at a Prestige level: 10, 20, 30, 45, 60, 75, 90. */
export function bossLevel(prestige: number): number {
  const run = Math.max(0, Math.min(prestige, PROGRESSION.finalPrestige - 1));
  return MONSTER_BAND_ENDS[run] ?? PROGRESSION.maxLevel - PROGRESSION.levelHeadroom;
}

/**
 * Level Cap at a Prestige level (level-v2.md section 4): the run's boss level plus 10, so a wall
 * can be out-levelled by farming. 20, 30, 40, 55, 70, 85 and 100 in run 7. The final Prestige
 * adds none.
 */
export function levelCap(prestige: number): number {
  return Math.min(PROGRESSION.maxLevel, bossLevel(prestige) + PROGRESSION.levelHeadroom);
}

/** XP needed to go from `level` to the next one; Infinity at the Level Cap. */
export function xpToNextLevel(level: number, cap: number = levelCap(0)): number {
  if (level >= cap) return Infinity;
  return PROGRESSION.xpToNextLevel[level - 1] ?? Infinity;
}

/**
 * −10 % XP per level the hero is above the enemy, at least 10 %; +5 % per level the enemy is
 * above the hero, at most double, so a hero behind the Monster Level catches up.
 */
export function xpLevelFactor(heroLevel: number, monsterLevel: number): number {
  const gap = heroLevel - monsterLevel;
  if (gap < 0) return Math.min(PROGRESSION.xpMaxFactor, 1 - PROGRESSION.xpBonusPerLevel * gap);
  return Math.max(PROGRESSION.xpMinFactor, 1 - PROGRESSION.xpPenaltyPerLevel * gap);
}

export type EnemyRank = "normal" | "elite" | "boss";

const rankMultiplier = (rank: EnemyRank, key: "xp" | "acorns" | "ash") =>
  rank === "elite"
    ? PROGRESSION.eliteRewardMultiplier[key]
    : rank === "boss"
      ? PROGRESSION.bossRewardMultiplier[key]
      : 1;

/** XP for a kill. */
export function xpForKill(monsterLevel: number, rank: EnemyRank, heroLevel: number): number {
  const base = PROGRESSION.xpBase + PROGRESSION.xpPerMonsterLevel * (monsterLevel - 1);
  return Math.round(base * rankMultiplier(rank, "xp") * xpLevelFactor(heroLevel, monsterLevel));
}

/** Acorns and Ash every win gives automatically. */
export function autoRewards(
  monsterLevel: number,
  rank: EnemyRank,
): { readonly acorns: number; readonly ash: number } {
  const steps = monsterLevel - 1;
  return {
    acorns: Math.round(
      (PROGRESSION.acornsBase + PROGRESSION.acornsPerMonsterLevel * steps) *
        rankMultiplier(rank, "acorns"),
    ),
    ash: Math.round(
      (PROGRESSION.ashBase + PROGRESSION.ashPerMonsterLevel * steps) * rankMultiplier(rank, "ash"),
    ),
  };
}

/**
 * Adds XP and returns the new level and leftover XP. XP stops counting at the Level Cap.
 */
export function gainXp(
  level: number,
  xp: number,
  amount: number,
  cap: number = levelCap(0),
): { readonly level: number; readonly xp: number; readonly levelsGained: number } {
  let newLevel = level;
  let total = xp + amount;
  while (total >= xpToNextLevel(newLevel, cap)) {
    total -= xpToNextLevel(newLevel, cap);
    newLevel++;
  }
  if (newLevel >= cap) total = 0;
  return { level: newLevel, xp: total, levelsGained: newLevel - level };
}
