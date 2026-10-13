import { Rng } from "../rng";
import { type AilmentStates, chillFactor, damageTakenBonus, poisonStacks } from "./ailments";
import type { MasteryCondition, SlotCondition } from "./types";
import { COMBAT } from "./constants";
import { type CombatEvent, type PayoffKind } from "./events";
import { heatGainMultiplier } from "./heat";
import { PERK, type PerkId } from "./perks";
import { type DerivedStats, deriveStats, sumBonuses } from "./stats";
import { type BuffState, type TriggerState, buffBonuses, createTriggerState } from "./triggers";
import type {
  AilmentChance,
  AilmentType,
  CombatantSetup,
  CombatRules,
  DamageRange,
  DamageType,
  ReactionSlot,
  Side,
  SkillDefinition,
} from "./types";
import { AILMENT_TYPES } from "./types";

/** A fighter in a running fight, the fight's state and the helpers every part of it uses. */

export interface Fighter {
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
    /** Stacking Sunder (Weapon Mastery). */
    stacks?: number;
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
  // Weapon Mastery state (WeaponRules).
  /** The next own hit is clean and a Crit (Read the Blow, Shadowstep). */
  nextCrit: boolean;
  /** Assassinate: the opening hit has been used. */
  openerUsed: boolean;
  /** Flowing Blade: the last hit was clean, so Heat does not decay. */
  flowing: boolean;
  /** Rampage: extra hit damage gathered this fight. */
  rampage: number;
  /** Toxic Bloom: seconds before Poison takes hold again. */
  poisonLockout: number;
  /** Fight time of the last hit taken (Steady Aim). */
  lastHitTakenAt: number;
  /** Barrier recharged since it last started filling up (one event when it is full). */
  barrierRecharged: number;
  /** Fight time of the last own skill (Patient Draw). */
  lastSkillAt: number;
  /** Hunter's Mark: the target is marked. */
  marked: boolean;
  // Attribute Breakpoint Perks.
  readonly perks: ReadonlySet<PerkId>;
  /** Titan: fight time from which the next stun is ready. */
  titanReadyAt: number;
  /** Once-per-fight Perks already used. */
  perksUsed: Set<PerkId>;
  // Class Traits.
  /** Keen Eye: the first hit of the fight has been a clean Crit. */
  keenOpened: boolean;
  /** Spark: a skill was cast, the next Default Attack is charged. */
  sparkReady: boolean;
}

/** Sunder stacks without a Sunder rule of their own (Riposte, Bone Breaker). */
export const SUNDER_ID = "mastery-sunder";

export const STREAK_ID = "mastery-streak";

/** Prism: the Default Attack cycles these elements with their ailments. */
export const PRISM = [
  { type: "fire", ailment: "burn" },
  { type: "cold", ailment: "chill" },
  { type: "lightning", ailment: "shock" },
] as const;

interface ReactionState {
  readonly spec: ReactionSlot;
  cooldownLeft: number;
  /** Thresholds: false after firing until the value is back above. */
  armed: boolean;
  /** Seconds the met condition has been waiting for Heat; null = not waiting. */
  pending: number | null;
}

/** A reaction waits this long for Heat before it gives up. */
export const REACTION_PATIENCE = 4;

/** Most damage one hit of a telegraphed Heavy Attack can deal (`COMBAT.heavyHitCap`). */
export function heavyHitCap(stats: { readonly maxLife: number; readonly barrier: number }): number {
  return Math.max(1, Math.round(COMBAT.heavyHitCap * (stats.maxLife + stats.barrier)));
}

export const other = (side: Side): Side => (side === "hero" ? "enemy" : "hero");

/** Heat Cost of a Rotation skill after rule changes (e.g. Keystones). */
export function skillCost(setup: CombatantSetup, skill: SkillDefinition): number {
  return Math.max(0, Math.round(skill.heatCost * (setup.rules?.skillCostMultiplier ?? 1)));
}

/** Execute (Legendary Power): more damage against an enemy below the life threshold. */
export function executeFactor(rules: CombatRules | undefined, defender: Fighter): number {
  const execute = rules?.execute;
  if (!execute) return 1;
  return defender.life / defender.stats.maxLife < execute.below
    ? 1 + execute.bonus
    : 1 - (execute.above ?? 0);
}

/** Crescendo (Capstone): +2 % damage for every 100 Heat spent this fight. */
export function crescendoFactor(f: Fighter): number {
  return f.setup.capstone?.kind === "crescendo" ? 1 + 0.02 * Math.floor(f.heatSpent / 100) : 1;
}

export function createFighter(side: Side, setup: CombatantSetup): Fighter {
  const stats = deriveStats(setup);
  const lifeFraction = Math.min(1, Math.max(0, setup.lifeFraction ?? 1));
  const triggers = [...(setup.weapon.triggers ?? []), ...(setup.triggers ?? [])];
  return {
    side,
    setup,
    baseStats: stats,
    stats,
    life: Math.max(1, Math.round(stats.maxLife * lifeFraction)),
    barrier: stats.barrier,
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
    nextCrit: false,
    openerUsed: false,
    flowing: true,
    rampage: 0,
    poisonLockout: 0,
    lastHitTakenAt: 0,
    barrierRecharged: 0,
    lastSkillAt: 0,
    marked: false,
    perks: new Set(setup.perks ?? []),
    titanReadyAt: 0,
    perksUsed: new Set(),
    keenOpened: false,
    sparkReady: false,
  };
}

/** Elemental hits and the ailment that belongs to their element (Elemental Surge). */
export const ELEMENT_AILMENT: Partial<Record<DamageType, AilmentType>> = {
  fire: "burn",
  cold: "chill",
  lightning: "shock",
  void: "corruption",
};

/** Gear ailment chances (Chance to Burn etc.) are added to the hit's own chances. */
export function withStatAilmentChances(
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

/** The state of a running fight; the functions below play it tick by tick. */
export interface FightCore {
  readonly rng: Rng;
  readonly fighters: Record<Side, Fighter>;
  readonly log: CombatEvent[];
  ticks: number;
  result: { winner: Side | null; fled: Side | null } | undefined;
  /** The side whose telegraphed Heavy Attack is landing right now (its hits are capped). */
  heavyFrom: Side | null;
}

/** Fight time in seconds after the ticks so far. */
export function fightTime(core: FightCore): number {
  return Math.round(core.ticks * COMBAT.tickSeconds * 1000) / 1000;
}

export function emit(core: FightCore, event: CombatEvent): void {
  core.log.push(event);
}

export function payoff(core: FightCore, f: Fighter, kind: PayoffKind, damage?: number): void {
  emit(core, {
    t: fightTime(core),
    type: "payoff",
    side: f.side,
    payoff: kind,
    ...(damage !== undefined ? { damage } : {}),
  });
}

/** Clarity (Wisdom 10): the built-in payoffs of the owner's ailments hit harder. */
export function payoffFactor(core: FightCore, f: Fighter): number {
  if (!f.perks.has("clarity")) return 1;
  perk(core, f, "clarity");
  return 1 + PERK.clarityPayoff;
}

export function perk(core: FightCore, f: Fighter, perk: PerkId): void {
  emit(core, { t: fightTime(core), type: "perk", side: f.side, perk });
}

/** A once-per-fight Perk the fighter has and has not used yet; marks it used. */
export function usePerk(f: Fighter, perk: PerkId): boolean {
  if (!f.perks.has(perk) || f.perksUsed.has(perk)) return false;
  f.perksUsed.add(perk);
  return true;
}

/** "+X % damage taken" from Shock and rules (Keystones). */
export function damageTaken(f: Fighter): number {
  return damageTakenBonus(f.ailments) + (f.setup.rules?.damageTaken ?? 0);
}

export function heatMultiplier(core: FightCore, f: Fighter): number {
  const opponent = core.fighters[other(f.side)];
  const rules = opponent.setup.weaponRules;
  if (rules?.stunnedNoHeat && f.stunned > 1e-9) return 0;
  let extra = 0;
  for (const e of rules?.enemyHeatGain ?? []) {
    if (!e.condition || conditionHolds(core, opponent, e.condition)) extra += e.amount;
  }
  return heatGainMultiplier(f.stats.heatGain, chillFactor(f.ailments)) * Math.max(0, 1 + extra);
}

/** Multiplier on damage over time dealt to `f`: damage taken, curses and the source's rules. */
export function dotFactor(core: FightCore, f: Fighter): number {
  const cursed = f.curses.reduce((sum, c) => sum + c.dotDamageTaken, 0);
  const source = core.fighters[other(f.side)];
  const lingering = source.setup.rules?.lingering;
  const grown = lingering ? 1 + Math.min(lingering.max, lingering.perSecond * fightTime(core)) : 1;
  return (1 + damageTaken(f) + cursed) * (source.setup.rules?.dotDamage ?? 1) * grown;
}

/** Boss phases: a trigger or telegraph with `belowLife` waits until life drops below it. */
export function phaseActive(f: Fighter, belowLife: number | undefined): boolean {
  return belowLife === undefined || f.life / f.stats.maxLife < belowLife;
}

/** A buff skill whose buff still runs, or a curse that still sits on the target. */
export function buffRunning(core: FightCore, f: Fighter, skill: SkillDefinition): boolean {
  const effects = skill.effects ?? [];
  if (effects.some((e) => e.kind === "buff") && f.buffs.some((b) => b.id === skill.id)) {
    return true;
  }
  const target = core.fighters[other(f.side)];
  return effects.some((e) => e.kind === "curse") && target.curses.some((c) => c.id === skill.id);
}

/** Recomputes stats from setup + active buffs (life and max life stay as they are). */
export function refreshStats(f: Fighter): void {
  if (f.buffs.length === 0) {
    f.stats = f.baseStats;
    return;
  }
  f.stats = deriveStats({
    ...f.setup,
    bonuses: sumBonuses(f.setup.bonuses, buffBonuses(f.buffs)),
  });
}

export function endFight(core: FightCore, winner: Side | null, fled: Side | null = null): void {
  core.result = { winner, fled };
  emit(core, { t: fightTime(core), type: "fightEnd", winner, ...(fled ? { fled } : {}) });
}

export function rollRange(core: FightCore, range: DamageRange): number {
  return range.min + core.rng.next() * (range.max - range.min);
}

/** Whether a Battle Plan or Weapon Mastery condition holds for `f` right now. */
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

/** Swings per second: Attack Speed, Chill and Weapon Mastery's conditional Attack Speed. */
export function attackRate(core: FightCore, f: Fighter): number {
  let extra = 0;
  for (const e of f.setup.weaponRules?.conditionalAttackSpeed ?? []) {
    if (conditionHolds(core, f, e.condition)) extra += e.amount;
  }
  return f.stats.attackSpeed * (1 + extra) * chillFactor(f.ailments);
}
