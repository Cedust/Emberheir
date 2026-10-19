import { Rng } from "../rng";
import { type AilmentStates, chillFactor, damageTakenBonus, poisonStacks } from "./ailments";
import type { FightMoment, RuleCondition } from "./types";
import { COMBAT, MIGHTY_SHARE } from "./constants";
import { type CombatEvent, type PayoffKind } from "./events";
import { heatGainMultiplier } from "./heat";
import { PERK, type PerkId } from "./perks";
import { addBonus, addFactor, emptyPool, poolFactor } from "./pools";
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
  /** Rotation skills and Default Attacks taken so far (Twin Cast counts them). */
  actionCount: number;
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
  /** The telegraph winding up right now (`delayed`: a Chill already pushed it back). */
  windup: { index: number; remaining: number; delayed?: boolean } | null;
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
  /** Fury (Cinderguard): own hits landed this fight, each one adds a little damage. */
  fury: number;
  /** Overcharge (Emberseer): skills cast since the last Nova. */
  charges: number;
  /** Spark: Default Attacks still charged by a skill (one, two after Master of Starfall). */
  sparkCharges: number;
  /** Crit Chance built up by Default Attacks without a Crit (Critical Mass). */
  critBuildup: number;
  // Weapon Mastery v2 state.
  /** Clean hits in a row (Clean Line); the bonus is ready when it reaches its count. */
  cleanStreak: number;
  cleanLineReady: boolean;
  /** Nesting of extra attacks: only the first level may fire triggers (Path Masters). */
  extraDepth: number;
  /** Clean hits since the last own skill (Building Edge). */
  cleanSinceSkill: number;
  /** Fight time from which the free repeat of Rotation Slot 1 is ready (Master of Tempo). */
  repeatReadyAt: number;
  /** Fight time from which Interrupt is ready again. */
  interruptReadyAt: number;
  /** Fight time until which Braced holds. */
  bracedUntil: number;
  /** Damage stored for the next Innate (Master of the Wall, Impale). */
  stored: number;
  /** Glancing Blows so far (Spring Trap). */
  glancingCount: number;
  /** Fight times of recent Chills inflicted (Frozen Solid). */
  chillTimes: number[];
  /** Skills cast so far (Echoing Chant). */
  skillCount: number;
  /** A skill was cast and no hit has followed yet (Find the Gap). */
  afterSkill: boolean;
  /** Fight times of recent Default Attacks (Whirl). */
  recentAttacks: number[];
  /** The next Innate is free (Whirl). */
  freeInnate: boolean;
  /** Clean Crits still promised after an Evade (Vanishing Act). */
  critsLeft: number;
  /** Max Barrier that Glass Cannon adds to the Default Attack. */
  readonly glassBarrier: number;
  /** Fight time of the last Crit, Evade, Block, Parry and skill (Skill Web "within" conditions). */
  readonly moments: Record<FightMoment, number>;
}

/** Sunder stacks without a Sunder rule of their own (Riposte, Bone Breaker). */
export const SUNDER_ID = "mastery-sunder";

export const STREAK_ID = "mastery-streak";

/** Prism: the Default Attack cycles these elements with their ailments. */
export const PRISM = [
  { type: "lightning", ailment: "shock" },
  { type: "cold", ailment: "chill" },
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
export function heavyHitCap(
  stats: { readonly maxLife: number; readonly barrier: number },
  share: number = COMBAT.heavyHitCap,
): number {
  return Math.max(1, Math.round(share * (stats.maxLife + stats.barrier)));
}

export const other = (side: Side): Side => (side === "hero" ? "enemy" : "hero");

/** Heat Cost of a Rotation skill after rule changes (e.g. Keystones). */
export function skillCost(setup: CombatantSetup, skill: SkillDefinition): number {
  return heatCostFloor(
    skill,
    Math.max(0, Math.round(skill.heatCost * (setup.rules?.skillCostMultiplier ?? 1))),
  );
}

/** A Heat Cost after its discounts: never below `COMBAT.minHeatCostShare` of the skill's own. */
export function heatCostFloor(skill: SkillDefinition, cost: number): number {
  return Math.max(Math.round(skill.heatCost * COMBAT.minHeatCostShare), cost);
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
export function crescendoBonus(f: Fighter): number {
  return f.setup.capstone?.kind === "crescendo" ? 0.02 * Math.floor(f.heatSpent / 100) : 0;
}

export function createFighter(side: Side, setup: CombatantSetup): Fighter {
  const stats = deriveStats(setup);
  const glassBarrier = setup.weaponRules?.glassCannon ? stats.barrier : 0;
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
    actionCount: 0,
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
    fury: 0,
    charges: 0,
    sparkCharges: 0,
    critBuildup: 0,
    cleanStreak: 0,
    cleanLineReady: false,
    extraDepth: 0,
    cleanSinceSkill: 0,
    repeatReadyAt: 0,
    interruptReadyAt: 0,
    bracedUntil: -1,
    stored: 0,
    glancingCount: 0,
    chillTimes: [],
    skillCount: 0,
    afterSkill: false,
    recentAttacks: [],
    freeInnate: false,
    critsLeft: 0,
    glassBarrier,
    moments: { crit: -1e9, evade: -1e9, block: -1e9, parry: -1e9, skill: -1e9 },
  };
}

/** Elemental hits and the ailment that belongs to their element (Elemental Surge). */
export const ELEMENT_AILMENT: Partial<Record<DamageType, AilmentType>> = {
  fire: "burn",
  cold: "chill",
  lightning: "shock",
  void: "corruption",
};

/**
 * The ailment that belongs to a weapon's hits: its element's, or its first own ailment
 * (Physical: Bleed, Poison or none).
 */
export function weaponAilment(weapon: CombatantSetup["weapon"]): AilmentType | undefined {
  return (
    weapon.ailment ?? ELEMENT_AILMENT[weapon.damageType] ?? weapon.ailmentChances?.[0]?.ailment
  );
}

/** 100 % Weapon Damage of a weapon: the middle of its range (Mighty Hits start at 125 % of it). */
export function weaponDamageOf(weapon: CombatantSetup["weapon"]): number {
  return weapon.mightyAt !== undefined
    ? weapon.mightyAt / MIGHTY_SHARE
    : (weapon.damage.min + weapon.damage.max) / 2;
}

/** Fury (Cinderguard): the damage share gathered so far (for hits and ailments alike). */
export function furyBonus(f: Fighter): number {
  const fury = f.setup.rules?.fury;
  return fury ? Math.min(fury.max, fury.perHit * f.fury) : 0;
}

/** Hunter's Mark (Ashstrider): extra Precision against an enemy with one of your ailments. */
export function huntersMarkPrecision(attacker: Fighter, defender: Fighter): number {
  const mark = attacker.setup.rules?.huntersMark;
  if (!mark) return 0;
  const ailing = AILMENT_TYPES.some((a) =>
    a === "poison" ? poisonStacks(defender.ailments) > 0 : defender.ailments[a] !== undefined,
  );
  return ailing ? mark.precision : 0;
}

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
/**
 * Multiplier of the damage over time `f` takes from its opponent's ailments: the DoT pool
 * (balancing-neustart-v1.md, step 2) of the source, where its DoT bonuses add up (`dotDamage`,
 * the ailment's own bonuses, Lingering, Fury), times what `f` takes extra (Shock, curses).
 * `ailment` adds that ailment's own bonuses; `extraMore` joins the pool (Cash In: Skill Damage).
 */
export function dotFactor(
  core: FightCore,
  f: Fighter,
  ailment?: AilmentType,
  extraMore = 0,
): number {
  const cursed = f.curses.reduce((sum, c) => sum + c.dotDamageTaken, 0);
  const source = core.fighters[other(f.side)];
  const rules = source.setup.rules;
  const pool = emptyPool();
  addFactor(pool, rules?.dotDamage);
  pool.more += (rules?.dotMore ?? 0) + extraMore + furyBonus(source);
  const lingering = rules?.lingering;
  if (lingering) pool.more += Math.min(lingering.max, lingering.perSecond * fightTime(core));
  if (ailment) {
    addFactor(pool, rules?.ailmentDamage?.[ailment]);
    pool.more += rules?.ailmentMore?.[ailment] ?? 0;
    // Bleeding Out, Master of Smolder: more ailment damage while a condition holds.
    for (const e of [
      ...(source.setup.weaponRules?.ailmentDamageWhen ?? []),
      ...(rules?.ailmentDamageWhen ?? []),
    ]) {
      if (e.ailment === ailment && conditionHolds(core, source, e.condition)) {
        addBonus(pool, e.amount);
      }
    }
  }
  return (1 + damageTaken(f) + cursed) * poolFactor(pool);
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

/** Remembers when a moment happened (Skill Web "within N s after …" conditions). */
export function mark(core: FightCore, f: Fighter, moment: FightMoment): void {
  f.moments[moment] = fightTime(core);
}

/** Whether a Battle Plan, Weapon Mastery or Skill Web condition holds for `f` right now. */
export function conditionHolds(core: FightCore, f: Fighter, condition: RuleCondition): boolean {
  const target = core.fighters[other(f.side)];
  switch (condition.kind) {
    case "heatAtLeast":
      return f.heat + 1e-9 >= condition.amount;
    case "barrierActive":
      return f.barrier >= 1;
    case "within":
      return fightTime(core) - f.moments[condition.event] <= condition.seconds + 1e-9;
    case "enemyStunned":
      return target.stunned > 1e-9;
    case "enemySundered": {
      const max = (f.setup.weaponRules?.sunder ?? COMBAT.sunder).maxStacks;
      return (target.curses.find((c) => c.id === SUNDER_ID)?.stacks ?? 0) >= max;
    }
    case "enemyWindup":
      return target.windup !== null;
    case "enemyStacks": {
      const stacks =
        condition.ailment === "poison"
          ? poisonStacks(target.ailments)
          : condition.ailment === "shock"
            ? (target.ailments.shock?.stacks ?? (target.ailments.shock ? 1 : 0))
            : target.ailments[condition.ailment]
              ? 1
              : 0;
      return stacks >= condition.count;
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

/**
 * Swings per second: Attack Speed, Chill and Weapon Mastery's conditional Attack Speed (own, and
 * the opponent's that slows this fighter: Hamstring, Numbing).
 */
export function attackRate(core: FightCore, f: Fighter): number {
  const opponent = core.fighters[other(f.side)];
  let extra = 0;
  for (const e of f.setup.weaponRules?.conditionalAttackSpeed ?? []) {
    if (conditionHolds(core, f, e.condition)) extra += e.amount;
  }
  for (const e of opponent.setup.weaponRules?.enemyAttackSpeed ?? []) {
    if (conditionHolds(core, opponent, e.condition)) extra += e.amount;
  }
  const fixed = f.setup.weaponRules?.fixedAttackRate;
  const base = fixed ?? f.stats.attackSpeed * Math.max(0.1, 1 + extra);
  return base * chillFactor(f.ailments);
}
