import { Rng } from "../rng";
import {
  type AilmentStates,
  ailmentDuration,
  applyAilment,
  chillFactor,
  damageTakenBonus,
  healingFactor,
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
import { type DerivedStats, deriveStats } from "./stats";
import type {
  AilmentChance,
  AilmentType,
  CombatantSetup,
  DamageRange,
  DamageType,
  HeatBehavior,
  Side,
  SkillDefinition,
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
  readonly heat: number;
  readonly maxHeat: number;
  readonly rotation: readonly RotationSlotSnapshot[];
  /** Index into `rotation` of the next skill. */
  readonly nextSlot: number;
  readonly ailments: readonly { readonly type: AilmentType; readonly remaining: number }[];
  readonly stats: DerivedStats;
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
  readonly stats: DerivedStats;
  life: number;
  heat: number;
  /** 0..1, a Default Attack or skill fires when it reaches 1. */
  attackProgress: number;
  nextSlot: number;
  ailments: AilmentStates;
  secondsSinceLastHit: number;
}

const other = (side: Side): Side => (side === "hero" ? "enemy" : "hero");

function createFighter(side: Side, setup: CombatantSetup): Fighter {
  const stats = deriveStats(setup);
  const lifeFraction = Math.min(1, Math.max(0, setup.lifeFraction ?? 1));
  return {
    side,
    setup,
    stats,
    life: Math.max(1, Math.round(stats.maxLife * lifeFraction)),
    heat: stats.startingHeat,
    attackProgress: 0,
    nextSlot: 0,
    ailments: {},
    secondsSinceLastHit: 0,
  };
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
    this.ticks++;
    const dt = COMBAT.tickSeconds;

    for (const side of ["hero", "enemy"] as const) {
      this.stepStatus(this.fighters[side], dt);
      if (this.result) return this.log.slice(start);
    }

    // Fill both action bars; whoever passed 1 earlier inside this tick acts first.
    const ready: { fighter: Fighter; overshoot: number }[] = [];
    for (const side of ["hero", "enemy"] as const) {
      const f = this.fighters[side];
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

  private heatMultiplier(f: Fighter): number {
    return heatGainMultiplier(f.stats.heatGain, chillFactor(f.ailments));
  }

  /** Ailments, DoT ticks and passive Heat. */
  private stepStatus(f: Fighter, dt: number): void {
    const { states, burnTicks, expired } = stepAilments(f.ailments, dt);
    f.ailments = states;
    for (const tick of burnTicks) {
      const damage = Math.max(1, Math.round(tick * (1 + damageTakenBonus(f.ailments))));
      this.emit({ t: this.time, type: "dot", side: f.side, ailment: "burn", damage });
      this.damage(f, damage);
      if (this.result) return;
    }
    for (const ailment of expired) {
      this.emit({ t: this.time, type: "ailmentExpired", side: f.side, ailment });
    }

    f.secondsSinceLastHit += dt;
    f.heat = stepHeat(
      f.setup.weapon.heatBehavior,
      f.heat,
      dt,
      f.secondsSinceLastHit,
      this.heatMultiplier(f),
    );
  }

  /** Uses the next Rotation skill if Heat reached its Trigger Threshold, else a Default Attack. */
  private act(f: Fighter): void {
    const slot = f.setup.rotation[f.nextSlot];
    if (slot && f.heat >= triggerThreshold(slot.skill.heatCost, slot.threshold)) {
      f.heat -= slot.skill.heatCost;
      f.nextSlot = (f.nextSlot + 1) % f.setup.rotation.length;
      this.castSkill(f, slot.skill, slot.level ?? 1);
      return;
    }
    this.defaultAttack(f);
  }

  private defaultAttack(f: Fighter): void {
    const weapon = f.setup.weapon;
    const landed = this.hit(f, {
      source: weapon.defaultAttack,
      baseDamage: this.roll(weapon.damage),
      type: weapon.damageType,
      evadable: true,
      multiplier: 1,
      ailmentChances: weapon.ailmentChances ?? [],
    });
    if (landed) {
      f.heat = addHeat(
        f.heat,
        heatFromOwnHit(weapon.heatBehavior, weapon.heatPerHit),
        this.heatMultiplier(f),
      );
    }
  }

  private castSkill(f: Fighter, skill: SkillDefinition, level: number): void {
    this.emit({
      t: this.time,
      type: "skill",
      side: f.side,
      skill: skill.name,
      heatCost: skill.heatCost,
    });
    const target = this.fighters[other(f.side)];
    for (const hit of skill.hits) {
      const count = hit.count ?? 1;
      for (let i = 0; i < count && !this.result; i++) {
        if (hit.kind === "weapon") {
          const lowLife =
            hit.lowLifeBonus && target.life / target.stats.maxLife < hit.lowLifeBonus.threshold;
          this.hit(f, {
            source: skill.name,
            baseDamage: this.roll(f.setup.weapon.damage) * hit.multiplier,
            type: f.setup.weapon.damageType,
            evadable: true,
            multiplier: lowLife && hit.lowLifeBonus ? hit.lowLifeBonus.multiplier : 1,
            ailmentChances: hit.ailmentChances ?? [],
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
          });
        }
      }
    }
  }

  /** Resolves one hit from `attacker` on the other fighter. Returns true if it landed. */
  private hit(
    attacker: Fighter,
    h: {
      source: string;
      baseDamage: number;
      type: DamageType;
      evadable: boolean;
      multiplier: number;
      ailmentChances: readonly AilmentChance[];
    },
  ): boolean {
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
        defenderDamageTaken: damageTakenBonus(defender.ailments),
      },
      this.rng,
    );

    if (outcome.kind === "evaded") {
      this.emit({ t: this.time, type: "evade", side: defender.side, source: h.source });
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

    for (const { ailment, chance } of h.ailmentChances) {
      if (!this.rng.chance(chance)) continue;
      const duration = ailmentDuration(
        ailment,
        attacker.stats.ailmentDuration,
        defender.stats.tenacity,
      );
      defender.ailments = applyAilment(defender.ailments, ailment, duration, outcome.damage);
      this.emit({ t: this.time, type: "ailment", side: defender.side, ailment });
    }
    return true;
  }

  private heal(f: Fighter, amount: number): void {
    const healed = Math.min(
      f.stats.maxLife - f.life,
      Math.round(amount * healingFactor(f.ailments)),
    );
    if (healed <= 0) return;
    f.life += healed;
    this.emit({ t: this.time, type: "heal", side: f.side, amount: healed });
  }

  private damage(f: Fighter, amount: number): void {
    f.life = Math.max(0, f.life - amount);
    if (f.life === 0) {
      this.emit({ t: this.time, type: "death", side: f.side });
      this.end(other(f.side));
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
      heat: f.heat,
      maxHeat: COMBAT.maxHeat,
      rotation: f.setup.rotation.map((slot) => ({
        skillId: slot.skill.id,
        name: slot.skill.name,
        heatCost: slot.skill.heatCost,
        threshold: triggerThreshold(slot.skill.heatCost, slot.threshold),
      })),
      nextSlot: f.nextSlot,
      ailments: (["burn", "chill", "shock"] as const).flatMap((type) => {
        const state = f.ailments[type];
        return state ? [{ type, remaining: state.remaining }] : [];
      }),
      stats: f.stats,
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
