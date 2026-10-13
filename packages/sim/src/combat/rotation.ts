import { ailmentStacks, poisonStacks } from "./ailments";
import { COMBAT } from "./constants";
import { type FightCore, type Fighter, other, skillCost, SUNDER_ID } from "./fighter";
import { castSkill } from "./skills";
import type {
  MasteryCondition,
  RotationSlot,
  SkillDefinition,
  SlotCondition,
  SlotModifier,
} from "./types";

/** The Battle Plan in a fight: Rotation slots, their conditions and the Reaction Slots. */

export function advanceRotation(f: Fighter): void {
  const length = Math.max(1, f.setup.rotation.length);
  f.nextSlot = (f.nextSlot + 1) % length;
  if (f.nextSlot === 0) f.rotationPasses++;
}

/** Overflow (Weapon Mastery): skills cost less while Heat is high. */
export function overflowCost(f: Fighter, cost: number): number {
  const overflow = f.setup.weaponRules?.overflow;
  return overflow && f.heat >= overflow.above ? Math.round(cost * (1 - overflow.discount)) : cost;
}

/** Heat Cost of a slot: rules (Keystones) and the Thrifty modifier. */
export function slotCost(
  f: Fighter,
  skill: SkillDefinition,
  modifiers: readonly SlotModifier[] | undefined,
): number {
  const base = skillCost(f.setup, skill);
  return modifiers?.includes("thrifty") ? Math.round(base * 0.85) : base;
}

export function slotLevel(
  level: number | undefined,
  modifiers: readonly SlotModifier[] | undefined,
) {
  return (level ?? 1) + (modifiers?.includes("empowered") ? 1 : 0);
}

/** "Skip if…": a Rotation Slot with a condition only fires while it holds. */
export function slotReady(core: FightCore, f: Fighter, slot: RotationSlot): boolean {
  return slot.condition ? conditionHolds(core, f, slot.condition) : true;
}

export function conditionHolds(
  core: FightCore,
  f: Fighter,
  condition: SlotCondition | MasteryCondition,
): boolean {
  const target = core.fighters[other(f.side)];
  switch (condition.kind) {
    case "enemyStunned":
      return target.stunned > 1e-9;
    case "enemySundered": {
      const max = (f.setup.weaponRules?.sunder ?? COMBAT.sunder).maxStacks;
      return (target.curses.find((c) => c.id === SUNDER_ID)?.stacks ?? 0) >= max;
    }
    case "enemyHas":
      return condition.ailment === "poison"
        ? poisonStacks(target.ailments) > 0
        : target.ailments[condition.ailment] !== undefined;
    case "enemyBelow":
      return target.life / target.stats.maxLife < condition.fraction;
    case "lifeBelow":
      return f.life / f.stats.maxLife < condition.fraction;
  }
}

/** Casts a slot's skill and rolls Reverb (20 % chance to repeat it for free). */
export function castSlot(
  core: FightCore,
  f: Fighter,
  skill: SkillDefinition,
  level: number,
  paid: number,
  power: number,
  modifiers: readonly SlotModifier[] | undefined,
  via?: "reaction",
): void {
  castSkill(core, f, skill, level, paid, power, via);
  if (core.result || !modifiers?.includes("reverb")) return;
  if (core.rng.chance(0.2)) castSkill(core, f, skill, level, 0, 1, "reverb");
}

/** Marks Reaction Slots of `f` whose condition just happened as pending. */
export function react(
  f: Fighter,
  kind: "fightStart" | "enemyWindup" | "ailmented" | "enemyHeals" | "barrierBreaks",
): void {
  for (const r of f.reactions) {
    if (r.spec.condition.kind === kind && r.cooldownLeft <= 1e-9) r.pending = 0;
  }
}

/** Threshold reactions: fire once when the value drops below, re-arm once it is back above. */
export function checkReactionThresholds(core: FightCore): void {
  for (const side of ["hero", "enemy"] as const) {
    const f = core.fighters[side];
    const target = core.fighters[other(side)];
    for (const r of f.reactions) {
      const c = r.spec.condition;
      let below: boolean;
      if (c.kind === "enemyStacks") {
        below = ailmentStacks(target.ailments) >= c.count;
      } else if (c.kind === "lifeBelow" || c.kind === "enemyBelow") {
        const who = c.kind === "lifeBelow" ? f : target;
        below = who.life / who.stats.maxLife < c.fraction;
      } else {
        continue;
      }
      if (!below) {
        r.armed = true;
      } else if (r.armed && r.cooldownLeft <= 1e-9) {
        r.armed = false;
        r.pending = 0;
      }
    }
  }
}

/** Fires the first pending Reaction Slot if Heat allows. True if one fired. */
export function actReaction(core: FightCore, f: Fighter): boolean {
  const vigil = f.setup.capstone?.kind === "vigil";
  for (const r of f.reactions) {
    if (r.pending === null) continue;
    const cost = vigil ? 0 : slotCost(f, r.spec.skill, r.spec.modifiers);
    if (f.heat < cost) continue;
    f.heat -= cost;
    r.pending = null;
    r.cooldownLeft = r.spec.cooldown * (vigil ? 2 : 1);
    castSlot(
      core,
      f,
      r.spec.skill,
      slotLevel(r.spec.level, r.spec.modifiers),
      cost,
      1,
      r.spec.modifiers,
      "reaction",
    );
    return true;
  }
  return false;
}
