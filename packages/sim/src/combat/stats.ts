import { COMBAT } from "./constants";
import type { Attributes, CombatantSetup, StatBonuses } from "./types";

/** Final combat stats of a fighter, derived from attributes, weapon and bonuses. */
export interface DerivedStats {
  readonly maxLife: number;
  readonly armor: number;
  readonly physicalDamage: number;
  readonly elementalDamage: number;
  readonly critChance: number;
  readonly triggerChance: number;
  /** Default Attacks per second. */
  readonly attackSpeed: number;
  readonly evasion: number;
  readonly blockChance: number;
  readonly blockValue: number;
  readonly resistance: number;
  readonly heatGain: number;
  readonly startingHeat: number;
  readonly ailmentDuration: number;
  readonly tenacity: number;
  readonly lifesteal: number;
  readonly physicalPenetration: number;
  readonly elementalPenetration: number;
  readonly thorns: number;
  readonly burnChance: number;
  readonly chillChance: number;
  readonly shockChance: number;
}

export function heroBaseLife(level: number): number {
  return COMBAT.heroBaseLife + COMBAT.heroLifePerLevel * (level - 1);
}

/** Adds several bonus sets together. */
export function sumBonuses(...sets: readonly (StatBonuses | undefined)[]): Required<StatBonuses> {
  const total: Record<keyof StatBonuses, number> = {
    life: 0,
    armor: 0,
    physicalDamage: 0,
    elementalDamage: 0,
    critChance: 0,
    triggerChance: 0,
    attackSpeed: 0,
    evasion: 0,
    blockChance: 0,
    blockValue: 0,
    allResistance: 0,
    heatGain: 0,
    startingHeat: 0,
    ailmentDuration: 0,
    tenacity: 0,
    lifesteal: 0,
    physicalPenetration: 0,
    elementalPenetration: 0,
    thorns: 0,
    burnChance: 0,
    chillChance: 0,
    shockChance: 0,
  };
  for (const set of sets) {
    if (!set) continue;
    for (const key of Object.keys(total) as (keyof StatBonuses)[]) {
      total[key] += set[key] ?? 0;
    }
  }
  return total;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Turns attributes plus bonuses into combat stats. Each attribute has exactly two effects
 * (docs/design/game-design-document-v1.md section 3).
 */
export function deriveStats(setup: CombatantSetup): DerivedStats {
  const a: Attributes = setup.attributes;
  const b = sumBonuses(setup.weapon.implicit, setup.bonuses);
  const baseLife = setup.baseLife ?? heroBaseLife(setup.level);

  return {
    maxLife: Math.round(baseLife + a.vitality * COMBAT.lifePerVitality + b.life),
    armor: a.strength * COMBAT.armorPerStrength + b.armor,
    physicalDamage: a.strength * COMBAT.physicalDamagePerStrength + b.physicalDamage,
    elementalDamage: a.intelligence * COMBAT.elementalDamagePerIntelligence + b.elementalDamage,
    critChance: clamp(
      COMBAT.baseCritChance + a.dexterity * COMBAT.critChancePerDexterity + b.critChance,
      0,
      1,
    ),
    triggerChance: a.dexterity * COMBAT.triggerChancePerDexterity + b.triggerChance,
    attackSpeed:
      setup.weapon.attacksPerSecond *
      (1 + a.agility * COMBAT.attackSpeedPerAgility + b.attackSpeed),
    evasion: clamp(a.agility * COMBAT.evasionPerAgility + b.evasion, 0, COMBAT.maxEvasion),
    blockChance: clamp(b.blockChance, 0, COMBAT.maxBlockChance),
    blockValue: b.blockValue,
    resistance: clamp(
      a.intelligence * COMBAT.allResistancePerIntelligence + b.allResistance,
      0,
      COMBAT.maxResistance,
    ),
    heatGain: a.wisdom * COMBAT.heatGainPerWisdom + b.heatGain,
    startingHeat: clamp(b.startingHeat, 0, COMBAT.maxHeat),
    ailmentDuration: a.wisdom * COMBAT.ailmentDurationPerWisdom + b.ailmentDuration,
    tenacity: clamp(a.vitality * COMBAT.tenacityPerVitality + b.tenacity, 0, COMBAT.maxTenacity),
    lifesteal: b.lifesteal,
    physicalPenetration: b.physicalPenetration,
    elementalPenetration: b.elementalPenetration,
    thorns: b.thorns,
    burnChance: clamp(b.burnChance, 0, 1),
    chillChance: clamp(b.chillChance, 0, 1),
    shockChance: clamp(b.shockChance, 0, 1),
  };
}
