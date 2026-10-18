/** A Mighty Hit rolls at least this share of Weapon Damage (weapon-mastery-v2.md 1.2). */
export const MIGHTY_SHARE = 1.25;

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
  /**
   * The hero's own growth per level (level-v2.md section 5): Base Life and Weapon Damage grow by
   * these shares per level, compounding. About +7 % fighting power per level.
   */
  heroLevelGrowth: { life: 0.04, damage: 0.03 },

  // Attribute effects per point of monsters ("classic" scale, docs/design/stat-liste-v2.md).
  lifePerVitality: 5,
  tenacityPerVitality: 0.005,
  physicalDamagePerStrength: 0.01,
  armorPerStrength: 1,
  baseCritChance: 0.05,
  critChancePerDexterity: 0.002,
  triggerChancePerDexterity: 0.005,
  /** Playtest 2: halved, so Attack Speed grows slowly over the game. */
  attackSpeedPerAgility: 0.005,
  evasionPerAgility: 0.004,
  elementalDamagePerIntelligence: 0.01,
  allResistancePerIntelligence: 0.002,
  heatGainPerWisdom: 0.01,
  /** Monsters keep their ailments as they are (Ailment Effect is the hero's value). */
  ailmentEffectPerWisdom: 0,

  /**
   * The hero's attributes (attribute-v1.md section 3): 1–10 points, each worth a lot. Life and
   * Armor are percentages so they keep mattering at every level.
   */
  heir: {
    /**
     * Klassengerüst v1 (klassengeruest-v1.md 3): the class's main attribute (Cinderguard STR,
     * Ashstrider DEX, Emberseer INT) gives % damage of every type; the other two damage
     * attributes give nothing to damage. Each of STR, DEX and INT also gives one defense layer.
     */
    damagePerMainAttribute: 0.08,
    armorPerStrength: 0.06,
    evasionPerDexterity: 0.02,
    /** % more Barrier per Intelligence point (the Barrier itself comes from gear). */
    barrierPerIntelligence: 0.08,
    // Resistance comes from gear for every class (Timo, PoE rule).
    allResistancePerIntelligence: 0,
    attackSpeedPerAgility: 0.03,
    critChancePerAgility: 0.015,
    heatGainPerWisdom: 0.06,
    ailmentEffectPerWisdom: 0.05,
    triggerChancePerWisdom: 0.04,
    lifePerVitality: 0.06,
    tenacityPerVitality: 0.03,
  },

  /** Crit Damage is fixed and cannot be raised (anti power creep). */
  critMultiplier: 1.5,
  /** Weapon Mastery: a Glancing Blow deals this share of a clean hit (Timo, 2026-10-08). */
  glancingDamage: 0.5,
  /** Evasion cannot dodge spells, but it Deflects them with the same chance: this damage share. */
  deflectDamage: 0.5,
  /** Stacking Sunder of Weapon Mastery before nodes: no chance of its own, 5 % Armor per stack. */
  sunder: { chance: 0, perStack: 0.05, maxStacks: 5, duration: 5 },

  /**
   * Barrier (like Energy Shield): full at fight start and always trickles back (`steady` of its
   * max per s), so it holds a long boss fight like Armor does. After `delay` s without a hit it
   * refills fast (`perSecond`). The delay keeps it from refilling fully between the slow swings
   * of early bosses.
   */
  barrierRecharge: { steady: 0.03, delay: 1.5, perSecond: 0.2 },
  /** Share of a blocked hit that a block stops (before Stoneguard). */
  blockReduction: 0.5,
  /**
   * A telegraphed Heavy Attack takes at most this share of the target's max Life + Barrier per
   * hit (balance-grundlagen-v1.md D): it is announced so it can hurt, but a wall is never a
   * one-shot lottery.
   */
  heavyHitCap: 0.35,
  /** Bosses shrug off stuns: a stun holds them this much as long (no stunlocked boss). */
  bossStunTaken: 0.5,

  // Caps.
  maxEvasion: 0.5,
  maxBlockChance: 0.75,
  maxResistance: 0.75,
  maxTenacity: 0.75,
  maxArmorReduction: 0.9,
  /** Armor reduction = armor / (armor + armorConstantPerLevel × attacker level). */
  armorConstantPerLevel: 20,
  /**
   * Monster Armor × (this × Monster Level): an armored monster (about 30 Armor) stops about a
   * third of a Physical hit at every level, a plain one about a tenth.
   */
  monsterArmorPerLevel: 0.27,
  /**
   * Every monster resists the elements a little (Phase 5 measurement, balance-messung-v1.md 10).
   * Klassengerüst v1: every weapon fights Physical or Elemental by its path, so the base matches
   * what Monster Armor takes off a Physical hit (about 10 %); the act's own element comes on top.
   */
  monsterResistance: 0.1,

  // Heat (docs/design/waffen-v1.md section 4).
  maxHeat: 100,
  warmingHeatPerSecond: 12,
  /** Cooling: Heat drains at this rate all the time (Timo, after Playtest 2). */
  coolingDecayPerSecond: 1,
  /** Cooling: Heat per 1 % of max life lost to a hit, capped per hit. */
  heatPerPercentLifeTaken: 1,
  maxHeatFromHitTaken: 10,

  // Ailments.
  /** Burn deals this fraction of the triggering hit as damage per second. */
  burnDamagePerSecond: 0.22,
  burnDurationSeconds: 4,
  /** Burning fighters heal this much less. */
  burnHealingReduction: 0.5,
  chillDurationSeconds: 2,
  /** Chill: -X Attack Speed and -X Heat Gain; Ailment Effect raises it up to `chillMaxSlow`. */
  chillSlow: 0.25,
  chillMaxSlow: 0.4,
  shockDurationSeconds: 3,
  /**
   * Shock (ailments-v2.md 3.1): stacks up to `shockMaxStacks`, each one +X damage taken; with
   * Ailment Effect at most `shockMaxDamageTaken` in all.
   */
  shockDamageTaken: 0.1,
  shockMaxStacks: 3,
  shockMaxDamageTaken: 0.5,
  /** Bleed: short and strong, X of the triggering hit per second. Refreshes like Burn. */
  bleedDamagePerSecond: 0.5,
  bleedDurationSeconds: 3,
  /** Poison: every stack deals X of its hit per second and runs out on its own. */
  poisonDamagePerSecond: 0.14,
  poisonDurationSeconds: 5,
  poisonMaxStacks: 20,
  /**
   * Corruption (Void): starts weak and grows with every tick by this fraction of its base damage,
   * up to `corruptionMaxRamp` ticks. Re-applying refreshes the duration and keeps the growth.
   */
  corruptionDamagePerSecond: 0.09,
  corruptionDurationSeconds: 6,
  corruptionRampPerTick: 0.25,
  corruptionMaxRamp: 12,

  /**
   * Built-in payoffs (ailments-v2.md 3.1): every DoT has its own burst moment. Overflow: a Poison
   * stack pushed off at the cap deals its remaining damage at once. Combust: a Fire hit on a
   * burning target deals this share of the Burn's remaining damage at once. Collapse: Corruption
   * at full growth deals `collapseSeconds` of its damage at once and falls back to half growth.
   */
  combustShare: 0.25,
  collapseSeconds: 4,

  /** Spell skills gain this much base damage per skill level above 1. */
  spellDamagePerSkillLevel: 0.2,
  /** Attack skills gain this much damage per skill level above 1. */
  attackDamagePerSkillLevel: 0.1,
} as const;
