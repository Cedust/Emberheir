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
  perk,
  rollRange,
  usePerk,
} from "./fighter";
import { addHeat } from "./heat";
import {
  addBarrier,
  addSunder,
  dealDamage,
  dotBurst,
  heal,
  landHit,
  poisonCap,
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
  const target = core.fighters[other(f.side)];
  let landed = false;
  let clean = false;
  for (const hit of skill.hits) {
    const count = hit.count ?? 1;
    for (let i = 0; i < count && !core.result; i++) {
      if (hit.kind === "weapon") {
        const lowLife =
          hit.lowLifeBonus && target.life / target.stats.maxLife < hit.lowLifeBonus.threshold;
        const levelScale = 1 + COMBAT.attackDamagePerSkillLevel * (level - 1);
        const result = landHit(core, f, {
          source: skill.name,
          baseDamage: rollRange(core, f.setup.weapon.damage) * hit.multiplier * levelScale * power,
          type: hit.damageType ?? f.setup.weapon.damageType,
          evadable: true,
          multiplier: lowLife && hit.lowLifeBonus ? hit.lowLifeBonus.multiplier : 1,
          ailmentChances: hit.ailmentChances ?? [],
          ailmentPower: hit.ailmentPower ?? 1,
          ...(hit.penetration ? { penetration: hit.penetration } : {}),
          fromTrigger: false,
          precisionApplies: true,
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
      const rest = remainingBleedDamage(target.ailments);
      if (rest <= 0) return;
      target.ailments = clearAilment(target.ailments, "bleed");
      emit(core, {
        t: fightTime(core),
        type: "ailmentExpired",
        side: target.side,
        ailment: "bleed",
      });
      const levelScale = 1 + COMBAT.attackDamagePerSkillLevel * (level - 1);
      const damage = Math.max(
        1,
        Math.round(rest * effect.multiplier * levelScale * (1 + damageTaken(target))),
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
      if (overflow > 0) dotBurst(core, f, target, overflow, skill.name);
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
