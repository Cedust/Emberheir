import { Rng } from "../rng";
import {
  type AilmentStates,
  advanceCorruption,
  ailmentDuration,
  ailmentStacks,
  applyAilment,
  chillFactor,
  clearAilment,
  damageTakenBonus,
  dotDamagePerSecond,
  extendAilments,
  healingFactor,
  multiplyPoison,
  poisonStacks,
  remainingBleedDamage,
  stepAilments,
} from "./ailments";
import { COMBAT } from "./constants";
import { resolveHit } from "./damage";
import {
  addHeat,
  heatFromHitTaken,
  heatFromOwnHit,
  heatGainMultiplier,
  stepHeat,
  triggerThreshold,
} from "./heat";
import { type DerivedStats, deriveStats, sumBonuses } from "./stats";
import {
  type BuffState,
  type TriggerState,
  applyBuff,
  buffBonuses,
  createTriggerState,
  isNthAttack,
  markFired,
  stepBuffs,
  stepTriggers,
  triggerChance,
  triggerReady,
} from "./triggers";
import { AILMENT_TYPES } from "./types";
import type {
  AilmentChance,
  AilmentType,
  BuffStat,
  CombatRules,
  CombatantSetup,
  DamageRange,
  DamageType,
  HeatBehavior,
  ReactionSlot,
  RotationSlot,
  Side,
  SkillDefinition,
  SkillEffect,
  SlotCondition,
  SlotModifier,
  TriggerCondition,
  TriggerEffect,
} from "./types";

/** One entry of the combat log. `side` is always the fighter the event is about. */
export type CombatEvent =
  | {
      readonly t: number;
      readonly type: "skill";
      readonly side: Side;
      readonly skill: string;
      readonly heatCost: number;
      /** How it was cast, if not by the Rotation: a Reaction Slot or a free repeat. */
      readonly via?: "reaction" | "reverb" | "echo" | "opening";
    }
  | {
      readonly t: number;
      readonly type: "hit";
      /** Attacker. */
      readonly side: Side;
      /** Default Attack or skill name. */
      readonly source: string;
      readonly damage: number;
      readonly damageType: DamageType;
      readonly crit: boolean;
      readonly blocked: boolean;
    }
  | { readonly t: number; readonly type: "evade"; readonly side: Side; readonly source: string }
  | {
      readonly t: number;
      readonly type: "ailment";
      readonly side: Side;
      readonly ailment: AilmentType;
      /** Poison stacks after this application. */
      readonly stacks?: number;
    }
  | {
      readonly t: number;
      readonly type: "ailmentExpired";
      readonly side: Side;
      readonly ailment: AilmentType;
    }
  | {
      readonly t: number;
      readonly type: "dot";
      readonly side: Side;
      readonly ailment: AilmentType;
      readonly damage: number;
    }
  | { readonly t: number; readonly type: "heal"; readonly side: Side; readonly amount: number }
  /** A trigger affix (or weapon trigger) fired. Its effect follows as separate events. */
  | { readonly t: number; readonly type: "trigger"; readonly side: Side; readonly name: string }
  | {
      readonly t: number;
      readonly type: "barrier";
      readonly side: Side;
      readonly amount: number;
    }
  | {
      readonly t: number;
      readonly type: "buff";
      readonly side: Side;
      readonly stat: BuffStat;
      readonly amount: number;
      readonly stacks: number;
      readonly duration: number;
    }
  | {
      readonly t: number;
      readonly type: "heatGain";
      readonly side: Side;
      readonly amount: number;
    }
  /** A telegraphed Heavy Attack starts winding up; `skill` fires after `windup` seconds. */
  | {
      readonly t: number;
      readonly type: "telegraph";
      readonly side: Side;
      readonly skill: string;
      readonly windup: number;
    }
  /** The fighter is stunned and cannot act for `seconds`. */
  | { readonly t: number; readonly type: "stun"; readonly side: Side; readonly seconds: number }
  | { readonly t: number; readonly type: "death"; readonly side: Side }
  | {
      readonly t: number;
      readonly type: "fightEnd";
      readonly winner: Side | null;
      readonly fled?: Side;
    }
  /** A fighter with `fleeAfter` ran away; the fight ends without a winner. */
  | { readonly t: number; readonly type: "flee"; readonly side: Side };

export interface ReactionSlotSnapshot {
  readonly skillId: string;
  readonly name: string;
  readonly heatCost: number;
  /** Seconds until the slot is ready again. */
  readonly cooldownLeft: number;
  /** The condition was met; the skill fires as soon as Heat allows. */
  readonly pending: boolean;
}

export interface RotationSlotSnapshot {
  readonly skillId: string;
  readonly name: string;
  readonly heatCost: number;
  readonly threshold: number;
}

export interface FighterSnapshot {
  readonly side: Side;
  readonly name: string;
  readonly level: number;
  readonly weapon: string;
  readonly defaultAttack: string;
  readonly heatBehavior: HeatBehavior;
  readonly life: number;
  readonly maxLife: number;
  /** Temporary extra life that absorbs damage first. */
  readonly barrier: number;
  readonly heat: number;
  readonly maxHeat: number;
  readonly rotation: readonly RotationSlotSnapshot[];
  /** Index into `rotation` of the next skill. */
  readonly nextSlot: number;
  readonly reactions: readonly ReactionSlotSnapshot[];
  /** Active ailments; Poison also tells its stacks (`remaining` = longest stack). */
  readonly ailments: readonly {
    readonly type: AilmentType;
    readonly remaining: number;
    readonly stacks?: number;
  }[];
  readonly buffs: readonly {
    readonly name: string;
    readonly stat: BuffStat;
    readonly amount: number;
    readonly stacks: number;
    readonly remaining: number;
  }[];
  /** Curses on this fighter (Wither) and Sunder. */
  readonly curses: readonly {
    readonly name: string;
    readonly dotDamageTaken: number;
    /** Sunder: share of Armor that no longer counts. */
    readonly armor?: number;
    readonly remaining: number;
  }[];
  /** Current stats including active buffs. */
  readonly stats: DerivedStats;
  /** Seconds the fighter is still stunned (0 = can act). */
  readonly stunned: number;
  /** A Heavy Attack that is winding up right now. */
  readonly telegraph: {
    readonly skill: string;
    readonly remaining: number;
    readonly windup: number;
  } | null;
}

export interface FightSnapshot {
  readonly time: number;
  readonly over: boolean;
  /** `null` while running or after a draw (time limit). */
  readonly winner: Side | null;
  /** The side that ran away, if one did (the fight then has no winner). */
  readonly fled: Side | null;
  readonly hero: FighterSnapshot;
  readonly enemy: FighterSnapshot;
}

interface Fighter {
  readonly side: Side;
  readonly setup: CombatantSetup;
  /** Stats without buffs. */
  readonly baseStats: DerivedStats;
  /** Stats with buffs, recomputed whenever a buff starts or ends. */
  stats: DerivedStats;
  life: number;
  barrier: number;
  heat: number;
  /** 0..1, a Default Attack or skill fires when it reaches 1. */
  attackProgress: number;
  nextSlot: number;
  ailments: AilmentStates;
  /** Default Attacks so far (for "Every Nth Attack"). Extra attacks from triggers do not count. */
  attackCount: number;
  readonly triggers: TriggerState[];
  buffs: BuffState[];
  curses: {
    id: string;
    name: string;
    dotDamageTaken: number;
    /** Sunder: share of Armor that no longer counts. */
    armor?: number;
    remaining: number;
  }[];
  /** Seconds since the last telegraph ended, per telegraph. */
  telegraphTimers: number[];
  /** The telegraph winding up right now. */
  windup: { index: number; remaining: number } | null;
  /** Seconds the fighter is still stunned. */
  stunned: number;
  /** Hits taken that were not evaded (for "Every Nth Hit Taken"). */
  hitsTaken: number;
  readonly reactions: ReactionState[];
  /** Heat spent on skills so far (Crescendo). */
  heatSpent: number;
  /** Full passes through the Rotation so far (Ignition makes the first one free). */
  rotationPasses: number;
}

interface ReactionState {
  readonly spec: ReactionSlot;
  cooldownLeft: number;
  /** Thresholds: false after firing until the value is back above. */
  armed: boolean;
  /** Seconds the met condition has been waiting for Heat; null = not waiting. */
  pending: number | null;
}

/** A reaction waits this long for Heat before it gives up. */
const REACTION_PATIENCE = 4;

/** What happened in the moment a trigger condition was met. */
interface TriggerContext {
  /** Damage of the hit that fired the trigger (Burn from a trigger scales with it). */
  readonly damage?: number;
}

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
}

const other = (side: Side): Side => (side === "hero" ? "enemy" : "hero");

/** Heat Cost of a Rotation skill after rule changes (e.g. Keystones). */
export function skillCost(setup: CombatantSetup, skill: SkillDefinition): number {
  return Math.max(0, Math.round(skill.heatCost * (setup.rules?.skillCostMultiplier ?? 1)));
}

/** Execute (Legendary Power): more damage against an enemy below the life threshold. */
function executeFactor(rules: CombatRules | undefined, defender: Fighter): number {
  const execute = rules?.execute;
  if (!execute) return 1;
  return defender.life / defender.stats.maxLife < execute.below ? 1 + execute.bonus : 1;
}

/** Crescendo (Capstone): +2 % damage for every 100 Heat spent this fight. */
function crescendoFactor(f: Fighter): number {
  return f.setup.capstone?.kind === "crescendo" ? 1 + 0.02 * Math.floor(f.heatSpent / 100) : 1;
}

function createFighter(side: Side, setup: CombatantSetup): Fighter {
  const stats = deriveStats(setup);
  const lifeFraction = Math.min(1, Math.max(0, setup.lifeFraction ?? 1));
  const triggers = [...(setup.weapon.triggers ?? []), ...(setup.triggers ?? [])];
  return {
    side,
    setup,
    baseStats: stats,
    stats,
    life: Math.max(1, Math.round(stats.maxLife * lifeFraction)),
    barrier: 0,
    heat: setup.capstone?.kind === "ignition" ? COMBAT.maxHeat : stats.startingHeat,
    attackProgress: 0,
    nextSlot: 0,
    ailments: {},
    attackCount: 0,
    triggers: triggers.map(createTriggerState),
    buffs: [],
    curses: [],
    telegraphTimers: (setup.telegraphs ?? []).map(() => 0),
    windup: null,
    stunned: 0,
    hitsTaken: 0,
    reactions: (setup.reactions ?? []).map((spec) => ({
      spec,
      cooldownLeft: 0,
      armed: true,
      pending: null,
    })),
    heatSpent: 0,
    rotationPasses: 0,
  };
}

/** Gear ailment chances (Chance to Burn etc.) are added to the hit's own chances. */
function withStatAilmentChances(
  chances: readonly AilmentChance[],
  stats: DerivedStats,
): AilmentChance[] {
  const extra: Record<AilmentType, number> = {
    burn: stats.burnChance,
    chill: stats.chillChance,
    shock: stats.shockChance,
    corruption: stats.corruptionChance,
    bleed: stats.bleedChance,
    poison: stats.poisonChance,
  };
  const merged = chances.map((c) => ({
    ailment: c.ailment,
    chance: Math.min(1, c.chance + extra[c.ailment]),
  }));
  for (const ailment of AILMENT_TYPES) {
    if (extra[ailment] > 0 && !chances.some((c) => c.ailment === ailment)) {
      merged.push({ ailment, chance: extra[ailment] });
    }
  }
  return merged;
}

/**
 * A deterministic 1v1 fight on a fixed time step. Same setups + same seed = same fight.
 *
 * Use `step()`/`advance()` to play a fight in real time (UI) or `runFight()` to resolve it at
 * once (balance CLI).
 */
export class Fight {
  private readonly rng: Rng;
  private readonly fighters: Record<Side, Fighter>;
  private readonly log: CombatEvent[] = [];
  private ticks = 0;
  /** Fight time asked for by `advance` so far; ticks run until `time` catches up with it. */
  private requested = 0;
  private result: { winner: Side | null; fled: Side | null } | undefined;

  constructor(hero: CombatantSetup, enemy: CombatantSetup, seed: number) {
    this.rng = new Rng(seed);
    this.fighters = { hero: createFighter("hero", hero), enemy: createFighter("enemy", enemy) };
  }

  get time(): number {
    return Math.round(this.ticks * COMBAT.tickSeconds * 1000) / 1000;
  }

  get over(): boolean {
    return this.result !== undefined;
  }

  get winner(): Side | null {
    return this.result?.winner ?? null;
  }

  get fled(): Side | null {
    return this.result?.fled ?? null;
  }

  /** The full combat log so far. */
  get events(): readonly CombatEvent[] {
    return this.log;
  }

  /** Advances the fight by one tick and returns the events of that tick. */
  step(): readonly CombatEvent[] {
    if (this.result) return [];
    const start = this.log.length;
    if (this.ticks === 0) {
      for (const side of ["hero", "enemy"] as const) {
        this.fireTriggers(this.fighters[side], "fightStart");
        if (this.result) return this.log.slice(start);
        this.react(this.fighters[side], "fightStart");
        const opening = this.fighters[side].setup.openingMove;
        if (opening) {
          this.castSkill(this.fighters[side], opening.skill, opening.level ?? 1, 0, 1, "opening");
          if (this.result) return this.log.slice(start);
        }
      }
    }
    this.ticks++;
    const dt = COMBAT.tickSeconds;

    for (const side of ["hero", "enemy"] as const) {
      this.stepStatus(this.fighters[side], dt);
      if (this.result) return this.log.slice(start);
      this.stepTelegraphs(this.fighters[side], dt);
      if (this.result) return this.log.slice(start);
    }

    // Fill both action bars; whoever passed 1 earlier inside this tick acts first.
    // A fighter winding up a Heavy Attack does not attack meanwhile.
    const ready: { fighter: Fighter; overshoot: number }[] = [];
    for (const side of ["hero", "enemy"] as const) {
      const f = this.fighters[side];
      if (f.windup || f.stunned > 1e-9) continue;
      const rate = f.stats.attackSpeed * chillFactor(f.ailments);
      f.attackProgress += dt * rate;
      if (f.attackProgress >= 1) {
        f.attackProgress -= 1;
        ready.push({ fighter: f, overshoot: rate > 0 ? f.attackProgress / rate : 0 });
      }
    }
    ready.sort((a, b) => b.overshoot - a.overshoot);
    for (const { fighter } of ready) {
      this.act(fighter);
      if (this.result) break;
    }

    if (!this.result) {
      for (const f of [this.fighters.enemy, this.fighters.hero]) {
        if (f.setup.fleeAfter !== undefined && this.time >= f.setup.fleeAfter) {
          this.emit({ t: this.time, type: "flee", side: f.side });
          this.end(null, f.side);
          break;
        }
      }
    }
    if (!this.result && this.time >= COMBAT.maxFightSeconds) this.end(null);
    return this.log.slice(start);
  }

  /**
   * Runs ticks until `seconds` more of fight time have passed or the fight is over. The requested
   * time adds up across calls, so many short calls (one per rendered frame) play in real time: a
   * call shorter than a tick runs no tick or one, never one per call.
   */
  advance(seconds: number): readonly CombatEvent[] {
    const start = this.log.length;
    this.requested = Math.max(this.requested, this.time - COMBAT.tickSeconds) + seconds;
    while (!this.result && this.time + 1e-9 < this.requested) this.step();
    return this.log.slice(start);
  }

  /** Resolves the fight to the end. */
  runToEnd(): void {
    while (!this.result) this.step();
  }

  snapshot(): FightSnapshot {
    return {
      time: this.time,
      over: this.over,
      winner: this.winner,
      fled: this.fled,
      hero: this.fighterSnapshot(this.fighters.hero),
      enemy: this.fighterSnapshot(this.fighters.enemy),
    };
  }

  // --- internals -------------------------------------------------------------------------

  private emit(event: CombatEvent): void {
    this.log.push(event);
  }

  /** "+X % damage taken" from Shock and rules (Keystones). */
  private damageTaken(f: Fighter): number {
    return damageTakenBonus(f.ailments) + (f.setup.rules?.damageTaken ?? 0);
  }

  private heatMultiplier(f: Fighter): number {
    return heatGainMultiplier(f.stats.heatGain, chillFactor(f.ailments));
  }

  /** Multiplier on damage over time dealt to `f`: damage taken, curses and the source's rules. */
  private dotFactor(f: Fighter): number {
    const cursed = f.curses.reduce((sum, c) => sum + c.dotDamageTaken, 0);
    const source = this.fighters[other(f.side)];
    return (1 + this.damageTaken(f) + cursed) * (source.setup.rules?.dotDamage ?? 1);
  }

  /** Ailments, DoT ticks and passive Heat. */
  private stepStatus(f: Fighter, dt: number): void {
    const { states, ticks, expired } = stepAilments(f.ailments, dt);
    f.ailments = states;
    for (const tick of ticks) {
      const byAilment =
        this.fighters[other(f.side)].setup.rules?.ailmentDamage?.[tick.ailment] ?? 1;
      const damage = Math.max(1, Math.round(tick.damage * this.dotFactor(f) * byAilment));
      this.emit({ t: this.time, type: "dot", side: f.side, ailment: tick.ailment, damage });
      this.damage(f, damage);
      if (this.result) return;
      const source = this.fighters[other(f.side)];
      const leech = source.setup.rules?.dotLifesteal ?? 0;
      if (leech > 0) this.heal(source, damage * leech);
    }
    f.curses = f.curses
      .map((c) => ({ ...c, remaining: c.remaining - dt }))
      .filter((c) => c.remaining > 1e-9);
    for (const ailment of expired) {
      this.emit({ t: this.time, type: "ailmentExpired", side: f.side, ailment });
    }

    const behavior = f.setup.weapon.heatBehavior;
    f.heat = stepHeat(
      f.setup.rules?.noHeatDecay && behavior === "cooling" ? "steady" : behavior,
      f.heat,
      dt,
      this.heatMultiplier(f),
    );

    const buffs = stepBuffs(f.buffs, dt);
    if (buffs.expired) {
      f.buffs = buffs.buffs;
      this.refreshStats(f);
    } else {
      f.buffs = buffs.buffs;
    }

    for (const index of stepTriggers(f.triggers, dt)) {
      const state = f.triggers[index];
      if (state) this.tryTrigger(f, state, {});
      if (this.result) return;
    }

    for (const r of f.reactions) {
      r.cooldownLeft = Math.max(0, r.cooldownLeft - dt);
      if (r.pending === null) continue;
      r.pending += dt;
      if (r.pending > REACTION_PATIENCE) r.pending = null;
    }
  }

  /** Winds up telegraphed Heavy Attacks and unleashes them when the wind-up is over. */
  private stepTelegraphs(f: Fighter, dt: number): void {
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
      if (spec) this.castSkill(f, spec.skill, 1);
      return;
    }
    for (let i = 0; i < telegraphs.length; i++) {
      const spec = telegraphs[i];
      if (!spec || !this.phaseActive(f, spec.belowLife)) continue;
      f.telegraphTimers[i] = (f.telegraphTimers[i] ?? 0) + dt;
      if ((f.telegraphTimers[i] ?? 0) + 1e-9 < spec.interval) continue;
      f.telegraphTimers[i] = 0;
      f.windup = { index: i, remaining: spec.windup };
      this.react(this.fighters[other(f.side)], "enemyWindup");
      this.fireTriggers(this.fighters[other(f.side)], "enemyWindup");
      if (this.result) return;
      this.emit({
        t: this.time,
        type: "telegraph",
        side: f.side,
        skill: spec.skill.name,
        windup: spec.windup,
      });
      return;
    }
  }

  /** Boss phases: a trigger or telegraph with `belowLife` waits until life drops below it. */
  private phaseActive(f: Fighter, belowLife: number | undefined): boolean {
    return belowLife === undefined || f.life / f.stats.maxLife < belowLife;
  }

  /**
   * A pending Reaction Slot goes first if Heat allows. Otherwise the next Rotation skill fires if
   * Heat reached its Trigger Threshold, else a Default Attack. Rotation slots whose buff (or curse)
   * still runs, or whose "skip if" condition does not hold, are passed over.
   */
  private act(f: Fighter): void {
    if (this.actReaction(f)) return;
    const rotation = f.setup.rotation;
    let slot: RotationSlot | undefined;
    for (let tries = 0; tries < rotation.length; tries++) {
      const candidate = rotation[f.nextSlot];
      if (candidate && !this.buffRunning(f, candidate.skill) && this.slotReady(f, candidate)) {
        slot = candidate;
        break;
      }
      this.advanceRotation(f);
    }
    const index = f.nextSlot;
    const free = f.setup.capstone?.kind === "ignition" && f.rotationPasses === 0;
    const cost = slot && !free ? this.slotCost(f, slot.skill, slot.modifiers) : 0;
    const threshold = slot ? triggerThreshold(cost, free ? 0 : slot.threshold) : 0;
    if (slot && f.heat >= threshold) {
      const overcharge = slot.modifiers?.includes("overcharge") ? Math.max(0, f.heat - cost) : 0;
      const paid = cost + overcharge;
      f.heat -= paid;
      this.advanceRotation(f);
      const power = 1 + Math.min(0.5, overcharge / 100);
      this.castSlot(
        f,
        slot.skill,
        this.slotLevel(slot.level, slot.modifiers),
        paid,
        power,
        slot.modifiers,
      );
      const capstone = f.setup.capstone;
      if (!this.result && capstone?.kind === "echo" && capstone.slot === index) {
        this.castSkill(f, slot.skill, this.slotLevel(slot.level, slot.modifiers), 0, 0.5, "echo");
      }
      return;
    }
    this.defaultAttack(f);
  }

  private advanceRotation(f: Fighter): void {
    const length = Math.max(1, f.setup.rotation.length);
    f.nextSlot = (f.nextSlot + 1) % length;
    if (f.nextSlot === 0) f.rotationPasses++;
  }

  /** Heat Cost of a slot: rules (Keystones) and the Thrifty modifier. */
  private slotCost(
    f: Fighter,
    skill: SkillDefinition,
    modifiers: readonly SlotModifier[] | undefined,
  ): number {
    const base = skillCost(f.setup, skill);
    return modifiers?.includes("thrifty") ? Math.round(base * 0.85) : base;
  }

  private slotLevel(level: number | undefined, modifiers: readonly SlotModifier[] | undefined) {
    return (level ?? 1) + (modifiers?.includes("empowered") ? 1 : 0);
  }

  /** "Skip if…": a Rotation Slot with a condition only fires while it holds. */
  private slotReady(f: Fighter, slot: RotationSlot): boolean {
    return slot.condition ? this.conditionHolds(f, slot.condition) : true;
  }

  private conditionHolds(f: Fighter, condition: SlotCondition): boolean {
    const target = this.fighters[other(f.side)];
    switch (condition.kind) {
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
  private castSlot(
    f: Fighter,
    skill: SkillDefinition,
    level: number,
    paid: number,
    power: number,
    modifiers: readonly SlotModifier[] | undefined,
    via?: "reaction",
  ): void {
    this.castSkill(f, skill, level, paid, power, via);
    if (this.result || !modifiers?.includes("reverb")) return;
    if (this.rng.chance(0.2)) this.castSkill(f, skill, level, 0, 1, "reverb");
  }

  /** Marks Reaction Slots of `f` whose condition just happened as pending. */
  private react(
    f: Fighter,
    kind: "fightStart" | "enemyWindup" | "ailmented" | "enemyHeals" | "barrierBreaks",
  ): void {
    for (const r of f.reactions) {
      if (r.spec.condition.kind === kind && r.cooldownLeft <= 1e-9) r.pending = 0;
    }
  }

  /** Threshold reactions: fire once when the value drops below, re-arm once it is back above. */
  private checkReactionThresholds(): void {
    for (const side of ["hero", "enemy"] as const) {
      const f = this.fighters[side];
      const target = this.fighters[other(side)];
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
  private actReaction(f: Fighter): boolean {
    const vigil = f.setup.capstone?.kind === "vigil";
    for (const r of f.reactions) {
      if (r.pending === null) continue;
      const cost = vigil ? 0 : this.slotCost(f, r.spec.skill, r.spec.modifiers);
      if (f.heat < cost) continue;
      f.heat -= cost;
      r.pending = null;
      r.cooldownLeft = r.spec.cooldown * (vigil ? 2 : 1);
      this.castSlot(
        f,
        r.spec.skill,
        this.slotLevel(r.spec.level, r.spec.modifiers),
        cost,
        1,
        r.spec.modifiers,
        "reaction",
      );
      return true;
    }
    return false;
  }

  /** A buff skill whose buff still runs, or a curse that still sits on the target. */
  private buffRunning(f: Fighter, skill: SkillDefinition): boolean {
    const effects = skill.effects ?? [];
    if (effects.some((e) => e.kind === "buff") && f.buffs.some((b) => b.id === skill.id)) {
      return true;
    }
    const target = this.fighters[other(f.side)];
    return effects.some((e) => e.kind === "curse") && target.curses.some((c) => c.id === skill.id);
  }

  /** A Default Attack. Extra attacks from triggers (`fromTrigger`) fire no further triggers. */
  private defaultAttack(f: Fighter, fromTrigger = false): void {
    const weapon = f.setup.weapon;
    const landed = this.hit(f, {
      source: weapon.defaultAttack,
      baseDamage: this.roll(weapon.damage),
      type: weapon.damageType,
      evadable: true,
      multiplier: f.setup.rules?.defaultAttackDamage ?? 1,
      ailmentChances: weapon.ailmentChances ?? [],
      fromTrigger,
    });
    if (this.result) return;
    if (landed) {
      f.heat = addHeat(
        f.heat,
        heatFromOwnHit(weapon.heatBehavior, weapon.heatPerHit),
        this.heatMultiplier(f),
      );
    }
    if (!fromTrigger) {
      f.attackCount++;
      this.fireTriggers(f, "everyNthAttack");
    }
  }

  /**
   * Casts a skill. `power` scales its hits (Overcharge, Echo); `via` marks casts that did not
   * come from the Rotation.
   */
  private castSkill(
    f: Fighter,
    skill: SkillDefinition,
    level: number,
    heatCost = 0,
    power = 1,
    via?: "reaction" | "reverb" | "echo" | "opening",
  ): void {
    this.emit({
      t: this.time,
      type: "skill",
      side: f.side,
      skill: skill.name,
      heatCost,
      ...(via ? { via } : {}),
    });
    f.heatSpent += heatCost;
    this.fireTriggers(f, "onSkillUse");
    if (this.result) return;
    const target = this.fighters[other(f.side)];
    let landed = false;
    for (const hit of skill.hits) {
      const count = hit.count ?? 1;
      for (let i = 0; i < count && !this.result; i++) {
        if (hit.kind === "weapon") {
          const lowLife =
            hit.lowLifeBonus && target.life / target.stats.maxLife < hit.lowLifeBonus.threshold;
          const levelScale = 1 + COMBAT.attackDamagePerSkillLevel * (level - 1);
          const ok = this.hit(f, {
            source: skill.name,
            baseDamage: this.roll(f.setup.weapon.damage) * hit.multiplier * levelScale * power,
            type: f.setup.weapon.damageType,
            evadable: true,
            multiplier: lowLife && hit.lowLifeBonus ? hit.lowLifeBonus.multiplier : 1,
            ailmentChances: hit.ailmentChances ?? [],
            ailmentPower: hit.ailmentPower ?? 1,
            ...(hit.penetration ? { penetration: hit.penetration } : {}),
            fromTrigger: false,
          });
          landed = ok || landed;
        } else {
          const levelScale =
            (1 + COMBAT.spellDamagePerSkillLevel * (level - 1)) * (f.setup.weapon.spellPower ?? 1);
          const ok = this.hit(f, {
            source: skill.name,
            baseDamage: this.roll(hit.damage) * levelScale * (hit.falloff ?? 1) ** i * power,
            type: hit.damageType,
            evadable: false,
            multiplier: 1,
            ailmentChances: hit.ailmentChances ?? [],
            ailmentPower: hit.ailmentPower ?? 1,
            fromTrigger: false,
          });
          landed = ok || landed;
        }
      }
    }
    for (const effect of skill.effects ?? []) {
      if (this.result) return;
      this.applySkillEffect(f, target, skill, effect, level);
    }
    const capstone = f.setup.capstone?.kind;
    if (capstone === "lingeringFlame" && landed && !this.result) {
      target.ailments = extendAilments(target.ailments, 0.5);
    }
    if (capstone === "emberWard" && heatCost > 0) {
      // 100 Heat paid = 10 % of Max Life as Barrier; this source fills it up to 20 %.
      const cap = f.stats.maxLife * 0.2;
      const gain = Math.min(Math.max(0, cap - f.barrier), f.stats.maxLife * heatCost * 0.001);
      if (gain >= 1) {
        f.barrier += Math.round(gain);
        this.emit({ t: this.time, type: "barrier", side: f.side, amount: Math.round(gain) });
      }
    }
  }

  private applySkillEffect(
    f: Fighter,
    target: Fighter,
    skill: SkillDefinition,
    effect: SkillEffect,
    level: number,
  ): void {
    switch (effect.kind) {
      case "buff":
        this.applyEffect(
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
        this.emit({ t: this.time, type: "ailmentExpired", side: target.side, ailment: "bleed" });
        const levelScale = 1 + COMBAT.attackDamagePerSkillLevel * (level - 1);
        const damage = Math.max(
          1,
          Math.round(rest * effect.multiplier * levelScale * (1 + this.damageTaken(target))),
        );
        this.emit({
          t: this.time,
          type: "hit",
          side: f.side,
          source: skill.name,
          damage,
          damageType: "physical",
          crit: false,
          blocked: false,
        });
        this.damage(target, damage);
        return;
      }
      case "multiplyPoison": {
        const before = poisonStacks(target.ailments);
        if (before === 0) return;
        target.ailments = multiplyPoison(target.ailments, effect.factor);
        this.emit({
          t: this.time,
          type: "ailment",
          side: target.side,
          ailment: "poison",
          stacks: poisonStacks(target.ailments),
        });
        return;
      }
      case "heal":
        this.heal(f, f.stats.maxLife * effect.fraction);
        return;
      case "barrier":
        this.addBarrier(
          f,
          f.stats.maxLife * effect.fraction * (1 + COMBAT.spellDamagePerSkillLevel * (level - 1)),
        );
        return;
      case "stun":
        this.stun(target, effect.seconds);
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
          Math.round(perSecond * effect.seconds * levelScale * this.dotFactor(target)),
        );
        this.emit({
          t: this.time,
          type: "hit",
          side: f.side,
          source: skill.name,
          damage,
          damageType: "void",
          crit: false,
          blocked: false,
        });
        this.damage(target, damage);
        return;
      }
    }
  }

  /** Stuns a fighter; Tenacity shortens it (at most by 75 %). */
  private stun(target: Fighter, seconds: number): void {
    const time = seconds * (1 - Math.min(0.75, target.stats.tenacity));
    if (time <= 0) return;
    target.stunned = Math.max(target.stunned, time);
    this.emit({ t: this.time, type: "stun", side: target.side, seconds: time });
  }

  /** Adds Barrier (up to max life). */
  private addBarrier(f: Fighter, amount: number): void {
    const before = f.barrier;
    f.barrier = Math.min(f.stats.maxLife, f.barrier + Math.round(amount));
    if (f.barrier > before) {
      this.emit({ t: this.time, type: "barrier", side: f.side, amount: f.barrier - before });
    }
  }

  /** Resolves one hit from `attacker` on the other fighter. Returns true if it landed. */
  private hit(attacker: Fighter, h: HitOptions): boolean {
    const defender = this.fighters[other(attacker.side)];
    // Sunder on the defender and the hit's own penetration add to Physical Penetration.
    const sundered = defender.curses.reduce((sum, c) => sum + (c.armor ?? 0), 0);
    const penetration = (h.penetration ?? 0) + sundered;
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
          crescendoFactor(attacker),
        defender: defender.stats,
        defenderDamageTaken: this.damageTaken(defender),
      },
      this.rng,
    );

    if (outcome.kind === "evaded") {
      this.emit({ t: this.time, type: "evade", side: defender.side, source: h.source });
      if (!h.fromTrigger) this.fireTriggers(defender, "onEvade");
      return false;
    }

    this.emit({
      t: this.time,
      type: "hit",
      side: attacker.side,
      source: h.source,
      damage: outcome.damage,
      damageType: h.type,
      crit: outcome.crit,
      blocked: outcome.blocked,
    });

    if (!outcome.blocked) {
      defender.heat = addHeat(
        defender.heat,
        heatFromHitTaken(
          defender.setup.weapon.heatBehavior,
          outcome.damage,
          defender.stats.maxLife,
        ) * defender.stats.heatFromHitsTaken,
        this.heatMultiplier(defender),
      );
    }
    this.damage(defender, outcome.damage);
    if (this.result) return true;

    if (attacker.stats.lifesteal > 0 && outcome.damage > 0) {
      this.heal(attacker, outcome.damage * attacker.stats.lifesteal);
    }

    for (const { ailment, chance } of withStatAilmentChances(h.ailmentChances, attacker.stats)) {
      if (!this.rng.chance(chance)) continue;
      this.inflict(attacker, defender, ailment, outcome.damage * (h.ailmentPower ?? 1));
    }
    if (outcome.crit && attacker.setup.rules?.critsApplyBleed) {
      this.inflict(attacker, defender, "bleed", outcome.damage);
    }

    if (h.fromTrigger) return true;

    const context = { damage: outcome.damage };
    this.fireTriggers(attacker, "onHit", context);
    if (outcome.crit) this.fireTriggers(attacker, "onCrit", context);
    this.fireTriggers(defender, "whenHit", context);
    defender.hitsTaken++;
    this.fireTriggers(defender, "everyNthHitTaken", context);
    if (outcome.blocked) this.fireTriggers(defender, "onBlock", context);
    if (this.result) return true;

    if (defender.stats.thorns > 0) {
      const thorns = Math.max(1, Math.round(defender.stats.thorns));
      this.emit({
        t: this.time,
        type: "hit",
        side: defender.side,
        source: "Thorns",
        damage: thorns,
        damageType: "physical",
        crit: false,
        blocked: false,
      });
      this.damage(attacker, thorns);
    }
    return true;
  }

  private inflict(
    attacker: Fighter,
    defender: Fighter,
    ailment: AilmentType,
    hitDamage: number,
    echo = true,
  ): void {
    if (echo) {
      for (const e of attacker.setup.rules?.ailmentEcho ?? []) {
        if (e.from === ailment) this.inflict(attacker, defender, e.to, hitDamage, false);
      }
    }
    const duration = ailmentDuration(
      ailment,
      attacker.stats.ailmentDuration,
      defender.stats.tenacity,
    );
    defender.ailments = applyAilment(defender.ailments, ailment, duration, hitDamage);
    if (duration <= 0) return;
    this.react(defender, "ailmented");
    this.checkReactionThresholds();
    this.emit({
      t: this.time,
      type: "ailment",
      side: defender.side,
      ailment,
      ...(ailment === "poison" ? { stacks: poisonStacks(defender.ailments) } : {}),
    });
  }

  // --- triggers ----------------------------------------------------------------------------

  /** Checks every trigger of `f` with the given condition kind. */
  private fireTriggers(
    f: Fighter,
    kind: TriggerCondition["kind"],
    context: TriggerContext = {},
  ): void {
    for (const state of f.triggers) {
      if (this.result) return;
      const condition = state.spec.condition;
      if (condition.kind !== kind) continue;
      if (kind === "everyNthAttack" && !isNthAttack(condition, f.attackCount)) continue;
      if (
        condition.kind === "everyNthHitTaken" &&
        (condition.n <= 0 || f.hitsTaken % condition.n !== 0)
      ) {
        continue;
      }
      this.tryTrigger(f, state, context);
    }
  }

  /** Rolls the chance of a trigger whose condition is met and applies its effect. */
  private tryTrigger(f: Fighter, state: TriggerState, context: TriggerContext): void {
    if (!triggerReady(state) || !this.phaseActive(f, state.spec.belowLife)) return;
    const chance = triggerChance(state.spec.chance ?? 1, f.stats.triggerChance);
    if (chance < 1 && !this.rng.chance(chance)) return;
    markFired(state);
    this.emit({ t: this.time, type: "trigger", side: f.side, name: state.spec.name });
    this.applyEffect(f, state.spec.id, state.spec.name, state.spec.effect, context);
  }

  private applyEffect(
    f: Fighter,
    id: string,
    name: string,
    effect: TriggerEffect,
    context: TriggerContext,
  ): void {
    const target = this.fighters[other(f.side)];
    switch (effect.kind) {
      case "weaponHit":
        this.hit(f, {
          source: name,
          baseDamage: this.roll(f.setup.weapon.damage) * effect.multiplier,
          type: f.setup.weapon.damageType,
          evadable: true,
          multiplier: 1,
          ailmentChances: [],
          fromTrigger: true,
        });
        return;
      case "spellHit":
        this.hit(f, {
          source: effect.name,
          baseDamage: this.roll(effect.damage),
          type: effect.damageType,
          evadable: false,
          multiplier: 1,
          ailmentChances: [],
          fromTrigger: true,
        });
        return;
      case "ailment": {
        const weapon = f.setup.weapon.damage;
        this.inflict(f, target, effect.ailment, context.damage ?? (weapon.min + weapon.max) / 2);
        return;
      }
      case "heal":
        this.heal(f, f.stats.maxLife * effect.fraction);
        return;
      case "barrier":
        this.addBarrier(f, f.stats.maxLife * effect.fraction);
        return;
      case "heat": {
        const before = f.heat;
        f.heat = addHeat(f.heat, effect.amount, this.heatMultiplier(f));
        this.emit({ t: this.time, type: "heatGain", side: f.side, amount: f.heat - before });
        return;
      }
      case "buff": {
        f.buffs = applyBuff(
          f.buffs,
          { id, name, stat: effect.stat, amount: effect.amount, remaining: effect.duration },
          effect.maxStacks ?? 1,
        );
        this.refreshStats(f);
        const stacks = f.buffs.find((b) => b.id === id)?.stacks ?? 1;
        this.emit({
          t: this.time,
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
        this.defaultAttack(f, true);
        return;
      case "stun":
        this.stun(target, effect.seconds);
        return;
      case "reflect": {
        if (!context.damage) return;
        const damage = Math.max(
          1,
          Math.round(Math.min(context.damage * effect.fraction, target.stats.maxLife * effect.cap)),
        );
        this.emit({
          t: this.time,
          type: "hit",
          side: f.side,
          source: name,
          damage,
          damageType: effect.damageType,
          crit: false,
          blocked: false,
        });
        this.damage(target, damage);
        return;
      }
    }
  }

  /** Recomputes stats from setup + active buffs (life and max life stay as they are). */
  private refreshStats(f: Fighter): void {
    if (f.buffs.length === 0) {
      f.stats = f.baseStats;
      return;
    }
    f.stats = deriveStats({
      ...f.setup,
      bonuses: sumBonuses(f.setup.bonuses, buffBonuses(f.buffs)),
    });
  }

  private heal(f: Fighter, amount: number): void {
    const healed = Math.min(
      f.stats.maxLife - f.life,
      Math.round(amount * healingFactor(f.ailments)),
    );
    if (healed <= 0) return;
    f.life += healed;
    this.emit({ t: this.time, type: "heal", side: f.side, amount: healed });
    this.react(this.fighters[other(f.side)], "enemyHeals");
    for (const state of f.triggers) {
      const c = state.spec.condition;
      if (c.kind === "lifeBelow" && f.life / f.stats.maxLife >= c.threshold) state.armed = true;
    }
    this.checkReactionThresholds();
  }

  /** Barrier absorbs damage first, the rest goes to life. */
  private damage(f: Fighter, amount: number): void {
    const absorbed = Math.min(f.barrier, amount);
    f.barrier -= absorbed;
    if (absorbed > 0 && f.barrier <= 0) this.react(f, "barrierBreaks");
    f.life = Math.max(0, f.life - (amount - absorbed));
    if (f.life === 0) {
      this.emit({ t: this.time, type: "death", side: f.side });
      this.end(other(f.side));
      return;
    }
    for (const state of f.triggers) {
      const c = state.spec.condition;
      if (c.kind !== "lifeBelow" || !state.armed) continue;
      if (f.life / f.stats.maxLife < c.threshold) {
        state.armed = false;
        this.tryTrigger(f, state, {});
        if (this.result) return;
      }
    }
    this.checkReactionThresholds();
  }

  private end(winner: Side | null, fled: Side | null = null): void {
    this.result = { winner, fled };
    this.emit({ t: this.time, type: "fightEnd", winner, ...(fled ? { fled } : {}) });
  }

  private roll(range: DamageRange): number {
    return range.min + this.rng.next() * (range.max - range.min);
  }

  private fighterSnapshot(f: Fighter): FighterSnapshot {
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
      rotation: f.setup.rotation.map((slot) => {
        const cost = skillCost(f.setup, slot.skill);
        return {
          skillId: slot.skill.id,
          name: slot.skill.name,
          heatCost: cost,
          threshold: triggerThreshold(cost, slot.threshold),
        };
      }),
      nextSlot: f.nextSlot,
      reactions: f.reactions.map((r) => ({
        skillId: r.spec.skill.id,
        name: r.spec.skill.name,
        heatCost: this.slotCost(f, r.spec.skill, r.spec.modifiers),
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
    };
  }
}

export interface FightResult {
  readonly winner: Side | null;
  /** The side that ran away (the Ember Thief), if one did. */
  readonly fled: Side | null;
  /** Fight length in seconds. */
  readonly duration: number;
  readonly events: readonly CombatEvent[];
  readonly final: FightSnapshot;
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
