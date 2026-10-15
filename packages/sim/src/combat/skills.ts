import {
  advanceCorruption,
  clearAilment,
  dotDamagePerSecond,
  extendAilments,
  multiplyPoison,
  poisonStacks,
  remainingBleedDamage,
} from "./ailments";
import { COMBAT } from "./constants";
import {
  type FightCore,
  type Fighter,
  damageTaken,
  dotFactor,
  emit,
  fightTime,
  other,
  payoffFactor,
  perk,
  mark,
  rollRange,
  usePerk,
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
import type { SkillDefinition, SkillEffect } from "./types";

/** Casting a skill (Rotation, Reaction, Opening Move, Echo) and what its effects do. */

/**
 * Casts a skill. `power` scales its hits (Overcharge, Echo); `via` marks casts that did not
 * come from the Rotation.
 */
export function castSkill(
  core: FightCore,
  f: Fighter,
  skill: SkillDefinition,
  level: number,
  heatCost = 0,
  power = 1,
  via?: "reaction" | "reverb" | "echo" | "opening",
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
  f.cleanSinceSkill = 0;
  if (heatCost > 0 && f.perks.has("afterglow")) {
    f.heat = addHeat(f.heat, heatCost * PERK.afterglowRefund, 1);
    perk(core, f, "afterglow");
  }
  if (skill.type === "spell" && usePerk(f, "spellfire")) {
    perk(core, f, "spellfire");
    power *= PERK.spellfireDamage;
  }
  fireTriggers(core, f, "onSkillUse");
  if (core.result) return;
  // Spark (Sorcerer): the Default Attack after a skill is charged.
  if (f.setup.rules?.spark) f.sparkReady = true;
  const target = core.fighters[other(f.side)];
  let landed = false;
  let clean = false;
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
          type: hit.damageType ?? f.setup.weapon.damageType,
          evadable: true,
          multiplier: lowLife && hit.lowLifeBonus ? hit.lowLifeBonus.multiplier : 1,
          ailmentChances: hit.ailmentChances ?? [],
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
          type: hit.damageType,
          evadable: false,
          multiplier: 1,
          ailmentChances: hit.ailmentChances ?? [],
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
  if (core.result || via === "reverb" || via === "echo") return;
  f.skillCount++;
  // Echoing Chant: every few skills repeat themselves, weaker.
  const chant = wr?.echoChant;
  if (chant && f.skillCount % chant.every === 0) {
    castSkill(core, f, skill, level, 0, chant.power, "reverb");
    if (core.result) return;
  }
  // Master of Tempo: after the Innate, Rotation Slot 1 again for free.
  const repeat = wr?.repeatFirstSlot;
  const first = f.setup.rotation.find((r) => r.skill.id !== skill.id);
  if (innate && repeat && first && fightTime(core) + 1e-9 >= f.repeatReadyAt) {
    f.repeatReadyAt = fightTime(core) + repeat.cooldown;
    castSkill(core, f, first.skill, first.level ?? 1, 0, 1, "echo");
  }
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
      if (overflow > 0) dotBurst(core, f, target, overflow * payoffFactor(core, f), skill.name);
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
