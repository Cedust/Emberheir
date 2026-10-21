import {
  type FightCore,
  type Fighter,
  damageTaken,
  emit,
  fightTime,
  heatMultiplier,
  other,
  phaseActive,
  refreshStats,
  rollRange,
} from "./fighter";
import { addHeat } from "./heat";
import {
  addBarrier,
  combust,
  dealDamage,
  extraAttack,
  extraFiresTriggers,
  heal,
  inflict,
  isMighty,
  landHit,
  stun,
} from "./hits";
import {
  type TriggerState,
  applyBuff,
  isNthAttack,
  markFired,
  triggerChance,
  triggerReady,
} from "./triggers";
import type { TriggerCondition, TriggerEffect } from "./types";

/** Item, rune and Boon triggers in a fight: their conditions fire them, their effects play. */

/** What happened in the moment a trigger condition was met. */
interface TriggerContext {
  /** Damage of the hit that fired the trigger (Burn from a trigger scales with it). */
  readonly damage?: number;
  /** The own hit's ailment base (before Crit and the "more" pool) and its source. */
  readonly ailmentDamage?: number;
  readonly source?: string;
}

/** Checks every trigger of `f` with the given condition kind. */
export function fireTriggers(
  core: FightCore,
  f: Fighter,
  kind: TriggerCondition["kind"],
  context: TriggerContext = {},
): void {
  for (const state of f.triggers) {
    if (core.result) return;
    const condition = state.spec.condition;
    if (condition.kind !== kind) continue;
    if (kind === "everyNthAttack" && !isNthAttack(condition, f.attackCount)) continue;
    if (
      condition.kind === "everyNthHitTaken" &&
      (condition.n <= 0 || f.hitsTaken % condition.n !== 0)
    ) {
      continue;
    }
    tryTrigger(core, f, state, context);
  }
}

/** Rolls the chance of a trigger whose condition is met and applies its effect. */
export function tryTrigger(
  core: FightCore,
  f: Fighter,
  state: TriggerState,
  context: TriggerContext,
): void {
  if (!triggerReady(state) || !phaseActive(f, state.spec.belowLife)) return;
  const chance = triggerChance(state.spec.chance ?? 1, f.stats.triggerChance);
  if (chance < 1 && !core.rng.chance(chance)) return;
  markFired(state);
  emit(core, { t: fightTime(core), type: "trigger", side: f.side, name: state.spec.name });
  applyEffect(core, f, state.spec.id, state.spec.name, state.spec.effect, context);
}

export function applyEffect(
  core: FightCore,
  f: Fighter,
  id: string,
  name: string,
  effect: TriggerEffect,
  context: TriggerContext,
  silent = false,
): void {
  const target = core.fighters[other(f.side)];
  switch (effect.kind) {
    case "weaponHit": {
      const roll = rollRange(core, f.setup.weapon.damage);
      const extra = effect.extra === true;
      const wr = f.setup.weaponRules;
      if (extra) f.extraDepth++;
      landHit(core, f, {
        source: name,
        baseDamage: roll * effect.multiplier,
        type: f.setup.weapon.damageType,
        evadable: true,
        multiplier: 1,
        ailmentChances: extra
          ? (wr?.extraAttackAilments ?? []).map((ailment) => ({ ailment, chance: 1 }))
          : [],
        fromTrigger: true,
        precisionApplies: true,
        ...(isMighty(f.setup.weapon, roll) ? { mighty: true } : {}),
        ...(extra ? { extraAttack: true } : {}),
        ...(extra && extraFiresTriggers(f) ? { firesTriggers: true } : {}),
        ...(extra && wr?.extraAttacksPrecise ? { precise: true } : {}),
      });
      if (extra) f.extraDepth--;
      return;
    }
    case "combust":
      combust(core, f, target, 1);
      return;
    case "spellHit":
      landHit(core, f, {
        source: effect.name,
        baseDamage: rollRange(core, effect.damage),
        type: effect.damageType,
        evadable: false,
        multiplier: 1,
        ailmentChances: [],
        fromTrigger: true,
      });
      return;
    case "ailment": {
      const weapon = f.setup.weapon.damage;
      const hit =
        context.ailmentDamage ??
        (context.damage !== undefined
          ? context.damage / (1 + damageTaken(target))
          : (weapon.min + weapon.max) / 2);
      const before = core.ailmentSource;
      if (context.source) core.ailmentSource = context.source;
      inflict(core, f, target, effect.ailment, hit);
      core.ailmentSource = before;
      return;
    }
    case "heal":
      heal(core, f, f.stats.maxLife * effect.fraction);
      return;
    case "barrier":
      addBarrier(core, f, f.stats.maxLife * effect.fraction);
      return;
    case "heat": {
      const before = f.heat;
      f.heat = addHeat(f.heat, effect.amount, heatMultiplier(core, f));
      emit(core, { t: fightTime(core), type: "heatGain", side: f.side, amount: f.heat - before });
      return;
    }
    case "buff": {
      f.buffs = applyBuff(
        f.buffs,
        { id, name, stat: effect.stat, amount: effect.amount, remaining: effect.duration },
        effect.maxStacks ?? 1,
      );
      refreshStats(f);
      if (silent) return;
      const stacks = f.buffs.find((b) => b.id === id)?.stacks ?? 1;
      emit(core, {
        t: fightTime(core),
        type: "buff",
        side: f.side,
        stat: effect.stat,
        amount: effect.amount,
        stacks,
        duration: effect.duration,
      });
      return;
    }
    case "extraAttack":
      extraAttack(core, f);
      return;
    case "stun":
      stun(core, target, effect.seconds, effect.breaksSwing);
      return;
    case "reflect": {
      if (!context.damage) return;
      const damage = Math.max(
        1,
        Math.round(Math.min(context.damage * effect.fraction, target.stats.maxLife * effect.cap)),
      );
      emit(core, {
        t: fightTime(core),
        type: "hit",
        side: f.side,
        source: name,
        damage,
        damageType: effect.damageType,
        crit: false,
        blocked: false,
      });
      dealDamage(core, target, damage);
      return;
    }
  }
}
