import type { Rng } from "../rng";
import type { BuffStat, TriggerEffect, TriggerSpec } from "../combat/types";
import { ITEMS } from "./constants";
import type {
  AffixDefinition,
  AffixStat,
  ItemBaseDefinition,
  ItemSlot,
  Rarity,
  TriggerAffixDefinition,
} from "./types";

/** Stats shown and rolled as percentages; everything else is a flat number. */
const PERCENT_STATS: ReadonlySet<AffixStat> = new Set<AffixStat>([
  "physicalDamage",
  "elementalDamage",
  "critChance",
  "triggerChance",
  "attackSpeed",
  "evasion",
  "blockChance",
  "allResistance",
  "fireResistance",
  "coldResistance",
  "lightningResistance",
  "voidResistance",
  "heatGain",
  "ailmentDuration",
  "tenacity",
  "lifesteal",
  "physicalPenetration",
  "elementalPenetration",
  "burnChance",
  "chillChance",
  "shockChance",
  "bleedChance",
  "poisonChance",
]);

export function isPercentStat(stat: AffixStat): boolean {
  return PERCENT_STATS.has(stat);
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/** Rounds percentages to 0.5 % and flat values to whole numbers (at least 1). */
export function roundStat(stat: AffixStat, value: number): number {
  if (isPercentStat(stat)) return Math.max(0.005, Number(roundTo(value, 0.005).toFixed(3)));
  return Math.max(1, Math.round(value));
}

/** Item Tier from Item Level: 1–10 = T1, 11–20 = T2, ... (capped at T10). */
export function tierForItemLevel(itemLevel: number): number {
  const tier = Math.ceil(Math.max(1, itemLevel) / ITEMS.itemLevelsPerTier);
  return Math.min(ITEMS.maxTier, tier);
}

/** How many affix stages (of 3) the Item Level unlocks inside its tier. */
export function unlockedStages(itemLevel: number): number {
  const level = Math.max(1, Math.min(itemLevel, ITEMS.itemLevelsPerTier * ITEMS.maxTier));
  const position = ((level - 1) % ITEMS.itemLevelsPerTier) + 1;
  return ITEMS.stageUnlockPositions.filter((p) => position >= p).length;
}

/**
 * Rolls an affix quality (0..1): picks one of the unlocked stages, then a spot inside it.
 * Magic items roll several times and keep the best.
 */
export function rollQuality(itemLevel: number, rarity: Rarity, rng: Rng): number {
  const stages = ITEMS.stageUnlockPositions.length;
  const unlocked = unlockedStages(itemLevel);
  const rolls = rarity === "magic" ? ITEMS.magicQualityRolls : 1;
  let best = 0;
  for (let i = 0; i < rolls; i++) {
    const stage = rng.int(0, unlocked - 1);
    best = Math.max(best, (stage + rng.next()) / stages);
  }
  return best;
}

/** Growth factor of a per-tier scaled value. */
export function tierGrowth(perTier: number, tier: number): number {
  return 1 + perTier * (Math.max(1, tier) - 1);
}

/** Raw (unrounded) value of an affix at a tier and quality. */
export function rawAffixValue(def: AffixDefinition, tier: number, quality: number): number {
  const q = Math.min(1, Math.max(0, quality));
  return (def.value.min + (def.value.max - def.value.min) * q) * tierGrowth(def.perTier, tier);
}

/** Final value of a stat affix at a tier and quality. */
export function statAffixValue(
  def: Extract<AffixDefinition, { kind: "stat" }>,
  tier: number,
  quality: number,
): number {
  return roundStat(def.stat, rawAffixValue(def, tier, quality));
}

const isPercentBuff = (stat: BuffStat) => isPercentStat(stat);

/** Turns a trigger affix into a concrete trigger with final numbers. */
export function resolveTrigger(
  def: TriggerAffixDefinition,
  tier: number,
  quality: number,
): TriggerSpec {
  const value = rawAffixValue(def, tier, quality);
  const magnitude = def.rolls === "magnitude" ? value : 1;
  const effect = resolveEffect(def, magnitude);
  return {
    id: def.id,
    name: def.name,
    condition: def.condition,
    chance: def.rolls === "chance" ? Math.min(1, roundTo(value, 0.01)) : (def.chance ?? 1),
    ...(def.cooldown !== undefined ? { cooldown: def.cooldown } : {}),
    ...(def.oncePerFight ? { oncePerFight: true } : {}),
    effect,
  };
}

function resolveEffect(def: TriggerAffixDefinition, magnitude: number): TriggerEffect {
  const t = def.effect;
  switch (t.kind) {
    case "weaponHit":
      return { kind: "weaponHit", multiplier: roundTo(magnitude, 0.05) };
    case "spellHit":
      return {
        kind: "spellHit",
        name: t.name,
        damage: {
          min: Math.max(1, Math.round(t.damage.min * magnitude)),
          max: Math.max(1, Math.round(t.damage.max * magnitude)),
        },
        damageType: t.damageType,
      };
    case "ailment":
      return { kind: "ailment", ailment: t.ailment };
    case "heal":
      return { kind: "heal", fraction: roundTo(magnitude, 0.01) };
    case "barrier":
      return { kind: "barrier", fraction: roundTo(magnitude, 0.01) };
    case "heat":
      return { kind: "heat", amount: Math.max(1, Math.round(magnitude)) };
    case "buff":
      return {
        kind: "buff",
        stat: t.stat,
        amount: isPercentBuff(t.stat) ? roundTo(magnitude, 0.01) : Math.round(magnitude),
        duration: t.duration,
        ...(t.maxStacks !== undefined ? { maxStacks: t.maxStacks } : {}),
      };
    case "extraAttack":
      return { kind: "extraAttack" };
  }
}

/** Roll weight of an affix on a base: affix weight × base weighting of each of its tags. */
export function affixWeight(def: AffixDefinition, base: ItemBaseDefinition): number {
  let weight = def.weight;
  for (const tag of def.tags) weight *= base.affixWeights?.[tag] ?? 1;
  return weight;
}

/** All affixes of a kind that can roll on a slot. */
export function affixPool(
  affixes: Iterable<AffixDefinition>,
  slot: ItemSlot,
  kind: AffixDefinition["kind"],
): AffixDefinition[] {
  return [...affixes].filter((a) => a.kind === kind && a.slots.includes(slot));
}
