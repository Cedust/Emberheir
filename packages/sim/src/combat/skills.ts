import {
  DOT_AILMENTS,
  advanceCorruption,
  clearAilment,
  dotDamagePerSecond,
  extendAilments,
  multiplyPoison,
  poisonStacks,
  remainingBleedDamage,
  remainingDotDamage,
  remainingDotSources,
} from "./ailments";
import { COMBAT } from "./constants";
import {
  type FightCore,
  type Fighter,
  damageTaken,
  dotFactor,
  emit,
  fightTime,
  furyBonus,
  other,
  payoffFactor,
  perk,
  mark,
  payoff,
  rollRange,
  weaponAilment,
  weaponDamageOf,
} from "./fighter";
import { addHeat } from "./heat";
import {
  addBarrier,
  addSunder,
  combust,
  dealDamage,
  dotBurst,
  heal,
  isMighty,
  landHit,
  poisonCap,
  releaseStored,
  stun,
} from "./hits";
import { PERK } from "./perks";
import { applyEffect, fireTriggers } from "./trigger-effects";
import type { AilmentChance, SkillDefinition, SkillEffect } from "./types";

/** Casting a skill (Rotation, Reaction, Opening Move, Echo) and what its effects do. */

/**
 * Casts a skill. `power` scales its hits (Echo, Spellfire); `more` joins the "more" pool of its
 * hits (Overcharge, Arcane Conduit); `via` marks casts that did not come from the Rotation.
 */
export function castSkill(
  core: FightCore,
  f: Fighter,
  skill: SkillDefinition,
  level: number,
  heatCost = 0,
  power = 1,
  via?: "reaction" | "reverb" | "echo" | "opening" | "twin",
  more = 0,
): void {
  emit(core, {
    t: fightTime(core),
    type: "skill",
    side: f.side,
    skill: skill.name,
    heatCost,
    ...(via ? { via } : {}),
  });
  f.heatSpent += heatCost;
  f.lastSkillAt = fightTime(core);
  mark(core, f, "skill");
  const wr = f.setup.weaponRules;
  const innate = wr?.innateId !== undefined && skill.id === wr.innateId;
  if (innate) f.freeInnate = false;
  // Fury (Cinderguard): the Innate spends all Fury the Default Attacks gathered.
  if (innate && f.fury > 0 && f.setup.rules?.fury && via !== "twin") {
    more += furyBonus(f);
    f.fury = 0;
    payoff(core, f, "fury");
  }
  f.cleanSinceSkill = 0;
  if (heatCost > 0 && f.perks.has("afterglow")) {
    f.heat = addHeat(f.heat, heatCost * PERK.afterglowRefund, 1);
    perk(core, f, "afterglow");
  }
  fireTriggers(core, f, "onSkillUse");
  if (core.result) return;
  // Spark (Sorcerer): the Default Attack after a skill is charged.
  if (f.setup.rules?.spark) f.sparkCharges = Math.max(f.sparkCharges, 1);
  const target = core.fighters[other(f.side)];
  let landed = false;
  let clean = false;
  // A Cash In of the weapon's own ailment sets off what is already there before the skill
  // strikes, so it never cashes in the ailment it applies itself.
  const cashesFirst = (e: SkillEffect) => e.kind === "cashIn" && e.own === true;
  for (const effect of skill.effects ?? []) {
    if (cashesFirst(effect)) applySkillEffect(core, f, target, skill, effect, level);
    if (core.result) return;
  }
  for (const hit of skill.hits) {
    const count = hit.count ?? 1;
    for (let i = 0; i < count && !core.result; i++) {
      if (hit.kind === "weapon") {
        const weapon = f.setup.weapon;
        const rolled = rollRange(core, weapon.damage);
        // Master of Payload: this hit is always a Mighty Hit.
        const roll =
          hit.mighty && weapon.mightyAt !== undefined ? Math.max(rolled, weapon.mightyAt) : rolled;
        const lowLife =
          hit.lowLifeBonus && target.life / target.stats.maxLife < hit.lowLifeBonus.threshold;
        const levelScale = 1 + COMBAT.attackDamagePerSkillLevel * (level - 1);
        const result = landHit(core, f, {
          source: skill.name,
          baseDamage: roll * hit.multiplier * levelScale * power,
          ...(more ? { more } : {}),
          type: hit.damageType ?? f.setup.weapon.damageType,
          evadable: true,
          multiplier: lowLife && hit.lowLifeBonus ? hit.lowLifeBonus.multiplier : 1,
          ailmentChances: hit.infused
            ? infusedChances(f, hit.ailmentChances)
            : (hit.ailmentChances ?? []),
          ailmentPower: hit.ailmentPower ?? 1,
          ...(hit.penetration ? { penetration: hit.penetration } : {}),
          fromTrigger: false,
          precisionApplies: true,
          fromSkill: true,
          ...(isMighty(weapon, roll) ? { mighty: true } : {}),
          ...(hit.precise ? { precise: true } : {}),
        });
        landed = result !== "miss" || landed;
        clean = result === "clean" || clean;
      } else {
        const levelScale =
          (1 + COMBAT.spellDamagePerSkillLevel * (level - 1)) * (f.setup.weapon.spellPower ?? 1);
        const result = landHit(core, f, {
          source: skill.name,
          baseDamage: rollRange(core, hit.damage) * levelScale * (hit.falloff ?? 1) ** i * power,
          ...(more ? { more } : {}),
          type: hit.infused ? f.setup.weapon.damageType : hit.damageType,
          evadable: false,
          multiplier: 1,
          ailmentChances: hit.infused
            ? infusedChances(f, hit.ailmentChances)
            : (hit.ailmentChances ?? []),
          ailmentPower: hit.ailmentPower ?? 1,
          fromTrigger: false,
          precisionApplies: true,
          fromSkill: true,
          ...(hit.precise ? { precise: true } : {}),
        });
        landed = result !== "miss" || landed;
        clean = result === "clean" || clean;
      }
    }
  }
  for (const effect of skill.effects ?? []) {
    if (core.result) return;
    if (cashesFirst(effect)) continue;
    if (effect.kind === "refundHeat") {
      if (clean && heatCost > 0) f.heat = addHeat(f.heat, heatCost * effect.fraction, 1);
      continue;
    }
    applySkillEffect(core, f, target, skill, effect, level);
  }
  // Spellblade: a skill that hits also strikes with the weapon.
  const blade = f.setup.rules?.spellblade;
  if (blade && skill.hits.length > 0 && !core.result) {
    const roll = rollRange(core, f.setup.weapon.damage);
    landHit(core, f, {
      source: `${skill.name} (Spellblade)`,
      baseDamage: roll * blade.multiplier * power,
      ...(more ? { more } : {}),
      type: f.setup.weapon.damageType,
      evadable: true,
      multiplier: 1,
      ailmentChances: f.setup.weapon.ailmentChances ?? [],
      fromTrigger: false,
      precisionApplies: true,
      fromSkill: true,
      ...(isMighty(f.setup.weapon, roll) ? { mighty: true } : {}),
    });
  }
  if (core.result) return;
  // Master of the Wall, Impale: the Innate releases the stored damage.
  if (innate && wr?.store) {
    releaseStored(core, f, wr.store.clean ? "Impale" : "Master of the Wall");
    if (core.result) return;
  }
  f.afterSkill = true;
  if (wr?.siphonEmber && heatCost > 0)
    heal(core, f, f.stats.maxLife * wr.siphonEmber * (heatCost / 10));
  const capstone = f.setup.capstone?.kind;
  if (capstone === "lingeringFlame" && landed && !core.result) {
    target.ailments = extendAilments(target.ailments, 0.5);
  }
  if (capstone === "emberWard" && heatCost > 0) {
    // 100 Heat paid = 10 % of Max Life as Barrier; this source fills it up to 20 %.
    const cap = f.stats.maxLife * 0.2;
    const gain = Math.min(Math.max(0, cap - f.barrier), f.stats.maxLife * heatCost * 0.001);
    if (gain >= 1) {
      f.barrier += Math.round(gain);
      emit(core, { t: fightTime(core), type: "barrier", side: f.side, amount: Math.round(gain) });
    }
  }
  if (core.result || via === "reverb" || via === "echo" || via === "twin") return;
  f.skillCount++;
  overcharge(core, f);
  if (core.result) return;
  // Echoing Chant: every few skills repeat themselves, weaker.
  const chant = wr?.echoChant;
  if (chant && f.skillCount % chant.every === 0) {
    castSkill(core, f, skill, level, 0, chant.power, "reverb");
  }
}

/**
 * Overcharge (Emberseer): every skill gives a charge; a full set breaks loose as a Nova of the
 * weapon's element that always applies its ailment.
 */
function overcharge(core: FightCore, f: Fighter): void {
  const rule = f.setup.rules?.overcharge;
  if (!rule) return;
  f.charges++;
  if (f.charges < rule.charges) return;
  f.charges = 0;
  const weapon = f.setup.weapon;
  const ailment = weaponAilment(weapon);
  payoff(core, f, "overcharge");
  landHit(core, f, {
    source: "Overcharge",
    baseDamage: weaponDamageOf(weapon) * rule.multiplier,
    type: weapon.damageType,
    evadable: false,
    multiplier: 1,
    ailmentChances: ailment ? [{ ailment, chance: 1 }] : [],
    fromTrigger: true,
  });
}

function applySkillEffect(
  core: FightCore,
  f: Fighter,
  target: Fighter,
  skill: SkillDefinition,
  effect: SkillEffect,
  level: number,
): void {
  switch (effect.kind) {
    case "buff":
      applyEffect(
        core,
        f,
        skill.id,
        skill.name,
        { kind: "buff", stat: effect.stat, amount: effect.amount, duration: effect.duration },
        {},
      );
      return;
    case "consumeBleed": {
      const all = remainingBleedDamage(target.ailments);
      if (all <= 0) return;
      const consumed = remainingDotSources(target.ailments, ["bleed"]);
      // Hooked Rend, Master Butcher: only a share bursts, the rest bleeds on.
      const share = Math.min(1, effect.share ?? f.setup.weaponRules?.consumeBleedShare ?? 1);
      const rest = all * share;
      const bleed = target.ailments.bleed;
      if (share < 1 && bleed) {
        target.ailments = {
          ...target.ailments,
          bleed: { ...bleed, damagePerSecond: bleed.damagePerSecond * (1 - share) },
        };
      } else {
        target.ailments = clearAilment(target.ailments, "bleed");
        emit(core, {
          t: fightTime(core),
          type: "ailmentExpired",
          side: target.side,
          ailment: "bleed",
        });
      }
      const levelScale = 1 + COMBAT.attackDamagePerSkillLevel * (level - 1);
      const damage = Math.max(
        1,
        Math.round(
          rest * effect.multiplier * levelScale * (1 + damageTaken(target)) * payoffFactor(core, f),
        ),
      );
      emit(core, {
        t: fightTime(core),
        type: "hit",
        side: f.side,
        source: skill.name,
        damage,
        damageType: "physical",
        crit: false,
        blocked: false,
        ...ownDotShare(consumed, effect.multiplier * levelScale),
      });
      dealDamage(core, target, damage);
      if (effect.leech && !core.result) heal(core, f, damage * effect.leech);
      return;
    }
    case "multiplyPoison": {
      const before = poisonStacks(target.ailments);
      if (before === 0) return;
      const { states, overflow } = multiplyPoison(target.ailments, effect.factor, poisonCap(f));
      target.ailments = states;
      emit(core, {
        t: fightTime(core),
        type: "ailment",
        side: target.side,
        ailment: "poison",
        stacks: poisonStacks(target.ailments),
      });
      // Stacks over the cap burst at once for their remaining damage.
      if (overflow > 0) {
        dotBurst(
          core,
          f,
          target,
          overflow * payoffFactor(core, f),
          skill.name,
          "physical",
          "poison",
        );
      }
      return;
    }
    case "heal":
      heal(core, f, f.stats.maxLife * effect.fraction);
      return;
    case "barrier":
      addBarrier(
        core,
        f,
        f.stats.maxLife * effect.fraction * (1 + COMBAT.spellDamagePerSkillLevel * (level - 1)),
      );
      return;
    case "stun":
      stun(core, target, effect.seconds);
      return;
    case "sunder":
      target.curses = [
        ...target.curses.filter((c) => c.id !== skill.id),
        {
          id: skill.id,
          name: "Sunder",
          dotDamageTaken: 0,
          armor: effect.armor,
          remaining: effect.duration,
        },
      ];
      return;
    case "advanceCorruption":
      target.ailments = advanceCorruption(target.ailments, effect.ticks);
      return;
    case "sunderStacks":
      addSunder(f, target, effect.stacks);
      return;
    case "refundHeat":
      return;
    case "curse":
      target.curses = [
        ...target.curses.filter((c) => c.id !== skill.id),
        {
          id: skill.id,
          name: skill.name,
          dotDamageTaken: effect.dotDamageTaken,
          remaining: effect.duration,
        },
      ];
      return;
    case "combust":
      combust(core, f, target, effect.times);
      return;
    case "cashIn":
      cashIn(core, f, target, skill, effect.multiplier, level, effect.own === true);
      return;
    case "detonateDots": {
      const perSecond = dotDamagePerSecond(target.ailments);
      if (perSecond <= 0) return;
      const levelScale = 1 + COMBAT.spellDamagePerSkillLevel * (level - 1);
      const damage = Math.max(
        1,
        Math.round(perSecond * effect.seconds * levelScale * dotFactor(core, target)),
      );
      emit(core, {
        t: fightTime(core),
        type: "hit",
        side: f.side,
        source: skill.name,
        damage,
        damageType: "void",
        crit: false,
        blocked: false,
      });
      dealDamage(core, target, damage);
      if (effect.leech && !core.result) heal(core, f, damage * effect.leech);
      return;
    }
  }
}

/**
 * Cash In: every DoT on the target ends and its remaining damage lands at once, as the skill's
 * own hit. It scales like the DoTs it ends (their pool, with Skill Damage added to it), plus the skill's level, and
 * Lifesteal heals from it like from any hit.
 */
function cashIn(
  core: FightCore,
  f: Fighter,
  target: Fighter,
  skill: SkillDefinition,
  multiplier: number,
  level: number,
  own: boolean,
): void {
  const weapon = weaponAilment(f.setup.weapon);
  const ends = DOT_AILMENTS.filter((a) => target.ailments[a] && (!own || a === weapon));
  const rest = ends.reduce((sum, a) => sum + remainingDotDamage({ [a]: target.ailments[a] }), 0);
  if (rest <= 0) return;
  const consumed = remainingDotSources(target.ailments, ends);
  for (const ailment of ends) {
    target.ailments = clearAilment(target.ailments, ailment);
    emit(core, { t: fightTime(core), type: "ailmentExpired", side: target.side, ailment });
  }
  const levelScale = 1 + COMBAT.attackDamagePerSkillLevel * (level - 1);
  // Skill Damage joins the DoT pool instead of multiplying it.
  const skillDamage = (f.setup.weaponRules?.skillDamage ?? 0) + (f.setup.rules?.skillDamage ?? 0);
  const damage = Math.max(
    1,
    Math.round(
      rest *
        multiplier *
        levelScale *
        dotFactor(core, target, undefined, skillDamage) *
        payoffFactor(core, f),
    ),
  );
  emit(core, {
    t: fightTime(core),
    type: "hit",
    side: f.side,
    source: skill.name,
    damage,
    damageType: f.setup.weapon.damageType,
    crit: false,
    blocked: false,
    ...ownDotShare(consumed, multiplier * levelScale),
  });
  payoff(core, f, "cashIn", damage);
  dealDamage(core, target, damage);
  if (!core.result) heal(core, f, damage * f.stats.lifesteal);
}

/**
 * Damage reports of a burst that ends DoTs: the part that is the DoTs' own damage (everything but
 * the skill's multiplier and level) belongs to whoever applied them.
 */
function ownDotShare(
  sources: Record<string, number>,
  scale: number,
): { dotSources?: Record<string, number> } {
  const own = Math.min(1, 1 / Math.max(1, scale));
  const entries = Object.entries(sources);
  return entries.length
    ? { dotSources: Object.fromEntries(entries.map(([s, v]) => [s, v * own])) }
    : {};
}

/** An infused hit applies the weapon's ailment with the best listed chance (none for Stun). */
function infusedChances(
  f: Fighter,
  chances: readonly AilmentChance[] | undefined,
): AilmentChance[] {
  const ailment = weaponAilment(f.setup.weapon);
  if (!ailment || !chances?.length) return [];
  return [{ ailment, chance: Math.max(...chances.map((c) => c.chance)) }];
}
