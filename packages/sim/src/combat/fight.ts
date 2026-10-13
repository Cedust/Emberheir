import { Rng } from "../rng";
import { chillFactor, stepAilments } from "./ailments";
import { COMBAT } from "./constants";
import { type CombatEvent, type FightResult, type FightSnapshot } from "./events";
import {
  type FightCore,
  type Fighter,
  buffRunning,
  createFighter,
  dotFactor,
  emit,
  endFight,
  fightTime,
  heatMultiplier,
  other,
  perk,
  phaseActive,
  REACTION_PATIENCE,
  refreshStats,
} from "./fighter";
import { addHeat, stepHeat, triggerThreshold } from "./heat";
import { dealDamage, defaultAttack, heal, rechargeBarrier } from "./hits";
import { PERK } from "./perks";
import {
  actReaction,
  advanceRotation,
  castSlot,
  conditionHolds,
  overflowCost,
  react,
  slotCost,
  slotLevel,
  slotReady,
} from "./rotation";
import { castSkill } from "./skills";
import { fighterSnapshot } from "./snapshot";
import { fireTriggers, tryTrigger } from "./trigger-effects";
import { stepBuffs, stepTriggers } from "./triggers";
import type { CombatantSetup, RotationSlot, Side } from "./types";

/**
 * The fight loop: `Fight` (public API) and one tick of it. The rest of a fight lives next to it:
 *
 * - `fighter.ts`: a fighter's state in the fight (`Fighter`), the fight's state (`FightCore`)
 *   and the small helpers every part uses (emit, perks, Heat and damage factors, the end).
 * - `rotation.ts`: the Battle Plan in the fight: Rotation slots, conditions, Reaction Slots.
 * - `skills.ts`: casting a skill and what its effects do.
 * - `hits.ts`: Default Attacks and resolving a hit (evade, Glancing Blow, crits, ailments,
 *   damage, healing, Barrier).
 * - `trigger-effects.ts`: item and Boon triggers firing in the fight.
 * - `snapshot.ts`, `events.ts`: what the UI sees (snapshots, the combat log).
 *
 * All of them are functions over the `FightCore` that `Fight` holds.
 */

/** Ailments, DoT ticks and passive Heat. */
function stepStatus(core: FightCore, f: Fighter, dt: number): void {
  rechargeBarrier(core, f, dt);
  const { states, ticks, expired } = stepAilments(f.ailments, dt);
  f.ailments = states;
  for (const tick of ticks) {
    const byAilment = core.fighters[other(f.side)].setup.rules?.ailmentDamage?.[tick.ailment] ?? 1;
    const hide = f.perks.has("thickSkin") ? 1 - PERK.thickSkinDotTaken : 1;
    const damage = Math.max(1, Math.round(tick.damage * dotFactor(core, f) * byAilment * hide));
    emit(core, { t: fightTime(core), type: "dot", side: f.side, ailment: tick.ailment, damage });
    dealDamage(core, f, damage);
    if (core.result) return;
    const source = core.fighters[other(f.side)];
    const leech = source.setup.rules?.dotLifesteal ?? 0;
    if (leech > 0) heal(core, source, damage * leech);
    const wr = source.setup.weaponRules;
    if (wr?.heatPerDotTick?.ailment === tick.ailment) {
      source.heat = addHeat(source.heat, wr.heatPerDotTick.amount, heatMultiplier(core, source));
    }
    if (wr?.rampage?.ailment === tick.ailment) source.rampage += wr.rampage.perTick;
  }
  f.poisonLockout = Math.max(0, f.poisonLockout - dt);
  f.curses = f.curses
    .map((c) => ({ ...c, remaining: c.remaining - dt }))
    .filter((c) => c.remaining > 1e-9);
  for (const ailment of expired) {
    emit(core, { t: fightTime(core), type: "ailmentExpired", side: f.side, ailment });
  }

  const behavior = f.setup.weapon.heatBehavior;
  const holds = (f.setup.rules?.noHeatDecay || (f.setup.weaponRules?.flow && f.flowing)) ?? false;
  f.heat = stepHeat(
    holds && behavior === "cooling" ? "steady" : behavior,
    f.heat,
    dt,
    heatMultiplier(core, f),
  );

  const buffs = stepBuffs(f.buffs, dt);
  if (buffs.expired) {
    f.buffs = buffs.buffs;
    refreshStats(f);
  } else {
    f.buffs = buffs.buffs;
  }

  for (const index of stepTriggers(f.triggers, dt)) {
    const state = f.triggers[index];
    if (state) tryTrigger(core, f, state, {});
    if (core.result) return;
  }

  for (const r of f.reactions) {
    r.cooldownLeft = Math.max(0, r.cooldownLeft - dt);
    if (r.pending === null) continue;
    r.pending += dt;
    if (r.pending > REACTION_PATIENCE) r.pending = null;
  }
}

/** Winds up telegraphed Heavy Attacks and unleashes them when the wind-up is over. */
function stepTelegraphs(core: FightCore, f: Fighter, dt: number): void {
  if (f.stunned > 1e-9) {
    f.stunned = Math.max(0, f.stunned - dt);
    return;
  }
  const telegraphs = f.setup.telegraphs;
  if (!telegraphs?.length) return;
  if (f.windup) {
    f.windup.remaining -= dt;
    if (f.windup.remaining > 1e-9) return;
    const spec = telegraphs[f.windup.index];
    f.windup = null;
    if (spec) {
      core.heavyFrom = f.side;
      castSkill(core, f, spec.skill, 1);
      core.heavyFrom = null;
    }
    return;
  }
  for (let i = 0; i < telegraphs.length; i++) {
    const spec = telegraphs[i];
    if (!spec || !phaseActive(f, spec.belowLife)) continue;
    f.telegraphTimers[i] = (f.telegraphTimers[i] ?? 0) + dt;
    if ((f.telegraphTimers[i] ?? 0) + 1e-9 < spec.interval) continue;
    f.telegraphTimers[i] = 0;
    f.windup = { index: i, remaining: spec.windup };
    react(core.fighters[other(f.side)], "enemyWindup");
    fireTriggers(core, core.fighters[other(f.side)], "enemyWindup");
    if (core.result) return;
    emit(core, {
      t: fightTime(core),
      type: "telegraph",
      side: f.side,
      skill: spec.skill.name,
      windup: spec.windup,
    });
    return;
  }
}

/**
 * A pending Reaction Slot goes first if Heat allows. Otherwise the next Rotation skill fires if
 * Heat reached its Trigger Threshold, else a Default Attack. Rotation slots whose buff (or curse)
 * still runs, or whose "skip if" condition does not hold, are passed over.
 */
function takeTurn(core: FightCore, f: Fighter): void {
  if (actReaction(core, f)) return;
  const rotation = f.setup.rotation;
  let slot: RotationSlot | undefined;
  for (let tries = 0; tries < rotation.length; tries++) {
    const candidate = rotation[f.nextSlot];
    if (candidate && !buffRunning(core, f, candidate.skill) && slotReady(core, f, candidate)) {
      slot = candidate;
      break;
    }
    advanceRotation(f);
  }
  const index = f.nextSlot;
  const free = f.setup.capstone?.kind === "ignition" && f.rotationPasses === 0;
  const cost = slot && !free ? overflowCost(f, slotCost(f, slot.skill, slot.modifiers)) : 0;
  const threshold = slot ? triggerThreshold(cost, free ? 0 : slot.threshold) : 0;
  if (slot && f.heat >= threshold) {
    const overcharge = slot.modifiers?.includes("overcharge") ? Math.max(0, f.heat - cost) : 0;
    const paid = cost + overcharge;
    f.heat -= paid;
    advanceRotation(f);
    const power = 1 + Math.min(0.5, overcharge / 100);
    castSlot(
      core,
      f,
      slot.skill,
      slotLevel(slot.level, slot.modifiers),
      paid,
      power,
      slot.modifiers,
    );
    const capstone = f.setup.capstone;
    if (!core.result && capstone?.kind === "echo" && capstone.slot === index) {
      castSkill(core, f, slot.skill, slotLevel(slot.level, slot.modifiers), 0, 0.5, "echo");
    }
    return;
  }
  defaultAttack(core, f);
}

/** Swings per second: Attack Speed, Chill and Weapon Mastery's conditional Attack Speed. */
export function attackRate(core: FightCore, f: Fighter): number {
  let extra = 0;
  for (const e of f.setup.weaponRules?.conditionalAttackSpeed ?? []) {
    if (conditionHolds(core, f, e.condition)) extra += e.amount;
  }
  return f.stats.attackSpeed * (1 + extra) * chillFactor(f.ailments);
}

/** Plays one tick of the fight and returns its events. */
function stepFight(core: FightCore): readonly CombatEvent[] {
  if (core.result) return [];
  const start = core.log.length;
  if (core.ticks === 0) {
    for (const side of ["hero", "enemy"] as const) {
      if (core.fighters[side].perks.has("innerFire")) perk(core, core.fighters[side], "innerFire");
      fireTriggers(core, core.fighters[side], "fightStart");
      if (core.result) return core.log.slice(start);
      react(core.fighters[side], "fightStart");
      const opening = core.fighters[side].setup.openingMove;
      if (opening) {
        castSkill(core, core.fighters[side], opening.skill, opening.level ?? 1, 0, 1, "opening");
        if (core.result) return core.log.slice(start);
      }
    }
  }
  core.ticks++;
  const dt = COMBAT.tickSeconds;

  for (const side of ["hero", "enemy"] as const) {
    stepStatus(core, core.fighters[side], dt);
    if (core.result) return core.log.slice(start);
    stepTelegraphs(core, core.fighters[side], dt);
    if (core.result) return core.log.slice(start);
  }

  // Fill both action bars; whoever passed 1 earlier inside this tick acts first.
  // A fighter winding up a Heavy Attack does not attack meanwhile.
  const ready: { fighter: Fighter; overshoot: number }[] = [];
  for (const side of ["hero", "enemy"] as const) {
    const f = core.fighters[side];
    if (f.windup || f.stunned > 1e-9) continue;
    const rate = attackRate(core, f);
    f.attackProgress += dt * rate;
    if (f.attackProgress >= 1) {
      f.attackProgress -= 1;
      ready.push({ fighter: f, overshoot: rate > 0 ? f.attackProgress / rate : 0 });
    }
  }
  ready.sort((a, b) => b.overshoot - a.overshoot);
  for (const { fighter } of ready) {
    takeTurn(core, fighter);
    if (core.result) break;
  }

  if (!core.result) {
    for (const f of [core.fighters.enemy, core.fighters.hero]) {
      if (f.setup.fleeAfter !== undefined && fightTime(core) >= f.setup.fleeAfter) {
        emit(core, { t: fightTime(core), type: "flee", side: f.side });
        endFight(core, null, f.side);
        break;
      }
    }
  }
  if (!core.result && fightTime(core) >= COMBAT.maxFightSeconds) endFight(core, null);
  return core.log.slice(start);
}

/**
 * A deterministic 1v1 fight on a fixed time step. Same setups + same seed = same fight.
 *
 * Use `step()`/`advance()` to play a fight in real time (UI) or `runFight()` to resolve it at
 * once (balance CLI).
 */
export class Fight {
  private readonly core: FightCore;
  /** Fight time asked for by `advance` so far; ticks run until `time` catches up with it. */
  private requested = 0;

  constructor(hero: CombatantSetup, enemy: CombatantSetup, seed: number) {
    this.core = {
      rng: new Rng(seed),
      fighters: { hero: createFighter("hero", hero), enemy: createFighter("enemy", enemy) },
      log: [],
      ticks: 0,
      result: undefined,
      heavyFrom: null,
    };
  }

  get time(): number {
    return fightTime(this.core);
  }

  get over(): boolean {
    return this.core.result !== undefined;
  }

  get winner(): Side | null {
    return this.core.result?.winner ?? null;
  }

  get fled(): Side | null {
    return this.core.result?.fled ?? null;
  }

  /** The full combat log so far. */
  get events(): readonly CombatEvent[] {
    return this.core.log;
  }

  /** Advances the fight by one tick and returns the events of that tick. */
  step(): readonly CombatEvent[] {
    return stepFight(this.core);
  }

  /**
   * Runs ticks until `seconds` more of fight time have passed or the fight is over. The requested
   * time adds up across calls, so many short calls (one per rendered frame) play in real time: a
   * call shorter than a tick runs no tick or one, never one per call.
   */
  advance(seconds: number): readonly CombatEvent[] {
    const start = this.core.log.length;
    this.requested = Math.max(this.requested, this.time - COMBAT.tickSeconds) + seconds;
    while (!this.core.result && this.time + 1e-9 < this.requested) this.step();
    return this.core.log.slice(start);
  }

  /** Resolves the fight to the end. */
  runToEnd(): void {
    while (!this.core.result) this.step();
  }

  snapshot(): FightSnapshot {
    return {
      time: this.time,
      over: this.over,
      winner: this.winner,
      fled: this.fled,
      hero: fighterSnapshot(this.core, this.core.fighters.hero),
      enemy: fighterSnapshot(this.core, this.core.fighters.enemy),
    };
  }
}

/** Resolves a whole fight at once. */
export function runFight(hero: CombatantSetup, enemy: CombatantSetup, seed: number): FightResult {
  const fight = new Fight(hero, enemy, seed);
  fight.runToEnd();
  return {
    winner: fight.winner,
    fled: fight.fled,
    duration: fight.time,
    events: fight.events,
    final: fight.snapshot(),
  };
}
