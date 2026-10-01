import type { BuffStat, StatBonuses, TriggerCondition, TriggerSpec } from "./types";

/**
 * Runtime state of one trigger on a fighter: Condition → Chance → Effect → Internal Cooldown
 * (docs/design/stat-liste-v2.md section 8).
 */
export interface TriggerState {
  readonly spec: TriggerSpec;
  /** Seconds until the trigger may fire again. */
  cooldownLeft: number;
  /** Set once an `oncePerFight` trigger has fired. */
  spent: boolean;
  /** `everySeconds`: time since the last firing. */
  timer: number;
  /** `lifeBelow`: false after firing until life is back above the threshold. */
  armed: boolean;
}

export function createTriggerState(spec: TriggerSpec): TriggerState {
  return { spec, cooldownLeft: 0, spent: false, timer: 0, armed: true };
}

/** Final chance of a trigger: base chance × (1 + Trigger Chance), capped at 100 %. */
export function triggerChance(baseChance: number, triggerChanceBonus: number): number {
  return Math.min(1, Math.max(0, baseChance * (1 + triggerChanceBonus)));
}

/** True if the trigger is off cooldown and not used up. */
export function triggerReady(state: TriggerState): boolean {
  return state.cooldownLeft <= 1e-9 && !state.spent;
}

/** Marks a trigger as fired: starts the Internal Cooldown and spends once-per-fight triggers. */
export function markFired(state: TriggerState): void {
  state.cooldownLeft = state.spec.cooldown ?? 0;
  if (state.spec.oncePerFight) state.spent = true;
}

/**
 * Advances cooldowns and `everySeconds` timers by `dt`. Returns how many times each
 * `everySeconds` trigger is due (index into `states`).
 */
export function stepTriggers(states: readonly TriggerState[], dt: number): number[] {
  const due: number[] = [];
  states.forEach((state, i) => {
    state.cooldownLeft = Math.max(0, state.cooldownLeft - dt);
    const condition = state.spec.condition;
    if (condition.kind !== "everySeconds" || condition.seconds <= 0) return;
    state.timer += dt;
    while (state.timer + 1e-9 >= condition.seconds) {
      state.timer -= condition.seconds;
      due.push(i);
    }
  });
  return due;
}

/** `everyNthAttack`: does the attack with this 1-based count fire the trigger? */
export function isNthAttack(condition: TriggerCondition, attackCount: number): boolean {
  return condition.kind === "everyNthAttack" && condition.n > 0 && attackCount % condition.n === 0;
}

/** A timed stat buff from a trigger. */
export interface BuffState {
  /** Trigger id; the same trigger stacks instead of adding a second buff. */
  readonly id: string;
  readonly name: string;
  readonly stat: BuffStat;
  readonly amount: number;
  readonly stacks: number;
  readonly remaining: number;
}

/** Adds a buff or, if the same trigger already has one, adds a stack and refreshes it. */
export function applyBuff(
  buffs: readonly BuffState[],
  buff: Omit<BuffState, "stacks">,
  maxStacks: number,
): BuffState[] {
  const existing = buffs.find((b) => b.id === buff.id);
  if (!existing) return [...buffs, { ...buff, stacks: 1 }];
  const stacks = Math.min(Math.max(1, maxStacks), existing.stacks + 1);
  return buffs.map((b) => (b.id === buff.id ? { ...buff, stacks } : b));
}

/** Ticks buff durations. Returns the remaining buffs and whether any expired. */
export function stepBuffs(
  buffs: readonly BuffState[],
  dt: number,
): { buffs: BuffState[]; expired: boolean } {
  const next = buffs
    .map((b) => ({ ...b, remaining: b.remaining - dt }))
    .filter((b) => b.remaining > 1e-9);
  return { buffs: next, expired: next.length !== buffs.length };
}

/** Stat bonuses of all active buffs together. */
export function buffBonuses(buffs: readonly BuffState[]): StatBonuses {
  const total: Partial<Record<BuffStat, number>> = {};
  for (const b of buffs) total[b.stat] = (total[b.stat] ?? 0) + b.amount * b.stacks;
  return total;
}
