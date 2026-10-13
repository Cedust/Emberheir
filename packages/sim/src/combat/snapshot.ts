import { COMBAT } from "./constants";
import { type FighterSnapshot, type RotationSlotSnapshot } from "./events";
import { type FightCore, type Fighter, attackRate, phaseActive, skillCost } from "./fighter";
import { triggerThreshold } from "./heat";
import { slotCost } from "./rotation";
import type { CombatantSetup } from "./types";
import { AILMENT_TYPES } from "./types";

/** A fighter as the UI sees it after a tick (`FighterSnapshot`). */

/** The Rotation as the HUD shows it; it is fixed for a fight, so it is built once per setup. */
const rotationSnapshots = new WeakMap<CombatantSetup, readonly RotationSlotSnapshot[]>();

function rotationSnapshot(setup: CombatantSetup): readonly RotationSlotSnapshot[] {
  let rotation = rotationSnapshots.get(setup);
  if (!rotation) {
    rotation = setup.rotation.map((slot) => {
      const cost = skillCost(setup, slot.skill);
      return {
        skillId: slot.skill.id,
        name: slot.skill.name,
        heatCost: cost,
        threshold: triggerThreshold(cost, slot.threshold),
      };
    });
    rotationSnapshots.set(setup, rotation);
  }
  return rotation;
}

export function fighterSnapshot(core: FightCore, f: Fighter): FighterSnapshot {
  return {
    side: f.side,
    name: f.setup.name,
    level: f.setup.level,
    weapon: f.setup.weapon.name,
    defaultAttack: f.setup.weapon.defaultAttack,
    heatBehavior: f.setup.weapon.heatBehavior,
    life: f.life,
    maxLife: f.stats.maxLife,
    barrier: f.barrier,
    heat: f.heat,
    maxHeat: COMBAT.maxHeat,
    rotation: rotationSnapshot(f.setup),
    nextSlot: f.nextSlot,
    reactions: f.reactions.map((r) => ({
      skillId: r.spec.skill.id,
      name: r.spec.skill.name,
      heatCost: slotCost(f, r.spec.skill, r.spec.modifiers),
      cooldownLeft: r.cooldownLeft,
      pending: r.pending !== null,
    })),
    ailments: AILMENT_TYPES.flatMap((type): FighterSnapshot["ailments"] => {
      if (type === "poison") {
        const stacks = f.ailments.poison?.stacks ?? [];
        if (!stacks.length) return [];
        const remaining = Math.max(...stacks.map((s) => s.remaining));
        return [{ type, remaining, stacks: stacks.length }];
      }
      const state = f.ailments[type];
      return state ? [{ type, remaining: state.remaining }] : [];
    }),
    curses: f.curses.map((c) => ({
      name: c.name,
      dotDamageTaken: c.dotDamageTaken,
      ...(c.armor ? { armor: c.armor } : {}),
      ...(c.stacks ? { stacks: c.stacks } : {}),
      remaining: c.remaining,
    })),
    buffs: f.buffs.map((b) => ({
      name: b.name,
      stat: b.stat,
      amount: b.amount,
      stacks: b.stacks,
      remaining: b.remaining,
    })),
    stats: f.stats,
    stunned: f.stunned,
    telegraph: f.windup
      ? {
          skill: f.setup.telegraphs?.[f.windup.index]?.skill.name ?? "",
          remaining: Math.max(0, f.windup.remaining),
          windup: f.setup.telegraphs?.[f.windup.index]?.windup ?? 0,
        }
      : null,
    attackProgress: f.attackProgress,
    attackRate: f.windup || f.stunned > 1e-9 ? 0 : attackRate(core, f),
    nextHeavy: nextHeavy(f),
  };
}

/** The telegraph that winds up next, if one is waiting for its interval (its phase is on). */
function nextHeavy(f: Fighter): FighterSnapshot["nextHeavy"] {
  if (f.windup) return null;
  let best: FighterSnapshot["nextHeavy"] = null;
  (f.setup.telegraphs ?? []).forEach((spec, i) => {
    if (!phaseActive(f, spec.belowLife)) return;
    const left = Math.max(0, spec.interval - (f.telegraphTimers[i] ?? 0));
    if (!best || left < best.in) best = { skill: spec.skill.name, in: left, windup: spec.windup };
  });
  return best;
}
