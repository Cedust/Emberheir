import {
  advanceCorruption,
  ailmentDuration,
  applyAilment,
  clearAilment,
  healingFactor,
  poisonOverflow,
  poisonStacks,
  remainingBurnDamage,
  remainingPoisonDamage,
} from "./ailments";
import { COMBAT, MIGHTY_SHARE } from "./constants";
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
  payoff,
  payoffFactor,
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
import type { AilmentChance, AilmentType, DamageType, WeaponRules } from "./types";
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
  /** The roll reached the weapon's Mighty threshold: a Mighty Hit if it lands cleanly. */
  readonly mighty?: boolean;
  /** A hit from a trigger that still fires triggers (Path Masters' extra attacks). */
  readonly firesTriggers?: boolean;
  /** A hit of an own skill (Skill Damage). */
  readonly fromSkill?: boolean;
  /** Extra damage share that only a clean hit gets (Siege Engine). */
  readonly cleanBonus?: number;
  /** Decides the Crit instead of the roll (Repeater). */
  readonly critOverride?: boolean;
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
  // Thousand Needles: extra attacks always carry their ailments.
  if (fromTrigger) {
    for (const ailment of wr?.extraAttackAilments ?? []) {
      ailmentChances.push({ ailment, chance: 1 });
    }
  }
  const nthAttack = (n: number) => !fromTrigger && (f.attackCount + 1) % n === 0;
  const trueShot = f.perks.has("trueShot") && nthAttack(PERK.trueShotEvery);
  // Spark (Sorcerer): the Default Attack after a skill is charged and sets its element's ailment.
  const spark = !fromTrigger && f.sparkReady ? f.setup.rules?.spark : undefined;
  if (spark) {
    f.sparkReady = false;
    const own = ELEMENT_AILMENT[prism?.type ?? weapon.damageType];
    if (own) {
      const at = ailmentChances.findIndex((c) => c.ailment === own);
      if (at >= 0) ailmentChances.splice(at, 1);
      ailmentChances.push({ ailment: own, chance: 1 });
    }
    payoff(core, f, "spark");
  }
  const defaultDamage =
    (f.setup.rules?.defaultAttackDamage ?? 1) *
    (1 + (spark?.damage ?? 0)) *
    (fromTrigger ? 1 + (wr?.extraAttackDamage ?? 0) : 1);
  if (trueShot) perk(core, f, "trueShot");
  const roll = weapon.damage.min + fraction * (weapon.damage.max - weapon.damage.min);
  // Glass Cannon: the Barrier given up hits along with every Default Attack.
  const glass = wr?.glassCannon ? f.glassBarrier * wr.glassCannon.share : 0;
  // Siege Engine: the Bolt sets off every Sunder stack on the target.
  const target = core.fighters[other(f.side)];
  const siege = wr?.siegeEngine;
  const sunderStacks = siege ? sunderOn(target) : 0;
  const volley = wr?.volley && !fromTrigger ? wr.volley : undefined;
  // Repeater: one Crit roll for the whole volley.
  const volleyCrit = volley ? core.rng.chance(f.stats.critChance) : undefined;
  let result: HitResult = "miss";
  for (let bolt = 0; bolt < (volley?.count ?? 1) && !core.result; bolt++) {
    const r = landHit(core, f, {
      source: weapon.defaultAttack,
      baseDamage: (roll + glass) * (volley?.multiplier ?? 1),
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
      ...(isMighty(weapon, roll) ? { mighty: true } : {}),
      ...(fromTrigger ? { extraAttack: true } : {}),
      ...(fromTrigger && extraFiresTriggers(f) ? { firesTriggers: true } : {}),
      ...(fromTrigger && wr?.extraAttacksPrecise ? { precise: true } : {}),
      ...((nth && nthAttack(nth)) || trueShot ? { forceCrit: true } : {}),
      ...(siege && sunderStacks > 0 ? { cleanBonus: siege.perStack * sunderStacks } : {}),
      ...(volleyCrit !== undefined ? { critOverride: volleyCrit } : {}),
    });
    if (r !== "miss" && result !== "clean") result = r;
  }
  const landed = result !== "miss";
  if (core.result) return;
  if (sunderStacks > 0 && result === "clean") {
    // The stacks it set off are gone; a stack this Bolt added stays.
    const left = sunderOn(target) - sunderStacks;
    target.curses = target.curses.filter((c) => c.id !== SUNDER_ID);
    if (left > 0) addSunder(f, target, left);
  }
  if (landed) {
    f.heat = addHeat(
      f.heat,
      heatFromOwnHit(weapon.heatBehavior, weapon.heatPerHit),
      heatMultiplier(core, f),
    );
    // Master of Barbs: arrows on a Bleeding enemy give Heat.
    for (const e of wr?.heatOnHitWhen ?? []) {
      if (conditionHolds(core, f, e.condition)) gainHeat(core, f, e.amount);
    }
  }
  const whirl = wr?.whirl;
  if (whirl) {
    // Whirl: enough Default Attacks in a short time make the next Innate free.
    const now = fightTime(core);
    f.recentAttacks = [...f.recentAttacks.filter((t) => now - t < whirl.seconds), now];
    if (f.recentAttacks.length >= whirl.stabs) {
      f.recentAttacks = [];
      f.freeInnate = true;
    }
  }
  if (!fromTrigger) {
    const twice = f.perks.has("doubleTime") && nthAttack(PERK.doubleTimeEvery);
    f.attackCount++;
    fireTriggers(core, f, "everyNthAttack");
    if (wr?.cascade && f.attackCount % wr.cascade.every === 0 && !core.result) {
      toxicCascade(core, f, target, wr.cascade.share);
    }
    if (twice && !core.result) {
      perk(core, f, "doubleTime");
      extraAttack(core, f);
    }
  }
}

/** An extra Default Attack (Riposte, Double Stab, Spring Trap). */
export function extraAttack(core: FightCore, f: Fighter): void {
  f.extraDepth++;
  defaultAttack(core, f, true);
  f.extraDepth--;
}

/** Path Masters: an extra attack may fire triggers, the ones it causes may not. */
export function extraFiresTriggers(f: Fighter): boolean {
  return f.setup.weaponRules?.extraAttacksTrigger === true && f.extraDepth <= 1;
}

/** A weapon roll at or above the weapon's Mighty threshold (before skill multipliers). */
export function isMighty(weapon: Fighter["setup"]["weapon"], roll: number): boolean {
  return weapon.mightyAt !== undefined && roll + 1e-9 >= weapon.mightyAt;
}

/** Stacks of the stacking Sunder on a fighter. */
function sunderOn(f: Fighter): number {
  return f.curses.find((c) => c.id === SUNDER_ID)?.stacks ?? 0;
}

/** Heat from a Weapon Mastery rule, with a log event. */
export function gainHeat(core: FightCore, f: Fighter, amount: number): void {
  const before = f.heat;
  f.heat = addHeat(f.heat, amount, heatMultiplier(core, f));
  if (f.heat > before) {
    emit(core, { t: fightTime(core), type: "heatGain", side: f.side, amount: f.heat - before });
  }
}

/** Toxic Cascade: a share of the Poison stacks (the oldest) bursts at once. */
function toxicCascade(core: FightCore, attacker: Fighter, defender: Fighter, share: number) {
  const poison = defender.ailments.poison;
  if (!poison || poison.stacks.length < 2) return;
  const count = Math.floor(poison.stacks.length * share);
  const burst = poison.stacks.slice(0, count);
  const rest = burst.reduce((sum, p) => sum + p.damagePerSecond * p.remaining, 0);
  defender.ailments = {
    ...defender.ailments,
    poison: { ...poison, stacks: poison.stacks.slice(count) },
  };
  const dealt = dotBurst(
    core,
    attacker,
    defender,
    rest * payoffFactor(core, attacker),
    "Toxic Cascade",
  );
  burstLeech(core, attacker, dealt);
}

/** Master of Toxin: Poison that bursts at once heals its owner. */
function burstLeech(core: FightCore, f: Fighter, damage: number): void {
  const leech = f.setup.weaponRules?.burstLeech ?? 0;
  if (leech > 0 && damage > 0 && !core.result) heal(core, f, damage * leech);
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
  // Interrupt: a stun during a wind-up breaks the Heavy Attack.
  const interrupt = source.setup.weaponRules?.interrupt;
  if (interrupt && target.windup && fightTime(core) + 1e-9 >= source.interruptReadyAt) {
    target.windup = null;
    source.interruptReadyAt = fightTime(core) + interrupt.cooldown;
    emit(core, { t: fightTime(core), type: "trigger", side: source.side, name: "Interrupt" });
  }
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
  const now = fightTime(core);

  // Weapon Mastery: Precision and the clean Crits some rules promise.
  const weaponPrecision = attacker.setup.weapon.precision;
  const rolls = h.precisionApplies === true && weaponPrecision !== undefined;
  const opener = rolls && wr?.openerDamage !== undefined && !attacker.openerUsed;
  const topRoll =
    wr?.topRollCrits !== undefined &&
    h.rollFraction !== undefined &&
    h.rollFraction >= wr.topRollCrits;
  // Keen Eye (Hunter): the first hit and every hit into an enemy's wind-up is a clean Crit.
  const keen =
    attacker.setup.rules?.keenEye === true &&
    !h.fromTrigger &&
    (!attacker.keenOpened || defender.windup !== null);
  if (keen) {
    attacker.keenOpened = true;
    payoff(core, attacker, "keenEye");
  }
  const ambush = rolls && wr?.ambush !== undefined && now < wr.ambush;
  const promised = rolls && attacker.critsLeft > 0;
  const mightyCrit = rolls && h.mighty === true && wr?.mightyCrit === true;
  const forceCrit =
    keen ||
    (rolls &&
      (h.forceCrit === true ||
        attacker.nextCrit ||
        opener ||
        topRoll ||
        ambush ||
        promised ||
        mightyCrit));
  if (forceCrit) attacker.nextCrit = false;
  if (forceCrit && promised) attacker.critsLeft--;
  if (opener) attacker.openerUsed = true;
  // Find the Gap: the first hit after a skill has a better Crit Chance.
  const gap = rolls && attacker.afterSkill ? (wr?.critAfterSkill ?? 0) : 0;
  if (rolls) attacker.afterSkill = false;
  const precise = h.precise === true || (h.mighty === true && wr?.mightyNeverGlances === true);
  let precision: number | undefined;
  if (rolls && !precise && !keen) {
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
      // Deflect is the hero's answer to spells; monsters only dodge attacks.
      deflects: defender.side === "hero",
      attacker: attackerStats(attacker, h.type, penetration, gap),
      attackerLevel: attacker.setup.level,
      multiplier:
        h.multiplier *
        (attacker.setup.damageMultiplier ?? 1) *
        executeFactor(attacker.setup.rules, defender) *
        (attacker.setup.rules?.hitDamage ?? 1) *
        (defender.ailments.chill ? (attacker.setup.rules?.chilledDamage ?? 1) : 1) *
        crescendoFactor(attacker) *
        masteryDamageFactor(core, attacker, defender) *
        // Iron Blood (Warrior): announced Heavy Attacks hit the Warrior softer.
        (core.heavyFrom === attacker.side
          ? (defender.setup.rules?.ironBlood?.damageTaken ?? 1)
          : 1) *
        (opener ? 1 + (wr?.openerDamage ?? 0) : 1) *
        (h.fromSkill ? 1 + (wr?.skillDamage ?? 0) : 1) *
        // Braced: right after a Block the defender takes less.
        (now <= defender.bracedUntil + 1e-9
          ? 1 - (defender.setup.weaponRules?.braced?.reduction ?? 0)
          : 1) *
        // Ashen Veil: a burning attacker deals less.
        (attacker.ailments.burn ? 1 - (defender.setup.weaponRules?.ashenVeil ?? 0) : 1),
      defender: defenderStats(attacker, defender),
      defenderDamageTaken: damageTaken(defender),
      ...(precision !== undefined ? { precision } : {}),
      ...(wr?.glancingDamage !== undefined ? { glancingDamage: wr.glancingDamage } : {}),
      ...(forceCrit ? { forceCrit: true } : {}),
      ...(wr?.critPenetration ? { critPenetration: wr.critPenetration } : {}),
      ...(h.evadable && defender.setup.weaponRules?.parry
        ? { parry: defender.setup.weaponRules.parry }
        : {}),
      cleanMultiplier: cleanMultiplier(attacker, defender, h, rolls),
      ...(h.critOverride !== undefined ? { critOverride: h.critOverride } : {}),
    },
    core.rng,
  );

  if (outcome.kind === "evaded") {
    evaded(core, defender, h);
    return "miss";
  }

  const { glancing, parried } = outcome;
  const mighty = rolls && h.mighty === true && !glancing;
  if (!glancing && rolls && attacker.cleanLineReady) attacker.cleanLineReady = false;
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
    ...(parried ? { parried: true } : {}),
    ...(mighty ? { mighty: true } : {}),
    ...(outcome.deflected ? { deflected: true } : {}),
    ...(damage < dealt ? { capped: true } : {}),
  });
  defender.lastHitTakenAt = fightTime(core);
  const dwr = defender.setup.weaponRules;
  if (outcome.blocked && dwr?.critAfter?.includes("block")) defender.nextCrit = true;
  if (outcome.blocked && dwr?.braced) defender.bracedUntil = now + dwr.braced.seconds;
  if (outcome.blocked && dwr?.store?.blocked) {
    // What the block stopped: the hit was cut to (1 − reduction).
    const reduction = Math.min(0.95, defender.stats.blockReduction);
    defender.stored += ((damage * reduction) / (1 - reduction)) * dwr.store.blocked;
  }
  if (parried && dwr?.critAfter?.includes("parry")) defender.nextCrit = true;

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
    const thirst = wr?.lowLifeLifesteal;
    const low =
      thirst && attacker.life / attacker.stats.maxLife < thirst.below ? thirst.multiplier : 1;
    heal(core, attacker, damage * attacker.stats.lifesteal * low);
  }

  // Combust: a Fire hit on a burning enemy sets part of the Burn off at once; it keeps burning.
  if (h.type === "fire" && defender.ailments.burn && damage > 0) {
    combust(core, attacker, defender, 1);
    if (core.result) return glancing ? "glancing" : "clean";
  }

  if (glancing) {
    if (!parried) glance(core, attacker);
  } else {
    if (rolls) cleanHit(core, attacker, defender, h, damage);
    // Ailments grow from the hit before "damage taken" (Shock, Keystones): their ticks take it
    // again on their own, so it counts once, not twice.
    const hitBase = damage / (1 + damageTaken(defender));
    const ailmentBase = hitBase * (h.ailmentPower ?? 1);
    const deepWound = outcome.crit ? (wr?.critBleedPower ?? 1) : 1;
    for (const { ailment, chance } of withStatAilmentChances(
      elementalSurge(attacker, h),
      attacker.stats,
    )) {
      // Thousand Cuts: Poison Chance no longer counts, every clean hit Poisons instead.
      if (ailment === "poison" && wr?.thousandCuts) continue;
      if (!core.rng.chance(chance)) continue;
      inflict(
        core,
        attacker,
        defender,
        ailment,
        ailmentBase * (ailment === "bleed" ? deepWound : 1),
      );
    }
    if (wr?.thousandCuts) inflict(core, attacker, defender, "poison", ailmentBase);
    if (mighty) mightyHit(core, attacker, defender, ailmentBase);
    if (core.result) return "clean";
    if (outcome.crit && attacker.setup.rules?.critsApplyBleed) {
      inflict(core, attacker, defender, "bleed", hitBase);
    }
    if (outcome.crit && wr) critMastery(core, attacker, defender, hitBase, damage);
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
  if (parried && !h.fromTrigger) {
    fireTriggers(core, defender, "onParry");
    if (core.result) return result;
  }
  if (h.fromTrigger && !h.firesTriggers) return result;

  const context = { damage };
  // A Glancing Blow fires no on-hit triggers of the attacker (unless Opportunist).
  if (!glancing || attacker.perks.has("opportunist")) {
    if (glancing) perk(core, attacker, "opportunist");
    fireTriggers(core, attacker, "onHit", context);
    // Master of Cleave: Mighty Hits roll the on-hit triggers twice.
    if (mighty && wr?.mightyTriggersTwice && !core.result) {
      fireTriggers(core, attacker, "onHit", context);
    }
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
  const dwr = defender.setup.weaponRules;
  if (dwr?.critAfter?.includes("evade")) defender.nextCrit = true;
  if (dwr?.critsAfterEvade) defender.critsLeft = dwr.critsAfterEvade;
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

/** The attacker's stats for one hit: extra Penetration (Master of Pierce) and Crit Chance. */
function attackerStats(attacker: Fighter, type: DamageType, penetration: number, crit: number) {
  const stats = attacker.stats;
  if (penetration <= 0 && crit <= 0 && !attacker.setup.weaponRules?.penetrationToElemental) {
    return stats;
  }
  const toElemental = attacker.setup.weaponRules?.penetrationToElemental && type !== "physical";
  return {
    ...stats,
    physicalPenetration: stats.physicalPenetration + penetration,
    elementalPenetration:
      stats.elementalPenetration + (toElemental ? stats.physicalPenetration + penetration : 0),
    critChance: Math.min(1, stats.critChance + crit),
  };
}

/** Master of Crush: Sunder also strips the defender's Evasion and Block. */
function defenderStats(attacker: Fighter, defender: Fighter) {
  if (!attacker.setup.weaponRules?.sunderDefense) return defender.stats;
  const share = defender.curses.find((c) => c.id === SUNDER_ID)?.armor ?? 0;
  if (share <= 0) return defender.stats;
  return {
    ...defender.stats,
    evasion: defender.stats.evasion * (1 - share),
    blockChance: defender.stats.blockChance * (1 - share),
  };
}

/** What only a clean hit gets: Mighty Hit bonuses, Clean Line, Siege Engine. */
function cleanMultiplier(
  attacker: Fighter,
  defender: Fighter,
  h: HitOptions,
  rolls: boolean,
): number {
  const wr = attacker.setup.weaponRules;
  let m = 1 + (h.cleanBonus ?? 0);
  if (rolls && attacker.cleanLineReady) m *= 1 + (wr?.cleanLine?.bonus ?? 0);
  if (rolls && h.mighty) {
    m *= 1 + (wr?.mightyDamage ?? 0);
    const exe = wr?.mightyExecute;
    if (exe && defender.life / defender.stats.maxLife < exe.below) m *= 1 + exe.bonus;
  }
  return m;
}

/** A Mighty Hit landed: stun, Sunder, Bleed, Heat drain and Rupture Plate. */
function mightyHit(core: FightCore, attacker: Fighter, defender: Fighter, ailmentBase: number) {
  const wr = attacker.setup.weaponRules;
  if (!wr) return;
  if (wr.mightyBleed) inflict(core, attacker, defender, "bleed", ailmentBase * wr.mightyBleed);
  if (core.result) return;
  if (wr.mightyStun) stun(core, defender, wr.mightyStun);
  if (wr.mightyHeatDrain) defender.heat = Math.max(0, defender.heat - wr.mightyHeatDrain);
  const rule = wr.sunder ?? COMBAT.sunder;
  if (wr.rupture && sunderOn(defender) >= rule.maxStacks) {
    const stacks = sunderOn(defender);
    defender.curses = defender.curses.filter((c) => c.id !== SUNDER_ID);
    const weapon = attacker.setup.weapon;
    const weaponDamage = (weapon.mightyAt ?? weapon.damage.max) / MIGHTY_SHARE;
    landHit(core, attacker, {
      source: "Rupture Plate",
      baseDamage: weaponDamage * wr.rupture.perStack * stacks,
      type: "physical",
      evadable: false,
      multiplier: 1,
      ailmentChances: [],
      fromTrigger: true,
    });
    if (core.result) return;
  }
  if (wr.mightySunder) addSunder(attacker, defender, wr.mightySunder);
}

/** Releases damage stored for the Innate (Master of the Wall, Impale) as one extra hit. */
export function releaseStored(core: FightCore, f: Fighter, source: string): void {
  if (f.stored < 1) return;
  const damage = Math.round(f.stored);
  f.stored = 0;
  emit(core, {
    t: fightTime(core),
    type: "hit",
    side: f.side,
    source,
    damage,
    damageType: "physical",
    crit: false,
    blocked: false,
  });
  dealDamage(core, core.fighters[other(f.side)], damage);
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
  f.glancingCount++;
  const spring = wr?.glancingExtraAttack;
  if (spring && f.glancingCount % spring === 0 && f.extraDepth === 0) {
    emit(core, { t: fightTime(core), type: "trigger", side: f.side, name: "Spring Trap" });
    extraAttack(core, f);
    if (core.result) return;
  }
  // Steady Breath: a Glancing Blow keeps the streaks.
  if (wr?.glancingKeepsFlow) {
    if (wr.glancingHeat) gainHeat(core, f, wr.glancingHeat);
    return;
  }
  f.flowing = false;
  f.cleanStreak = 0;
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
function cleanHit(
  core: FightCore,
  attacker: Fighter,
  defender: Fighter,
  h: HitOptions,
  damage: number,
): void {
  const wr = attacker.setup.weaponRules;
  attacker.flowing = true;
  attacker.cleanSinceSkill++;
  if (!wr) return;
  if (wr.cleanLine && !attacker.cleanLineReady) {
    attacker.cleanStreak++;
    if (attacker.cleanStreak >= wr.cleanLine.hits) {
      attacker.cleanStreak = 0;
      attacker.cleanLineReady = true;
    }
  }
  if (wr.store?.clean) attacker.stored += damage * wr.store.clean;
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

/** Crits with Weapon Mastery: Deep Cuts, Twist the Blade, Armor Shred and Arc Chain. */
function critMastery(
  core: FightCore,
  attacker: Fighter,
  defender: Fighter,
  damage: number,
  dealt: number,
): void {
  const wr = attacker.setup.weaponRules;
  if (wr?.critBarrierShred && defender.barrier > 0) {
    defender.barrier = Math.max(0, defender.barrier - defender.stats.barrier * wr.critBarrierShred);
    if (defender.barrier <= 0) react(defender, "barrierBreaks");
  }
  if (wr?.arcChain && defender.ailments.shock && dealt > 0) {
    const arc = Math.max(1, Math.round(dealt * wr.arcChain));
    emit(core, {
      t: fightTime(core),
      type: "hit",
      side: attacker.side,
      source: "Arc Chain",
      damage: arc,
      damageType: "lightning",
      crit: false,
      blocked: false,
    });
    dealDamage(core, defender, arc);
    if (core.result) return;
  }
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
  return ailmentDuration(ailment, defender.stats.tenacity) * Math.max(0, 1 + by);
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
  // Overflow: the stack pushed off at the cap deals its remaining damage at once.
  const pushed =
    ailment === "poison" && duration > 0
      ? poisonOverflow(defender.ailments, poisonCap(attacker))
      : undefined;
  const fresh = ailment === "corruption" && !defender.ailments.corruption;
  defender.ailments = applyAilment(
    defender.ailments,
    ailment,
    duration,
    hitDamage,
    poisonCap(attacker),
    attacker.stats.ailmentEffect + (wr?.ailmentEffectBy?.[ailment] ?? 0),
    COMBAT.shockMaxStacks + (wr?.shockMaxStacks ?? 0),
  );
  if (duration <= 0) return;
  // Master of the Hollow: a new Corruption starts grown.
  if (fresh && wr?.corruptionStart) {
    defender.ailments = advanceCorruption(defender.ailments, wr.corruptionStart);
  }
  if (ailment === "chill" && wr) chillMastery(core, attacker, defender);
  if (core.result) return;
  if (pushed) {
    const rest = pushed.damagePerSecond * pushed.remaining * payoffFactor(core, attacker);
    if (rest > 0) {
      const dealt = dotBurst(core, attacker, defender, rest, "Overflow");
      payoff(core, attacker, "overflow", dealt);
      burstLeech(core, attacker, dealt);
      if (core.result) return;
    }
  }
  const burst = wr?.poisonBurst;
  // A burst at 0 stacks means: at the Poison cap (Master of Venom).
  const burstAt = burst && burst.stacks > 0 ? burst.stacks : poisonCap(attacker);
  if (ailment === "poison" && burst && poisonStacks(defender.ailments) >= burstAt) {
    poisonBurst(core, attacker, defender, burst);
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

/** Frozen Solid and Master of Rime: what a Chill does with Weapon Mastery. */
function chillMastery(core: FightCore, attacker: Fighter, defender: Fighter): void {
  const wr = attacker.setup.weaponRules;
  const windup = defender.windup;
  if (wr?.chillDelay && windup && !windup.delayed) {
    windup.remaining += wr.chillDelay;
    windup.delayed = true;
  }
  const frozen = wr?.frozenSolid;
  if (!frozen) return;
  const now = fightTime(core);
  attacker.chillTimes = [...attacker.chillTimes.filter((t) => now - t < frozen.seconds), now];
  if (attacker.chillTimes.length >= frozen.chills) {
    attacker.chillTimes = [];
    emit(core, { t: now, type: "trigger", side: attacker.side, name: "Frozen Solid" });
    stun(core, defender, frozen.freeze);
  }
}

/** How many Poison stacks `attacker` can keep on a target. */
export function poisonCap(attacker: Fighter): number {
  return COMBAT.poisonMaxStacks + (attacker.setup.weaponRules?.poisonMaxStacks ?? 0);
}

/**
 * Combust (ailments-v2.md 3.1): `COMBAT.combustShare` × `times` of the Burn's remaining damage
 * at once, as Fire. The Burn keeps running. Immolate combusts three times over.
 */
export function combust(core: FightCore, attacker: Fighter, defender: Fighter, times: number) {
  const rest = remainingBurnDamage(defender.ailments);
  if (rest <= 0) return;
  const amount =
    rest *
    COMBAT.combustShare *
    (attacker.setup.weaponRules?.combustMultiplier ?? 1) *
    times *
    payoffFactor(core, attacker);
  const dealt = dotBurst(core, attacker, defender, amount, "Combust", "fire");
  payoff(core, attacker, "combust", dealt);
}

/** Toxic Bloom: every Poison stack bursts for its remaining damage at once. */
function poisonBurst(
  core: FightCore,
  attacker: Fighter,
  defender: Fighter,
  { multiplier, lockout, leech }: NonNullable<WeaponRules["poisonBurst"]>,
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
  const damage = dotBurst(core, attacker, defender, rest * multiplier, "Toxic Bloom");
  if (leech && !core.result) heal(core, attacker, damage * leech);
  burstLeech(core, attacker, damage);
}

/**
 * Poison damage that lands at once (Toxic Bloom, Toxic Burst overflow): a Physical hit that
 * scales like a DoT and leeches like a DoT tick.
 */
export function dotBurst(
  core: FightCore,
  attacker: Fighter,
  defender: Fighter,
  amount: number,
  source: string,
  damageType: DamageType = "physical",
): number {
  const damage = Math.max(1, Math.round(amount * dotFactor(core, defender)));
  emit(core, {
    t: fightTime(core),
    type: "hit",
    side: attacker.side,
    source,
    damage,
    damageType,
    crit: false,
    blocked: false,
  });
  dealDamage(core, defender, damage);
  const leech = attacker.setup.rules?.dotLifesteal ?? 0;
  if (leech > 0 && !core.result) heal(core, attacker, damage * leech);
  return damage;
}

export function heal(core: FightCore, f: Fighter, amount: number): void {
  // Smother: a burning fighter cannot heal at all.
  if (f.ailments.burn && core.fighters[other(f.side)].setup.weaponRules?.noHealWhileBurning) return;
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
