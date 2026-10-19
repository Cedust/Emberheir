/**
 * Damage pools (balancing-neustart-v1.md, step 2): every bonus of one pool adds up into one
 * "more" share, every penalty multiplies as "less". Two +50 % bonuses give ×2, not ×2.25, so a
 * new bonus never grows all the others.
 */
export interface DamagePool {
  /** Bonuses added up (0.5 = +50 %). */
  more: number;
  /** Penalties multiplied (0.8 = 20 % less). */
  less: number;
}

export function emptyPool(): DamagePool {
  return { more: 0, less: 1 };
}

/** A factor: above 1 its bonus goes into "more", below 1 it multiplies "less". */
export function addFactor(pool: DamagePool, factor: number | undefined): void {
  if (factor === undefined) return;
  if (factor >= 1) pool.more += factor - 1;
  else pool.less *= Math.max(0, factor);
}

/** A bonus as a share: positive into "more", negative as "less" (−0.2 = 20 % less). */
export function addBonus(pool: DamagePool, amount: number | undefined): void {
  if (!amount) return;
  if (amount > 0) pool.more += amount;
  else pool.less *= Math.max(0, 1 + amount);
}

/** The pool's final multiplier. */
export function poolFactor(pool: DamagePool): number {
  return (1 + pool.more) * pool.less;
}
