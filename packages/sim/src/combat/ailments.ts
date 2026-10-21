import { COMBAT } from "./constants";
import type { AilmentType } from "./types";

/**
 * A damage-over-time ailment that refreshes on re-application: Burn (Fire, reduces the target's
 * healing), Bleed (Physical, short and strong) and Corruption (Void, grows with every tick).
 */
export interface DotState {
  /** Damage per tick (one tick per second); Corruption's base before its growth. */
  readonly damagePerSecond: number;
  readonly remaining: number;
  /** Seconds until the next damage tick. */
  readonly nextTickIn: number;
  /** Corruption: ticks it has grown so far (each adds `corruptionRampPerTick` of the base). */
  readonly ramp?: number;
  /** The hit or skill whose application set the damage (for damage reports). */
  readonly source?: string;
}

/**
 * Chill (-Attack Speed, -Heat Gain) and Shock (+damage taken): a duration and a strength that
 * Ailment Effect raises. Shock stacks (ailments-v2.md 3.1).
 */
export interface TimedAilmentState {
  readonly remaining: number;
  /** Chill: the slow; Shock: damage taken per stack. Missing = the base value. */
  readonly power?: number;
  /** Shock stacks (1 when missing). */
  readonly stacks?: number;
}

/** One Poison stack: each runs out on its own. */
export interface PoisonStack {
  readonly damagePerSecond: number;
  readonly remaining: number;
  /** The hit or skill that added the stack (for damage reports). */
  readonly source?: string;
}

/** Poison: Physical DoT that stacks (docs/design/stat-liste-v2.md section 6). */
export interface PoisonState {
  readonly stacks: readonly PoisonStack[];
  readonly nextTickIn: number;
}

export interface AilmentStates {
  readonly burn?: DotState;
  readonly corruption?: DotState;
  readonly bleed?: DotState;
  readonly poison?: PoisonState;
  readonly chill?: TimedAilmentState;
  readonly shock?: TimedAilmentState;
}

/** Damage-over-time ailments, in the order their ticks are applied. */
export const DOT_AILMENTS = ["burn", "corruption", "bleed", "poison"] as const;

/** The DoTs that refresh and keep one damage value (Poison stacks instead). */
const REFRESHING_DOTS = ["burn", "corruption", "bleed"] as const;

const DOT_PER_SECOND = {
  burn: COMBAT.burnDamagePerSecond,
  corruption: COMBAT.corruptionDamagePerSecond,
  bleed: COMBAT.bleedDamagePerSecond,
} as const;

const EPSILON = 1e-9;

const BASE_DURATION: Record<AilmentType, number> = {
  burn: COMBAT.burnDurationSeconds,
  chill: COMBAT.chillDurationSeconds,
  shock: COMBAT.shockDurationSeconds,
  corruption: COMBAT.corruptionDurationSeconds,
  bleed: COMBAT.bleedDurationSeconds,
  poison: COMBAT.poisonDurationSeconds,
};

/**
 * Ailment duration: base × (1 − defender's Tenacity). Ailment Effect makes ailments stronger, not
 * longer (ailments-v2.md 3.3); longer ailments are rules of single nodes (`ailmentDurationBy`).
 */
export function ailmentDuration(type: AilmentType, defenderTenacity: number): number {
  return BASE_DURATION[type] * (1 - defenderTenacity);
}

/**
 * Applies an ailment. Burn, Corruption and Bleed refresh their duration and keep the stronger of
 * the old and the new damage (Corruption keeps its growth); Poison adds a stack (the oldest falls
 * off at the cap); Chill refreshes, Shock adds a stack up to its cap.
 *
 * @param hitDamage damage of the hit that caused the ailment (the DoTs scale with it)
 * @param effect the attacker's Ailment Effect: more DoT damage, a stronger Chill and Shock
 */
export function applyAilment(
  states: AilmentStates,
  type: AilmentType,
  duration: number,
  hitDamage: number,
  /** Poison stacks kept at most (Virulence raises it). */
  maxPoisonStacks: number = COMBAT.poisonMaxStacks,
  effect = 0,
  /** Shock stacks kept at most (Static Build raises it). */
  maxShockStacks: number = COMBAT.shockMaxStacks,
  /** The hit or skill applying it, kept for damage reports. */
  source?: string,
): AilmentStates {
  if (duration <= 0) return states;
  const strength = Math.max(0, 1 + effect);
  if (type === "burn" || type === "bleed" || type === "corruption") {
    const previous = states[type];
    const fresh = hitDamage * DOT_PER_SECOND[type] * strength;
    const damagePerSecond = Math.max(previous?.damagePerSecond ?? 0, fresh);
    const by = previous && previous.damagePerSecond >= fresh ? previous.source : source;
    const dot: DotState = {
      damagePerSecond,
      remaining: duration,
      nextTickIn: previous?.nextTickIn ?? 1,
      ...(type === "corruption" ? { ramp: previous?.ramp ?? 0 } : {}),
      ...(by !== undefined ? { source: by } : {}),
    };
    return { ...states, [type]: dot };
  }
  if (type === "poison") {
    const stack: PoisonStack = {
      damagePerSecond: hitDamage * COMBAT.poisonDamagePerSecond * strength,
      remaining: duration,
      ...(source !== undefined ? { source } : {}),
    };
    const stacks = [...(states.poison?.stacks ?? []), stack].slice(-maxPoisonStacks);
    return { ...states, poison: { stacks, nextTickIn: states.poison?.nextTickIn ?? 1 } };
  }
  if (type === "chill") {
    const power = Math.min(COMBAT.chillMaxSlow, COMBAT.chillSlow * strength);
    return {
      ...states,
      chill: {
        remaining: Math.max(duration, states.chill?.remaining ?? 0),
        power: Math.max(power, states.chill?.power ?? 0),
      },
    };
  }
  const previous = states.shock;
  return {
    ...states,
    shock: {
      remaining: duration,
      power: Math.max(COMBAT.shockDamageTaken * strength, previous?.power ?? 0),
      stacks: Math.min(maxShockStacks, (previous ? (previous.stacks ?? 1) : 0) + 1),
    },
  };
}

/** The Poison stack that the next application pushes off at the cap (Overflow), if any. */
export function poisonOverflow(
  states: AilmentStates,
  maxPoisonStacks: number = COMBAT.poisonMaxStacks,
): PoisonStack | undefined {
  const stacks = states.poison?.stacks ?? [];
  return stacks.length >= maxPoisonStacks ? stacks[stacks.length - maxPoisonStacks] : undefined;
}

/** Burn damage that is still to come (Combust deals a share of it at once). */
export function remainingBurnDamage(states: AilmentStates, maxTicks = Infinity): number {
  const burn = states.burn;
  if (!burn) return 0;
  const ticks = Math.max(0, Math.floor(burn.remaining - burn.nextTickIn + 1e-9) + 1);
  return burn.damagePerSecond * Math.min(ticks, maxTicks);
}

/** Damage all Poison stacks would still deal if they ran out (Toxic Bloom). */
export function remainingPoisonDamage(states: AilmentStates): number {
  return (states.poison?.stacks ?? []).reduce((sum, p) => sum + p.damagePerSecond * p.remaining, 0);
}

/**
 * Who caused the damage still left in some DoTs: share per hit or skill (sums to 1 when every
 * application knows its source). For damage reports of bursts that end DoTs.
 */
export function remainingDotSources(
  states: AilmentStates,
  ailments: readonly AilmentType[],
): Record<string, number> {
  const parts: Record<string, number> = {};
  let total = 0;
  const add = (source: string | undefined, amount: number) => {
    total += amount;
    if (source && amount > 0) parts[source] = (parts[source] ?? 0) + amount;
  };
  for (const a of ailments) {
    if (a === "poison") {
      for (const p of states.poison?.stacks ?? []) add(p.source, p.damagePerSecond * p.remaining);
      continue;
    }
    const state = states[a];
    if (!state || !("damagePerSecond" in state)) continue;
    add(state.source, remainingDotDamage({ [a]: state }));
  }
  return total > 0 ? Object.fromEntries(Object.entries(parts).map(([s, v]) => [s, v / total])) : {};
}

/** Number of Poison stacks. */
export const poisonStacks = (states: AilmentStates) => states.poison?.stacks.length ?? 0;

/** All ailment stacks: every Poison stack counts, every other running ailment counts once. */
export function ailmentStacks(states: AilmentStates): number {
  const others = (["burn", "corruption", "bleed", "chill", "shock"] as const).filter(
    (t) => states[t],
  ).length;
  return poisonStacks(states) + others;
}

/** Bleed damage that is still to come (Rend deals it at once). */
export function remainingBleedDamage(states: AilmentStates): number {
  const bleed = states.bleed;
  if (!bleed) return 0;
  // One tick per started second that is left.
  const ticks = Math.max(0, Math.floor(bleed.remaining - bleed.nextTickIn + 1e-9) + 1);
  return bleed.damagePerSecond * ticks;
}

/**
 * Damage every DoT on a fighter would still deal if it ran out: Burn, Corruption (at its current
 * growth), Bleed and all Poison stacks (Cash In).
 */
export function remainingDotDamage(states: AilmentStates): number {
  const corruption = states.corruption;
  const corruptionTicks = corruption
    ? Math.max(0, Math.floor(corruption.remaining - corruption.nextTickIn + 1e-9) + 1)
    : 0;
  return (
    remainingBurnDamage(states) +
    remainingBleedDamage(states) +
    (corruption ? dotTickDamage(corruption) * corruptionTicks : 0) +
    remainingPoisonDamage(states)
  );
}

/** Removes an ailment (Rend ends the Bleed it consumes). */
export function clearAilment(states: AilmentStates, type: AilmentType): AilmentStates {
  return Object.fromEntries(Object.entries(states).filter(([key]) => key !== type));
}

/**
 * Multiplies the Poison stacks (Toxic Burst doubles them), up to `maxStacks`. The oldest stacks
 * that do not fit any more are returned as `overflow`: their remaining damage, which bursts at once.
 */
export function multiplyPoison(
  states: AilmentStates,
  factor: number,
  maxStacks: number = COMBAT.poisonMaxStacks,
): { readonly states: AilmentStates; readonly overflow: number } {
  const poison = states.poison;
  if (!poison || factor <= 1) return { states, overflow: 0 };
  const stacks: PoisonStack[] = [];
  for (const stack of poison.stacks) {
    for (let i = 0; i < Math.round(factor); i++) stacks.push(stack);
  }
  const cut = Math.max(0, stacks.length - maxStacks);
  const overflow = stacks
    .slice(0, cut)
    .reduce((sum, p) => sum + p.damagePerSecond * p.remaining, 0);
  return { states: { ...states, poison: { ...poison, stacks: stacks.slice(cut) } }, overflow };
}

export interface AilmentStepResult {
  readonly states: AilmentStates;
  /** DoT damage ticks that happened during this step (before Shock). */
  readonly ticks: readonly {
    readonly ailment: (typeof DOT_AILMENTS)[number];
    readonly damage: number;
    /** Corruption at full growth collapsed: this tick is its burst (`COMBAT.collapseSeconds`). */
    readonly collapse?: boolean;
    /** Share of the tick per hit or skill that caused it (for damage reports). */
    readonly sources?: Readonly<Record<string, number>>;
  }[];
  readonly expired: readonly AilmentType[];
}

/**
 * Advances all ailments on one fighter by `dt` seconds. `growth` comes from the source's Weapon
 * Mastery: extra Corruption steps per tick (Hollow) and extra Collapse seconds.
 */
export function stepAilments(
  states: AilmentStates,
  dt: number,
  growth: { readonly ramp?: number; readonly collapse?: number } = {},
): AilmentStepResult {
  const next: { -readonly [K in keyof AilmentStates]: AilmentStates[K] } = {};
  const ticks: {
    ailment: (typeof DOT_AILMENTS)[number];
    damage: number;
    collapse?: boolean;
    sources?: Record<string, number>;
  }[] = [];
  const expired: AilmentType[] = [];

  for (const type of REFRESHING_DOTS) {
    const dot = states[type];
    if (!dot) continue;
    let { nextTickIn } = dot;
    let ramp = dot.ramp;
    const remaining = dot.remaining - dt;
    nextTickIn -= dt;
    // A tick counts if it falls inside this step and not after the DoT ran out.
    while (nextTickIn <= EPSILON && nextTickIn <= remaining + EPSILON) {
      ticks.push({
        ailment: type,
        damage: dotTickDamage(ramp === undefined ? dot : { ...dot, ramp }),
        ...(dot.source !== undefined ? { sources: { [dot.source]: 1 } } : {}),
      });
      if (ramp !== undefined) {
        ramp = Math.min(COMBAT.corruptionMaxRamp, ramp + 1 + (growth.ramp ?? 0));
        // Collapse: at full growth it deals several seconds at once and falls back to half.
        if (ramp >= COMBAT.corruptionMaxRamp) {
          ticks.push({
            ailment: type,
            damage:
              dotTickDamage({ ...dot, ramp }) * (COMBAT.collapseSeconds + (growth.collapse ?? 0)),
            collapse: true,
            ...(dot.source !== undefined ? { sources: { [dot.source]: 1 } } : {}),
          });
          ramp = Math.floor(COMBAT.corruptionMaxRamp / 2);
        }
      }
      nextTickIn += 1;
    }
    if (remaining <= EPSILON) expired.push(type);
    else {
      next[type] = {
        damagePerSecond: dot.damagePerSecond,
        remaining,
        nextTickIn,
        ...(ramp !== undefined ? { ramp } : {}),
        ...(dot.source !== undefined ? { source: dot.source } : {}),
      };
    }
  }

  if (states.poison) {
    let { nextTickIn } = states.poison;
    nextTickIn -= dt;
    const before = states.poison.stacks;
    // Every stack ticks while it lasts; the shared tick clock keeps one number per second.
    while (nextTickIn <= EPSILON) {
      const elapsed = dt + nextTickIn;
      const live = before.filter((stack) => stack.remaining - elapsed >= -EPSILON);
      const damage = live.reduce((sum, stack) => sum + stack.damagePerSecond, 0);
      const sources: Record<string, number> = {};
      for (const stack of live) {
        if (stack.source !== undefined && damage > 0) {
          sources[stack.source] = (sources[stack.source] ?? 0) + stack.damagePerSecond / damage;
        }
      }
      if (damage > 0) {
        ticks.push({
          ailment: "poison",
          damage,
          ...(live.some((x) => x.source) ? { sources } : {}),
        });
      }
      nextTickIn += 1;
    }
    const stacks = before
      .map((stack) => ({ ...stack, remaining: stack.remaining - dt }))
      .filter((stack) => stack.remaining > EPSILON);
    if (stacks.length === 0) expired.push("poison");
    else next.poison = { stacks, nextTickIn };
  }

  for (const type of ["chill", "shock"] as const) {
    const state = states[type];
    if (!state) continue;
    const remaining = state.remaining - dt;
    if (remaining <= EPSILON) expired.push(type);
    else next[type] = { ...state, remaining };
  }

  return { states: next, ticks, expired };
}

/** Damage of the next tick of a refreshing DoT (Corruption adds its growth). */
export function dotTickDamage(dot: DotState): number {
  return dot.damagePerSecond * (1 + COMBAT.corruptionRampPerTick * (dot.ramp ?? 0));
}

/** Corruption grows by `ticks` at once (Corrupt starts on a higher stage). */
export function advanceCorruption(states: AilmentStates, ticks: number): AilmentStates {
  const corruption = states.corruption;
  if (!corruption) return states;
  const ramp = Math.min(COMBAT.corruptionMaxRamp, (corruption.ramp ?? 0) + ticks);
  return { ...states, corruption: { ...corruption, ramp } };
}

/** Damage all DoTs on a fighter deal per second right now (Soul Harvest). */
export function dotDamagePerSecond(states: AilmentStates): number {
  let total = 0;
  for (const type of REFRESHING_DOTS) {
    const dot = states[type];
    if (dot) total += dotTickDamage(dot);
  }
  for (const stack of states.poison?.stacks ?? []) total += stack.damagePerSecond;
  return total;
}

/** "+X % damage taken" from Shock: its stacks times their power, up to the cap. */
export function damageTakenBonus(states: AilmentStates): number {
  const shock = states.shock;
  if (!shock) return 0;
  const total = (shock.power ?? COMBAT.shockDamageTaken) * (shock.stacks ?? 1);
  return Math.min(COMBAT.shockMaxDamageTaken, total);
}

/** Multiplier on Attack Speed and Heat Gain from Chill. */
export function chillFactor(states: AilmentStates): number {
  return states.chill ? 1 - (states.chill.power ?? COMBAT.chillSlow) : 1;
}

/** Multiplier on healing received (Burn reduces healing). */
export function healingFactor(states: AilmentStates): number {
  return states.burn ? 1 - COMBAT.burnHealingReduction : 1;
}

/**
 * Lingering Flame (Capstone): every running ailment gains `fraction` of its base duration, up to
 * twice its base duration.
 */
export function extendAilments(states: AilmentStates, fraction: number): AilmentStates {
  const extend = (type: AilmentType, remaining: number) =>
    Math.min(BASE_DURATION[type] * 2, remaining + BASE_DURATION[type] * fraction);
  const next: { -readonly [K in keyof AilmentStates]: AilmentStates[K] } = { ...states };
  for (const type of ["burn", "corruption", "bleed"] as const) {
    const s = states[type];
    if (s) next[type] = { ...s, remaining: extend(type, s.remaining) };
  }
  for (const type of ["chill", "shock"] as const) {
    const s = states[type];
    if (s) next[type] = { ...s, remaining: extend(type, s.remaining) };
  }
  if (states.poison) {
    next.poison = {
      ...states.poison,
      stacks: states.poison.stacks.map((p) => ({ ...p, remaining: extend("poison", p.remaining) })),
    };
  }
  return next;
}
