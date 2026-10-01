import { PROGRESSION } from "./constants";

/** XP needed to go from `level` to the next one; Infinity at the Level Cap. */
export function xpToNextLevel(level: number, cap: number = PROGRESSION.levelCap): number {
  if (level >= cap) return Infinity;
  return PROGRESSION.xpToNextLevel[level - 1] ?? Infinity;
}

/** −10 % XP per level the hero is above the enemy, at least 10 %. */
export function xpLevelFactor(heroLevel: number, monsterLevel: number): number {
  const gap = Math.max(0, heroLevel - monsterLevel);
  return Math.max(PROGRESSION.xpMinFactor, 1 - PROGRESSION.xpPenaltyPerLevel * gap);
}

export type EnemyRank = "normal" | "elite" | "boss";

const rankMultiplier = (rank: EnemyRank, key: "xp" | "gold" | "dust") =>
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

/** Gold and Salvage Dust every win gives automatically. */
export function autoRewards(
  monsterLevel: number,
  rank: EnemyRank,
): { readonly gold: number; readonly dust: number } {
  const steps = monsterLevel - 1;
  return {
    gold: Math.round(
      (PROGRESSION.goldBase + PROGRESSION.goldPerMonsterLevel * steps) *
        rankMultiplier(rank, "gold"),
    ),
    dust: Math.round(
      (PROGRESSION.dustBase + PROGRESSION.dustPerMonsterLevel * steps) *
        rankMultiplier(rank, "dust"),
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
  cap: number = PROGRESSION.levelCap,
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
