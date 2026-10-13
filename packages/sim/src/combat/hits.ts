import {
  ailmentDuration,
  applyAilment,
  clearAilment,
  healingFactor,
  poisonStacks,
  remainingPoisonDamage,
} from "./ailments";
import { COMBAT } from "./constants";
import { resolveHit } from "./damage";
import {
  crescendoFactor,
  damageTaken,
  dotFactor,
  ELEMENT_AILMENT,
  emit,
  endFight,
  executeFactor,
  type FightCore,
  type Fighter,
  fightTime,
  heatMultiplier,
  heavyHitCap,
  other,
  perk,
  PRISM,
  refreshStats,
  STREAK_ID,
  SUNDER_ID,
  usePerk,
  withStatAilmentChances,
  conditionHolds,
} from "./fighter";
import { addHeat, heatFromHitTaken, heatFromOwnHit } from "./heat";
import { PERK } from "./perks";
import { checkReactionThresholds, react } from "./rotation";
import { applyEffect, fireTriggers, tryTrigger } from "./trigger-effects";
import type { AilmentChance, AilmentType, DamageType } from "./types";
import { AILMENT_TYPES } from "./types";

/**
 * Default Attacks and the hit pipeline: evade, Glancing Blow or clean hit, crits, Weapon Mastery
 * effects, ailments, damage, healing and Barrier.
 */

/** How one hit ended: evaded (or absorbed before it landed), a Glancing Blow or a clean hit. */
type HitResult = "miss" | "glancing" | "clean";

/** Options of one resolved hit. */
interface HitOptions {
  readonly source: string;
  readonly baseDamage: number;
  readonly type: DamageType;
  readonly evadable: boolean;
  readonly multiplier: number;
  readonly ailmentChances: readonly AilmentChance[];
  /** Ailments act as if the hit was this much stronger. Default 1. */
  readonly ailmentPower?: number;
  /** Extra share of Armor this hit ignores (Heavy Bolt). */
  readonly penetration?: number;
  /** Hits caused by triggers do not fire further triggers. */
  readonly fromTrigger: boolean;
  /** Weapon Mastery: the hit rolls Precision (own Default Attacks, skills, extra attacks). */
  readonly precisionApplies?: boolean;
  /** Never a Glancing Blow. */
  readonly precise?: boolean;
  /** Clean and a Crit for sure (Deadeye, Headsplitter). */
  readonly forceCrit?: boolean;
  /** Where the damage roll landed in the Damage Range, 0..1 (Headsplitter). */
  readonly rollFraction?: number;
  /** An extra attack from a trigger (Riposte): may add Sunder. */
  readonly extraAttack?: boolean;
}

/** A Default Attack. Extra attacks from triggers (`fromTrigger`) fire no further triggers. */
export function defaultAttack(core: FightCore, f: Fighter, fromTrigger = false): void {
  const weapon = f.setup.weapon;
  const wr = f.setup.weaponRules;
  const fraction = core.rng.next();
  const nth = wr?.everyNthCrit;
  const prism = wr?.prism ? PRISM[f.attackCount % PRISM.length] : undefined;
  const ailmentChances: AilmentChance[] = wr?.noDefaultAilments
    ? []
    : [...(weapon.ailmentChances ?? [])];
  if (prism) ailmentChances.push({ ailment: prism.ailment, chance: 0.25 });
  const nthAttack = (n: number) => !fromTrigger && (f.attackCount + 1) % n === 0;
  const trueShot = f.perks.has("trueShot") && nthAttack(PERK.trueShotEvery);
  const defaultDamage = f.setup.rules?.defaultAttackDamage ?? 1;
  if (trueShot) perk(core, f, "trueShot");
  const result = landHit(core, f, {
    source: weapon.defaultAttack,
    baseDamage: weapon.damage.min + fraction * (weapon.damage.max - weapon.damage.min),
    type: prism?.type ?? weapon.damageType,
    evadable: true,
    multiplier: defaultDamage,
    // A Keystone that weakens the Default Attack (Void-lord I, Black Flame) does not weaken the
    // ailments it carries.
    ...(defaultDamage < 1 ? { ailmentPower: 1 / defaultDamage } : {}),
    ailmentChances,
    fromTrigger,
    precisionApplies: true,
    rollFraction: fraction,
    ...(fromTrigger ? { extraAttack: true } : {}),
    ...(fromTrigger && wr?.extraAttacksPrecise ? { precise: true } : {}),
    ...((nth && nthAttack(nth)) || trueShot ? { forceCrit: true } : {}),
  });
  const landed = result !== "miss";
  if (core.result) return;
  if (landed) {
    f.heat = addHeat(
      f.heat,
      heatFromOwnHit(weapon.heatBehavior, weapon.heatPerHit),
      heatMultiplier(core, f),
    );
  }
  if (!fromTrigger) {
    const twice = f.perks.has("doubleTime") && nthAttack(PERK.doubleTimeEvery);
    f.attackCount++;
    fireTriggers(core, f, "everyNthAttack");
    if (twice && !core.result) {
      perk(core, f, "doubleTime");
      defaultAttack(core, f, true);
    }
  }
}

/** Stuns a fighter (Tenacity shortens it, at most by 75 %) and breaks its swing: back to 0. */
export function stun(core: FightCore, target: Fighter, seconds: number): void {
  const source = core.fighters[other(target.side)];
  const time =
    seconds *
    (source.setup.weaponRules?.stunDuration ?? 1) *
    (target.setup.rules?.stunTaken ?? 1) *
    (1 - Math.min(0.75, target.stats.tenacity));
  if (time <= 0) return;
  target.stunned = Math.max(target.stunned, time);
  target.attackProgress = 0;
  emit(core, { t: fightTime(core), type: "stun", side: target.side, seconds: time });
}

/** Adds Barrier (up to max life). */
export function addBarrier(core: FightCore, f: Fighter, amount: number): void {
  const before = f.barrier;
  f.barrier = Math.min(f.stats.maxLife, f.barrier + Math.round(amount));
  if (f.barrier > before) {
    emit(core, { t: fightTime(core), type: "barrier", side: f.side, amount: f.barrier - before });
  }
}

/** Resolves one hit from `attacker` on the other fighter. */
export function landHit(core: FightCore, attacker: Fighter, h: HitOptions): HitResult {
  const defender = core.fighters[other(attacker.side)];
  const wr = attacker.setup.weaponRules;
  // Sunder on the defender, Festering and the hit's own penetration add to Physical Penetration.
  const sundered = defender.curses.reduce((sum, c) => sum + (c.armor ?? 0), 0);
  const shred = (wr?.poisonArmorShred ?? 0) * poisonStacks(defender.ailments);
  const penetration = (h.penetration ?? 0) + sundered + shred;

  // Weapon Mastery: Precision and the clean Crits some rules promise.
  const weaponPrecision = attacker.setup.weapon.precision;
  const rolls = h.precisionApplies === true && weaponPrecision !== undefined;
  const opener = rolls && wr?.openerDamage !== undefined && !attacker.openerUsed;
  const topRoll =
    wr?.topRollCrits !== undefined &&
    h.rollFraction !== undefined &&
    h.rollFraction >= wr.topRollCrits;
  const forceCrit = rolls && (h.forceCrit === true || attacker.nextCrit || opener || topRoll);
  if (forceCrit) attacker.nextCrit = false;
  if (opener) attacker.openerUsed = true;
  let precision: number | undefined;
  if (rolls && !h.precise) {
    const aim = wr?.steadyAim;
    const steady =
      aim && fightTime(core) - attacker.lastHitTakenAt >= aim.seconds ? aim.precision : 0;
    const hand = attacker.perks.has("hawkeye") ? PERK.hawkeyePrecision : 0;
    precision = Math.min(1, Math.max(0, (weaponPrecision ?? 1) + steady + hand));
  }

  // Quick Reflexes: the first attack of the fight misses.
  if (h.evadable && !h.fromTrigger && usePerk(defender, "quickReflexes")) {
    perk(core, defender, "quickReflexes");
    evaded(core, defender, h);
    return "miss";
  }

  const outcome = resolveHit(
    {
      baseDamage: h.baseDamage,
      type: h.type,
      evadable: h.evadable,
      attacker:
        penetration > 0
          ? {
              ...attacker.stats,
              physicalPenetration: attacker.stats.physicalPenetration + penetration,
            }
          : attacker.stats,
      attackerLevel: attacker.setup.level,
      multiplier:
        h.multiplier *
        (attacker.setup.damageMultiplier ?? 1) *
        executeFactor(attacker.setup.rules, defender) *
        (attacker.setup.rules?.hitDamage ?? 1) *
        (defender.ailments.chill ? (attacker.setup.rules?.chilledDamage ?? 1) : 1) *
        crescendoFactor(attacker) *
        masteryDamageFactor(core, attacker, defender) *
        (opener ? 1 + (wr?.openerDamage ?? 0) : 1),
      defender: defender.stats,
      defenderDamageTaken: damageTaken(defender),
      ...(precision !== undefined ? { precision } : {}),
      ...(wr?.glancingDamage !== undefined ? { glancingDamage: wr.glancingDamage } : {}),
      ...(forceCrit ? { forceCrit: true } : {}),
      ...(wr?.critPenetration ? { critPenetration: wr.critPenetration } : {}),
    },
    core.rng,
  );

  if (outcome.kind === "evaded") {
    evaded(core, defender, h);
    return "miss";
  }

  const { glancing } = outcome;
  // Hunter's Mark: until the first clean hit, Glancing Blows deal nothing.
  const dealt = glancing && wr?.mark && !attacker.marked ? 0 : outcome.damage;
  const damage =
    core.heavyFrom === attacker.side ? Math.min(dealt, heavyHitCap(defender.stats)) : dealt;
  emit(core, {
    t: fightTime(core),
    type: "hit",
    side: attacker.side,
    source: h.source,
    damage,
    damageType: h.type,
    crit: outcome.crit,
    blocked: outcome.blocked,
    ...(glancing ? { glancing: true } : {}),
    ...(damage < dealt ? { capped: true } : {}),
  });
  defender.lastHitTakenAt = fightTime(core);
  if (outcome.blocked && defender.setup.weaponRules?.critAfter?.includes("block")) {
    defender.nextCrit = true;
  }

  if (!outcome.blocked) {
    defender.heat = addHeat(
      defender.heat,
      heatFromHitTaken(defender.setup.weapon.heatBehavior, damage, defender.stats.maxLife) *
        defender.stats.heatFromHitsTaken,
      heatMultiplier(core, defender),
    );
  }
  dealDamage(core, defender, damage);
  if (core.result) return glancing ? "glancing" : "clean";

  if (attacker.stats.lifesteal > 0 && damage > 0) {
    heal(core, attacker, damage * attacker.stats.lifesteal);
  }

  if (glancing) {
    glance(core, attacker);
  } else {
    if (rolls) cleanHit(core, attacker, defender, h);
    // Ailments grow from the hit before "damage taken" (Shock, Keystones): their ticks take it
    // again on their own, so it counts once, not twice.
    const hitBase = damage / (1 + damageTaken(defender));
    const ailmentBase = hitBase * (h.ailmentPower ?? 1);
    for (const { ailment, chance } of withStatAilmentChances(
      elementalSurge(attacker, h),
      attacker.stats,
    )) {
      if (!core.rng.chance(chance)) continue;
      inflict(core, attacker, defender, ailment, ailmentBase);
    }
    if (outcome.crit && attacker.setup.rules?.critsApplyBleed) {
      inflict(core, attacker, defender, "bleed", hitBase);
    }
    if (outcome.crit && wr) critMastery(core, attacker, defender, hitBase);
    if (outcome.crit && attacker.perks.has("armorbreaker")) {
      perk(core, attacker, "armorbreaker");
      addSunder(attacker, defender, 1);
    }
  }
  if (
    attacker.perks.has("titan") &&
    fightTime(core) + 1e-9 >= attacker.titanReadyAt &&
    damage >= defender.stats.maxLife * PERK.titanThreshold
  ) {
    attacker.titanReadyAt = fightTime(core) + PERK.titanCooldown;
    perk(core, attacker, "titan");
    stun(core, defender, PERK.titanStun);
  }

  const result: HitResult = glancing ? "glancing" : "clean";
  if (h.fromTrigger) return result;

  const context = { damage };
  // A Glancing Blow fires no on-hit triggers of the attacker (unless Opportunist).
  if (!glancing || attacker.perks.has("opportunist")) {
    if (glancing) perk(core, attacker, "opportunist");
    fireTriggers(core, attacker, "onHit", context);
  }
  if (outcome.crit) fireTriggers(core, attacker, "onCrit", context);
  fireTriggers(core, defender, "whenHit", context);
  defender.hitsTaken++;
  fireTriggers(core, defender, "everyNthHitTaken", context);
  if (outcome.blocked) fireTriggers(core, defender, "onBlock", context);
  if (core.result) return result;

  if (defender.stats.thorns > 0) {
    const thorns = Math.max(1, Math.round(defender.stats.thorns));
    emit(core, {
      t: fightTime(core),
      type: "hit",
      side: defender.side,
      source: "Thorns",
      damage: thorns,
      damageType: "physical",
      crit: false,
      blocked: false,
    });
    dealDamage(core, attacker, thorns);
  }
  return result;
}

/** An attack missed the defender: Read the Blow, Ember Dance and On Evade triggers. */
function evaded(core: FightCore, defender: Fighter, h: HitOptions): void {
  emit(core, { t: fightTime(core), type: "evade", side: defender.side, source: h.source });
  if (defender.setup.weaponRules?.critAfter?.includes("evade")) defender.nextCrit = true;
  if (defender.perks.has("emberDance")) {
    defender.heat = addHeat(defender.heat, PERK.emberDanceHeat, heatMultiplier(core, defender));
    perk(core, defender, "emberDance");
  }
  if (!h.fromTrigger) fireTriggers(core, defender, "onEvade");
}

/** Elemental Surge: elemental hits get a better chance of their element's ailment. */
function elementalSurge(attacker: Fighter, h: HitOptions): readonly AilmentChance[] {
  const ailment = ELEMENT_AILMENT[h.type];
  if (!ailment || !attacker.perks.has("elementalSurge")) return h.ailmentChances;
  const own = h.ailmentChances.find((c) => c.ailment === ailment);
  return own
    ? h.ailmentChances.map((c) =>
        c === own ? { ailment, chance: Math.min(1, c.chance + PERK.elementalSurgeChance) } : c,
      )
    : [...h.ailmentChances, { ailment, chance: PERK.elementalSurgeChance }];
}

/** Weapon Mastery multipliers on own hit damage. */
function masteryDamageFactor(core: FightCore, attacker: Fighter, defender: Fighter): number {
  const wr = attacker.setup.weaponRules;
  if (!wr) return 1;
  let extra = attacker.rampage;
  for (const e of wr.conditionalDamage ?? []) {
    if (conditionHolds(core, attacker, e.condition)) extra += e.amount;
  }
  if (wr.patience) {
    extra += Math.min(
      wr.patience.max,
      wr.patience.perSecond * (fightTime(core) - attacker.lastSkillAt),
    );
  }
  if (wr.mark && attacker.marked) extra += wr.mark.bonus;
  if (wr.damagePerAilment) {
    const running = AILMENT_TYPES.filter((a) =>
      a === "poison" ? poisonStacks(defender.ailments) > 0 : defender.ailments[a] !== undefined,
    ).length;
    extra += wr.damagePerAilment * running;
  }
  return (wr.damageDealt ?? 1) * (1 + extra);
}

/** A Glancing Blow: Heat from Loaded Spring or Flowing Blade, the streak ends. */
function glance(core: FightCore, f: Fighter): void {
  const wr = f.setup.weaponRules;
  f.flowing = false;
  if (wr?.glancingHeat) {
    const before = f.heat;
    f.heat = Math.min(COMBAT.maxHeat, Math.max(0, f.heat + wr.glancingHeat));
    if (f.heat > before) {
      emit(core, { t: fightTime(core), type: "heatGain", side: f.side, amount: f.heat - before });
    }
  }
  if (wr?.streak && f.buffs.some((b) => b.id === STREAK_ID)) {
    f.buffs = f.buffs.filter((b) => b.id !== STREAK_ID);
    refreshStats(f);
  }
}

/** A clean weapon hit: streak, mark, Sunder and refreshed ailments. */
function cleanHit(core: FightCore, attacker: Fighter, defender: Fighter, h: HitOptions): void {
  const wr = attacker.setup.weaponRules;
  attacker.flowing = true;
  if (!wr) return;
  if (wr.mark) attacker.marked = true;
  if (wr.streak) {
    applyEffect(
      core,
      attacker,
      STREAK_ID,
      "Unbroken Flow",
      {
        kind: "buff",
        stat: wr.streak.stat,
        amount: wr.streak.amount,
        duration: 999,
        maxStacks: wr.streak.max,
      },
      {},
      true,
    );
  }
  const sunder = wr.sunder;
  let stacks = sunder && sunder.chance > 0 && core.rng.chance(sunder.chance) ? 1 : 0;
  if (h.extraAttack && wr.extraAttackSunder) stacks += 1;
  if (stacks > 0) addSunder(attacker, defender, stacks);
  for (const ailment of wr.refreshOnHit ?? []) {
    if (ailment === "poison") continue;
    const state = defender.ailments[ailment];
    if (!state) continue;
    const duration = ownAilmentDuration(attacker, defender, ailment);
    defender.ailments = {
      ...defender.ailments,
      [ailment]: { ...state, remaining: Math.max(state.remaining, duration) },
    };
  }
}

/** Crits with Weapon Mastery: Deep Cuts and Twist the Blade. */
function critMastery(core: FightCore, attacker: Fighter, defender: Fighter, damage: number): void {
  const wr = attacker.setup.weaponRules;
  const bleed = defender.ailments.bleed;
  if (wr?.critBleedMultiplier && bleed) {
    defender.ailments = {
      ...defender.ailments,
      bleed: { ...bleed, damagePerSecond: bleed.damagePerSecond * wr.critBleedMultiplier },
    };
  }
  for (let i = 0; i < (wr?.critPoisonStacks ?? 0); i++) {
    inflict(core, attacker, defender, "poison", damage);
  }
}

/** Adds stacks of the attacker's stacking Sunder to the defender. */
export function addSunder(attacker: Fighter, defender: Fighter, stacks: number): void {
  const rule = attacker.setup.weaponRules?.sunder ?? COMBAT.sunder;
  const before = defender.curses.find((c) => c.id === SUNDER_ID)?.stacks ?? 0;
  const now = Math.min(rule.maxStacks, before + stacks);
  defender.curses = [
    ...defender.curses.filter((c) => c.id !== SUNDER_ID),
    {
      id: SUNDER_ID,
      name: "Sunder",
      dotDamageTaken: 0,
      armor: now * rule.perStack,
      stacks: now,
      remaining: rule.duration,
    },
  ];
}

/** Duration of an ailment the attacker inflicts. */
function ownAilmentDuration(attacker: Fighter, defender: Fighter, ailment: AilmentType): number {
  const by = attacker.setup.weaponRules?.ailmentDurationBy?.[ailment] ?? 0;
  const duration =
    ailmentDuration(ailment, attacker.stats.ailmentDuration, defender.stats.tenacity) *
    Math.max(0, 1 + by);
  return duration > 0 && attacker.perks.has("clarity") ? duration + PERK.claritySeconds : duration;
}

export function inflict(
  core: FightCore,
  attacker: Fighter,
  defender: Fighter,
  ailment: AilmentType,
  hitDamage: number,
  echo = true,
): void {
  if (echo) {
    for (const e of attacker.setup.rules?.ailmentEcho ?? []) {
      if (e.from === ailment) inflict(core, attacker, defender, e.to, hitDamage, false);
    }
  }
  if (ailment === "poison" && defender.poisonLockout > 1e-9) return;
  const duration = ownAilmentDuration(attacker, defender, ailment);
  const wr = attacker.setup.weaponRules;
  defender.ailments = applyAilment(
    defender.ailments,
    ailment,
    duration,
    hitDamage,
    COMBAT.poisonMaxStacks +
      (wr?.poisonMaxStacks ?? 0) +
      (attacker.perks.has("clarity") ? PERK.clarityPoisonStacks : 0),
  );
  if (duration <= 0) return;
  const burst = wr?.poisonBurst;
  if (ailment === "poison" && burst && poisonStacks(defender.ailments) >= burst.stacks) {
    poisonBurst(core, attacker, defender, burst.multiplier, burst.lockout);
    return;
  }
  react(defender, "ailmented");
  checkReactionThresholds(core);
  emit(core, {
    t: fightTime(core),
    type: "ailment",
    side: defender.side,
    ailment,
    ...(ailment === "poison" ? { stacks: poisonStacks(defender.ailments) } : {}),
  });
}

/** Toxic Bloom: every Poison stack bursts for its remaining damage at once. */
function poisonBurst(
  core: FightCore,
  attacker: Fighter,
  defender: Fighter,
  multiplier: number,
  lockout: number,
) {
  const rest = remainingPoisonDamage(defender.ailments);
  defender.ailments = clearAilment(defender.ailments, "poison");
  defender.poisonLockout = lockout;
  emit(core, {
    t: fightTime(core),
    type: "ailmentExpired",
    side: defender.side,
    ailment: "poison",
  });
  const damage = Math.max(1, Math.round(rest * multiplier * dotFactor(core, defender)));
  emit(core, {
    t: fightTime(core),
    type: "hit",
    side: attacker.side,
    source: "Toxic Bloom",
    damage,
    damageType: "physical",
    crit: false,
    blocked: false,
  });
  dealDamage(core, defender, damage);
}

export function heal(core: FightCore, f: Fighter, amount: number): void {
  const healed = Math.min(f.stats.maxLife - f.life, Math.round(amount * healingFactor(f.ailments)));
  if (healed <= 0) return;
  f.life += healed;
  emit(core, { t: fightTime(core), type: "heal", side: f.side, amount: healed });
  react(core.fighters[other(f.side)], "enemyHeals");
  for (const state of f.triggers) {
    const c = state.spec.condition;
    if (c.kind === "lifeBelow" && f.life / f.stats.maxLife >= c.threshold) state.armed = true;
  }
  checkReactionThresholds(core);
}

/**
 * Barrier (like PoE's Energy Shield): it always trickles back, and a moment without a hit fills
 * it up fast. One "barrier" event when it is full, so the arena shows it without spamming the log.
 */
export function rechargeBarrier(core: FightCore, f: Fighter, dt: number): void {
  const max = f.stats.barrier;
  if (max <= 0 || f.barrier >= max) return;
  const { steady, delay, perSecond } = COMBAT.barrierRecharge;
  const rate = fightTime(core) - f.lastHitTakenAt < delay ? steady : perSecond;
  const faster = f.setup.rules?.barrierRecharge ?? 1;
  const gain = Math.min(max - f.barrier, max * rate * faster * dt);
  f.barrier += gain;
  f.barrierRecharged += gain;
  if (f.barrier >= max - 1e-6) {
    f.barrier = max;
    emit(core, {
      t: fightTime(core),
      type: "barrier",
      side: f.side,
      amount: Math.round(f.barrierRecharged),
    });
    f.barrierRecharged = 0;
  }
}

/** Barrier absorbs damage first, the rest goes to life. */
export function dealDamage(core: FightCore, f: Fighter, amount: number): void {
  const absorbed = Math.min(f.barrier, amount);
  f.barrier -= absorbed;
  if (absorbed > 0 && f.barrier <= 0) react(f, "barrierBreaks");
  f.life = Math.max(0, f.life - (amount - absorbed));
  if (f.life === 0 && usePerk(f, "undying")) {
    f.life = 1;
    perk(core, f, "undying");
  }
  if (f.life === 0) {
    emit(core, { t: fightTime(core), type: "death", side: f.side });
    endFight(core, other(f.side));
    return;
  }
  if (f.life / f.stats.maxLife < PERK.secondBreathBelow && usePerk(f, "secondBreath")) {
    perk(core, f, "secondBreath");
    heal(core, f, f.stats.maxLife * PERK.secondBreathHeal);
  }
  for (const state of f.triggers) {
    const c = state.spec.condition;
    if (c.kind !== "lifeBelow" || !state.armed) continue;
    if (f.life / f.stats.maxLife < c.threshold) {
      state.armed = false;
      tryTrigger(core, f, state, {});
      if (core.result) return;
    }
  }
  checkReactionThresholds(core);
}
