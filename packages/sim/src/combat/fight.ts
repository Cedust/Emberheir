import { Rng } from "../rng";
import {
  type AilmentStates,
  ailmentDuration,
  applyAilment,
  chillFactor,
  clearAilment,
  damageTakenBonus,
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
  CombatantSetup,
  DamageRange,
  DamageType,
  HeatBehavior,
  Side,
  SkillDefinition,
  SkillEffect,
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
  | { readonly t: number; readonly type: "death"; readonly side: Side }
  | { readonly t: number; readonly type: "fightEnd"; readonly winner: Side | null };

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
  /** Current stats including active buffs. */
  readonly stats: DerivedStats;
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
  secondsSinceLastHit: number;
  /** Default Attacks so far (for "Every Nth Attack"). Extra attacks from triggers do not count. */
  attackCount: number;
  readonly triggers: TriggerState[];
  buffs: BuffState[];
  /** Seconds since the last telegraph ended, per telegraph. */
  telegraphTimers: number[];
  /** The telegraph winding up right now. */
  windup: { index: number; remaining: number } | null;
}

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
  /** Hits caused by triggers do not fire further triggers. */
  readonly fromTrigger: boolean;
}

const other = (side: Side): Side => (side === "hero" ? "enemy" : "hero");

/** Heat Cost of a Rotation skill after rule changes (e.g. Keystones). */
export function skillCost(setup: CombatantSetup, skill: SkillDefinition): number {
  return Math.max(0, Math.round(skill.heatCost * (setup.rules?.skillCostMultiplier ?? 1)));
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
    heat: stats.startingHeat,
    attackProgress: 0,
    nextSlot: 0,
    ailments: {},
    secondsSinceLastHit: 0,
    attackCount: 0,
    triggers: triggers.map(createTriggerState),
    buffs: [],
    telegraphTimers: (setup.telegraphs ?? []).map(() => 0),
    windup: null,
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
  private result: { winner: Side | null } | undefined;

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
      if (f.windup) continue;
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

    if (!this.result && this.time >= COMBAT.maxFightSeconds) this.end(null);
    return this.log.slice(start);
  }

  /** Runs ticks until `seconds` of fight time have passed or the fight is over. */
  advance(seconds: number): readonly CombatEvent[] {
    const start = this.log.length;
    const target = this.time + seconds;
    while (!this.result && this.time + 1e-9 < target) this.step();
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

  /** Ailments, DoT ticks and passive Heat. */
  private stepStatus(f: Fighter, dt: number): void {
    const { states, ticks, expired } = stepAilments(f.ailments, dt);
    f.ailments = states;
    for (const tick of ticks) {
      const damage = Math.max(1, Math.round(tick.damage * (1 + this.damageTaken(f))));
      this.emit({ t: this.time, type: "dot", side: f.side, ailment: tick.ailment, damage });
      this.damage(f, damage);
      if (this.result) return;
    }
    for (const ailment of expired) {
      this.emit({ t: this.time, type: "ailmentExpired", side: f.side, ailment });
    }

    f.secondsSinceLastHit += dt;
    const behavior = f.setup.weapon.heatBehavior;
    f.heat = stepHeat(
      f.setup.rules?.noHeatDecay && behavior === "cooling" ? "steady" : behavior,
      f.heat,
      dt,
      f.secondsSinceLastHit,
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
  }

  /** Winds up telegraphed Heavy Attacks and unleashes them when the wind-up is over. */
  private stepTelegraphs(f: Fighter, dt: number): void {
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
      if (!spec) continue;
      f.telegraphTimers[i] = (f.telegraphTimers[i] ?? 0) + dt;
      if ((f.telegraphTimers[i] ?? 0) + 1e-9 < spec.interval) continue;
      f.telegraphTimers[i] = 0;
      f.windup = { index: i, remaining: spec.windup };
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

  /**
   * Uses the next Rotation skill if Heat reached its Trigger Threshold, else a Default Attack.
   * A buff skill whose buff is still running is passed over, so it is not wasted.
   */
  private act(f: Fighter): void {
    let slot = f.setup.rotation[f.nextSlot];
    if (slot && this.buffRunning(f, slot.skill)) {
      f.nextSlot = (f.nextSlot + 1) % f.setup.rotation.length;
      slot = f.setup.rotation[f.nextSlot];
      if (slot && this.buffRunning(f, slot.skill)) slot = undefined;
    }
    const cost = slot ? skillCost(f.setup, slot.skill) : 0;
    if (slot && f.heat >= triggerThreshold(cost, slot.threshold)) {
      f.heat -= cost;
      f.nextSlot = (f.nextSlot + 1) % f.setup.rotation.length;
      this.castSkill(f, slot.skill, slot.level ?? 1, cost);
      return;
    }
    this.defaultAttack(f);
  }

  private buffRunning(f: Fighter, skill: SkillDefinition): boolean {
    return (
      (skill.effects ?? []).some((e) => e.kind === "buff") && f.buffs.some((b) => b.id === skill.id)
    );
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

  private castSkill(f: Fighter, skill: SkillDefinition, level: number, heatCost = 0): void {
    this.emit({ t: this.time, type: "skill", side: f.side, skill: skill.name, heatCost });
    this.fireTriggers(f, "onSkillUse");
    if (this.result) return;
    const target = this.fighters[other(f.side)];
    for (const hit of skill.hits) {
      const count = hit.count ?? 1;
      for (let i = 0; i < count && !this.result; i++) {
        if (hit.kind === "weapon") {
          const lowLife =
            hit.lowLifeBonus && target.life / target.stats.maxLife < hit.lowLifeBonus.threshold;
          const levelScale = 1 + COMBAT.attackDamagePerSkillLevel * (level - 1);
          this.hit(f, {
            source: skill.name,
            baseDamage: this.roll(f.setup.weapon.damage) * hit.multiplier * levelScale,
            type: f.setup.weapon.damageType,
            evadable: true,
            multiplier: lowLife && hit.lowLifeBonus ? hit.lowLifeBonus.multiplier : 1,
            ailmentChances: hit.ailmentChances ?? [],
            fromTrigger: false,
          });
        } else {
          const levelScale = 1 + COMBAT.spellDamagePerSkillLevel * (level - 1);
          this.hit(f, {
            source: skill.name,
            baseDamage: this.roll(hit.damage) * levelScale * (hit.falloff ?? 1) ** i,
            type: hit.damageType,
            evadable: false,
            multiplier: 1,
            ailmentChances: hit.ailmentChances ?? [],
            fromTrigger: false,
          });
        }
      }
    }
    for (const effect of skill.effects ?? []) {
      if (this.result) return;
      this.applySkillEffect(f, target, skill, effect, level);
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
    }
  }

  /** Resolves one hit from `attacker` on the other fighter. Returns true if it landed. */
  private hit(attacker: Fighter, h: HitOptions): boolean {
    const defender = this.fighters[other(attacker.side)];
    const outcome = resolveHit(
      {
        baseDamage: h.baseDamage,
        type: h.type,
        evadable: h.evadable,
        attacker: attacker.stats,
        attackerLevel: attacker.setup.level,
        multiplier: h.multiplier * (attacker.setup.damageMultiplier ?? 1),
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

    attacker.secondsSinceLastHit = 0;
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
        ),
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
      this.inflict(attacker, defender, ailment, outcome.damage);
    }
    if (outcome.crit && attacker.setup.rules?.critsApplyBleed) {
      this.inflict(attacker, defender, "bleed", outcome.damage);
    }

    if (h.fromTrigger) return true;

    const context = { damage: outcome.damage };
    this.fireTriggers(attacker, "onHit", context);
    if (outcome.crit) this.fireTriggers(attacker, "onCrit", context);
    this.fireTriggers(defender, "whenHit", context);
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
  ): void {
    const duration = ailmentDuration(
      ailment,
      attacker.stats.ailmentDuration,
      defender.stats.tenacity,
    );
    defender.ailments = applyAilment(defender.ailments, ailment, duration, hitDamage);
    if (duration <= 0) return;
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
      this.tryTrigger(f, state, context);
    }
  }

  /** Rolls the chance of a trigger whose condition is met and applies its effect. */
  private tryTrigger(f: Fighter, state: TriggerState, context: TriggerContext): void {
    if (!triggerReady(state)) return;
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
      case "barrier": {
        const before = f.barrier;
        f.barrier = Math.min(
          f.stats.maxLife,
          f.barrier + Math.round(f.stats.maxLife * effect.fraction),
        );
        if (f.barrier > before) {
          this.emit({ t: this.time, type: "barrier", side: f.side, amount: f.barrier - before });
        }
        return;
      }
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
    for (const state of f.triggers) {
      const c = state.spec.condition;
      if (c.kind === "lifeBelow" && f.life / f.stats.maxLife >= c.threshold) state.armed = true;
    }
  }

  /** Barrier absorbs damage first, the rest goes to life. */
  private damage(f: Fighter, amount: number): void {
    const absorbed = Math.min(f.barrier, amount);
    f.barrier -= absorbed;
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
  }

  private end(winner: Side | null): void {
    this.result = { winner };
    this.emit({ t: this.time, type: "fightEnd", winner });
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
      buffs: f.buffs.map((b) => ({
        name: b.name,
        stat: b.stat,
        amount: b.amount,
        stacks: b.stacks,
        remaining: b.remaining,
      })),
      stats: f.stats,
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
    duration: fight.time,
    events: fight.events,
    final: fight.snapshot(),
  };
}
