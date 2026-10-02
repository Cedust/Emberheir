/**
 * Tuning numbers for the combat core. These are starting values for the balance CLI, not final
 * design. Percentages are fractions (0.01 = 1 %).
 */
export const COMBAT = {
  /** Simulation step in seconds (20 ticks per second). */
  tickSeconds: 0.05,
  /** Fights longer than this end as a draw. */
  maxFightSeconds: 300,

  heroBaseLife: 100,
  heroLifePerLevel: 12,

  // Attribute effects, per point (docs/design/stat-liste-v2.md section 1).
  lifePerVitality: 5,
  tenacityPerVitality: 0.005,
  physicalDamagePerStrength: 0.01,
  armorPerStrength: 1,
  baseCritChance: 0.05,
  critChancePerDexterity: 0.002,
  triggerChancePerDexterity: 0.005,
  attackSpeedPerAgility: 0.01,
  evasionPerAgility: 0.004,
  elementalDamagePerIntelligence: 0.01,
  allResistancePerIntelligence: 0.002,
  heatGainPerWisdom: 0.01,
  ailmentDurationPerWisdom: 0.01,

  /** Crit Damage is fixed and cannot be raised (anti power creep). */
  critMultiplier: 1.5,

  // Caps.
  maxEvasion: 0.5,
  maxBlockChance: 0.75,
  maxResistance: 0.75,
  maxTenacity: 0.75,
  maxArmorReduction: 0.9,
  /** Armor reduction = armor / (armor + armorConstantPerLevel × attacker level). */
  armorConstantPerLevel: 40,

  // Heat (docs/design/waffen-v1.md section 4).
  maxHeat: 100,
  warmingHeatPerSecond: 12,
  /** Cooling: Heat starts to decay after this long without landing a hit... */
  coolingGraceSeconds: 2,
  /** ...and then drains at this rate. */
  coolingDecayPerSecond: 20,
  /** Cooling: Heat per 1 % of max life lost to a hit, capped per hit. */
  heatPerPercentLifeTaken: 1,
  maxHeatFromHitTaken: 10,

  // Ailments.
  /** Burn deals this fraction of the triggering hit as damage per second. */
  burnDamagePerSecond: 0.25,
  burnDurationSeconds: 4,
  /** Burning fighters heal this much less. */
  burnHealingReduction: 0.5,
  chillDurationSeconds: 2,
  /** Chill: -X Attack Speed and -X Heat Gain. */
  chillSlow: 0.3,
  shockDurationSeconds: 3,
  /** Shock: target takes +X damage. */
  shockDamageTaken: 0.2,

  /** Spell skills gain this much base damage per skill level above 1. */
  spellDamagePerSkillLevel: 0.2,
  /** Attack skills gain this much damage per skill level above 1. */
  attackDamagePerSkillLevel: 0.1,
} as const;
