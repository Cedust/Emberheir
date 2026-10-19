import { COMBAT } from "./constants";
import { PERK } from "./perks";
import type { Attribute, Attributes, CombatantSetup, Element, StatBonuses } from "./types";

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
  /** Share of a blocked hit that the block stops. */
  readonly blockReduction: number;
  /**
   * Barrier (like Energy Shield): gear Barrier × (1 + Intelligence's share + % Barrier). Absorbs
   * damage before Life and recharges during the fight.
   */
  readonly barrier: number;
  /** All Resistance (from Intelligence and gear) before the element's own Resistance. */
  readonly resistance: number;
  /** Final Resistance per element: All Resistance + the element's own, capped. */
  readonly fireResistance: number;
  readonly coldResistance: number;
  readonly lightningResistance: number;
  readonly voidResistance: number;
  readonly heatGain: number;
  readonly startingHeat: number;
  /** Cooling: share of the Heat from hits taken. */
  readonly heatFromHitsTaken: number;
  readonly ailmentEffect: number;
  readonly tenacity: number;
  readonly lifesteal: number;
  readonly physicalPenetration: number;
  readonly elementalPenetration: number;
  readonly thorns: number;
  readonly burnChance: number;
  readonly chillChance: number;
  readonly shockChance: number;
  readonly corruptionChance: number;
  readonly bleedChance: number;
  readonly poisonChance: number;
}

export function heroBaseLife(level: number): number {
  return COMBAT.heroBaseLife * (1 + COMBAT.heroLevelGrowth.life) ** (level - 1);
}

/** Adds several bonus sets together. */
export function sumBonuses(...sets: readonly (StatBonuses | undefined)[]): Required<StatBonuses> {
  const total: Record<keyof StatBonuses, number> = {
    life: 0,
    increasedLife: 0,
    armor: 0,
    increasedArmor: 0,
    barrier: 0,
    increasedBarrier: 0,
    physicalDamage: 0,
    elementalDamage: 0,
    critChance: 0,
    triggerChance: 0,
    attackSpeed: 0,
    evasion: 0,
    blockChance: 0,
    allResistance: 0,
    fireResistance: 0,
    coldResistance: 0,
    lightningResistance: 0,
    voidResistance: 0,
    heatGain: 0,
    startingHeat: 0,
    heatFromHitsTaken: 0,
    ailmentEffect: 0,
    tenacity: 0,
    lifesteal: 0,
    physicalPenetration: 0,
    elementalPenetration: 0,
    thorns: 0,
    burnChance: 0,
    chillChance: 0,
    shockChance: 0,
    corruptionChance: 0,
    bleedChance: 0,
    poisonChance: 0,
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

/** What one point of an attribute gives, on the fighter's scale. */
interface AttributeSteps {
  readonly physicalDamage: number;
  readonly armor: number;
  readonly critChance: number;
  readonly triggerChance: number;
  readonly elementalDamage: number;
  /** % more Barrier per point. */
  readonly barrier: number;
  readonly allResistance: number;
  readonly attackSpeed: number;
  readonly evasion: number;
  readonly heatGain: number;
  readonly ailmentEffect: number;
  readonly tenacity: number;
}

const ZERO: Attributes = {
  strength: 0,
  dexterity: 0,
  intelligence: 0,
  agility: 0,
  wisdom: 0,
  vitality: 0,
};

/** Monsters: the old small steps, each attribute with its two fixed effects. */
function classicSteps(a: Attributes): AttributeSteps {
  return {
    physicalDamage: a.strength * COMBAT.physicalDamagePerStrength,
    armor: a.strength * COMBAT.armorPerStrength,
    critChance: a.dexterity * COMBAT.critChancePerDexterity,
    triggerChance: a.dexterity * COMBAT.triggerChancePerDexterity,
    elementalDamage: a.intelligence * COMBAT.elementalDamagePerIntelligence,
    barrier: 0,
    allResistance: a.intelligence * COMBAT.allResistancePerIntelligence,
    attackSpeed: a.agility * COMBAT.attackSpeedPerAgility,
    evasion: a.agility * COMBAT.evasionPerAgility,
    heatGain: a.wisdom * COMBAT.heatGainPerWisdom,
    ailmentEffect: a.wisdom * COMBAT.ailmentEffectPerWisdom,
    tenacity: a.vitality * COMBAT.tenacityPerVitality,
  };
}

/**
 * The hero (klassengeruest-v1.md 3): the class's main attribute gives % damage of every type,
 * STR Armor, DEX Evasion, INT Barrier for everyone; AGI speed and Crit, WIS Heat, ailments and
 * triggers, VIT Life and Tenacity. Armor and Barrier are % of the gear's.
 */
function heirSteps(a: Attributes, main: Attribute | undefined): AttributeSteps {
  const h = COMBAT.heir;
  const damage = main ? a[main] * h.damagePerMainAttribute : 0;
  return {
    physicalDamage: damage,
    elementalDamage: damage,
    armor: a.strength * h.armorPerStrength,
    evasion: a.dexterity * h.evasionPerDexterity,
    barrier: a.intelligence * h.barrierPerIntelligence,
    allResistance: a.intelligence * h.allResistancePerIntelligence,
    attackSpeed: a.agility * h.attackSpeedPerAgility,
    critChance: a.agility * h.critChancePerAgility,
    heatGain: a.wisdom * h.heatGainPerWisdom,
    ailmentEffect: a.wisdom * h.ailmentEffectPerWisdom,
    triggerChance: a.wisdom * h.triggerChancePerWisdom,
    tenacity: a.vitality * h.tenacityPerVitality,
  };
}

/** What the attributes give before bonuses (the character sheet shows these shares). */
export function attributeShares(
  attributes: Attributes = ZERO,
  scale: CombatantSetup["attributeScale"] = "classic",
  main?: Attribute,
): AttributeSteps {
  return scale === "heir" ? heirSteps(attributes, main) : classicSteps(attributes);
}

/**
 * Turns attributes plus bonuses into combat stats. Each attribute has exactly two effects
 * (docs/design/game-design-document-v1.md section 3). The hero ("heir" scale, attribute-v1.md)
 * gets big steps per point, Life and Armor as percentages; monsters keep the classic scale.
 */
export function deriveStats(setup: CombatantSetup): DerivedStats {
  const a: Attributes = setup.attributes;
  const b = sumBonuses(setup.weapon.implicit, setup.bonuses);
  const heir = setup.attributeScale === "heir";
  const step = attributeShares(a, setup.attributeScale, setup.mainAttribute);
  const perks = new Set(setup.perks ?? []);
  const baseLife = setup.baseLife ?? heroBaseLife(setup.level);
  const penalty = setup.resistancePenalty ?? 0;
  const allResistance = step.allResistance + b.allResistance - penalty;
  const capOf = (element: Element) =>
    COMBAT.maxResistance + (setup.rules?.maxResistance?.[element] ?? 0);
  const resist = (own: number, element: Element) => clamp(allResistance + own, 0, capOf(element));
  const life = heir
    ? (baseLife + b.life) * (1 + a.vitality * COMBAT.heir.lifePerVitality + b.increasedLife)
    : (baseLife + a.vitality * COMBAT.lifePerVitality + b.life) * (1 + b.increasedLife);
  const armor = heir
    ? b.armor * (1 + step.armor + b.increasedArmor)
    : (step.armor + b.armor) * (1 + b.increasedArmor);

  return {
    maxLife: Math.round(life * (setup.rules?.lifeMultiplier ?? 1)),
    armor,
    physicalDamage: step.physicalDamage + b.physicalDamage,
    elementalDamage: step.elementalDamage + b.elementalDamage,
    critChance: clamp(
      (COMBAT.baseCritChance + step.critChance + b.critChance) *
        (setup.rules?.critChanceMultiplier ?? 1),
      0,
      1,
    ),
    triggerChance: step.triggerChance + b.triggerChance,
    attackSpeed: setup.weapon.attacksPerSecond * (1 + step.attackSpeed + b.attackSpeed),
    evasion: clamp(step.evasion + b.evasion, 0, COMBAT.maxEvasion),
    blockChance: clamp(
      b.blockChance * (setup.weaponRules?.blockMultiplier ?? 1),
      0,
      COMBAT.maxBlockChance,
    ),
    blockReduction:
      COMBAT.blockReduction +
      (perks.has("stoneguard") ? PERK.stoneguardBlock : 0) +
      (setup.weaponRules?.blockReduction ?? 0),
    // Glass Cannon gives the Barrier up (its Default Attacks hit for part of it instead).
    barrier: setup.weaponRules?.glassCannon
      ? 0
      : Math.round(Math.max(0, b.barrier) * (1 + step.barrier + b.increasedBarrier)),
    resistance: clamp(allResistance, 0, COMBAT.maxResistance),
    fireResistance: resist(b.fireResistance, "fire"),
    coldResistance: resist(b.coldResistance, "cold"),
    lightningResistance: resist(b.lightningResistance, "lightning"),
    voidResistance: resist(b.voidResistance, "void"),
    heatGain: step.heatGain + b.heatGain,
    startingHeat: clamp(
      b.startingHeat + (perks.has("innerFire") ? PERK.innerFireHeat : 0),
      0,
      COMBAT.maxHeat,
    ),
    heatFromHitsTaken: Math.max(0, (setup.baseHeatFromHitsTaken ?? 1) + b.heatFromHitsTaken),
    ailmentEffect: step.ailmentEffect + b.ailmentEffect,
    tenacity: clamp(step.tenacity + b.tenacity, 0, COMBAT.maxTenacity),
    lifesteal: b.lifesteal,
    // Attuned (INT 4): Penetration of every type.
    physicalPenetration:
      b.physicalPenetration + (perks.has("attuned") ? PERK.attunedPenetration : 0),
    elementalPenetration:
      b.elementalPenetration + (perks.has("attuned") ? PERK.attunedPenetration : 0),
    thorns: b.thorns,
    burnChance: clamp(b.burnChance, 0, 1),
    chillChance: clamp(b.chillChance, 0, 1),
    shockChance: clamp(b.shockChance, 0, 1),
    corruptionChance: clamp(b.corruptionChance, 0, 1),
    bleedChance: clamp(b.bleedChance, 0, 1),
    poisonChance: clamp(b.poisonChance, 0, 1),
  };
}
