import { perksFor, type PerkId } from "../combat/perks";
import { ATTRIBUTES, type Attribute, type Attributes } from "../combat/types";

/**
 * Attributes v1 (docs/design/attribute-v1.md): few points, each worth a lot. A class sets its
 * Class Array, the player adds a few free points at creation, and later points only come from
 * The Harvest (Prestige). Levels give none.
 */
export const ATTRIBUTE_RULES = {
  /** Highest own value of an attribute. */
  max: 10,
  /** Gear can lift an attribute above the own value up to this. */
  itemMax: 12,
  /** Free points at character creation, and the highest value an attribute may get there. */
  creationPoints: 6,
  creationMax: 7,
  /** The Harvest (every Prestige): new points, points that may move (Rekindle) and Phoenix Ash. */
  harvestPoints: 2,
  rekindleMoves: 2,
  harvestPhoenixAsh: 1,
  /** Ashen Rebirth at Kaelen: a full redistribution for one Phoenix Ash. */
  rebirthCost: 1,
} as const;

export type AttributePoints = Partial<Record<Attribute, number>>;

export const sumAttributes = (a: AttributePoints): number =>
  ATTRIBUTES.reduce((sum, key) => sum + (a[key] ?? 0), 0);

export function addAttributes(a: Attributes, b: AttributePoints): Attributes {
  return Object.fromEntries(ATTRIBUTES.map((k) => [k, a[k] + (b[k] ?? 0)])) as Attributes;
}

/** Points that left an attribute between `before` and `after` (Rekindle counts these). */
export function movedPoints(before: Attributes, after: Attributes): number {
  return ATTRIBUTES.reduce((sum, k) => sum + Math.max(0, before[k] - after[k]), 0);
}

/**
 * Attributes that count for Breakpoint Perks: own points plus Blaze Boons (never gear), up to the
 * gear limit.
 */
export function breakpointAttributes(own: Attributes, boon: AttributePoints): Attributes {
  return Object.fromEntries(
    ATTRIBUTES.map((k) => [k, Math.min(ATTRIBUTE_RULES.itemMax, own[k] + (boon[k] ?? 0))]),
  ) as Attributes;
}

/** Attributes in the fight: own points and Boons, gear on top up to the gear limit. */
export function combatAttributes(
  own: Attributes,
  boon: AttributePoints,
  gear: AttributePoints,
): Attributes {
  const base = breakpointAttributes(own, boon);
  return Object.fromEntries(
    ATTRIBUTES.map((k) => [k, Math.max(base[k], Math.min(ATTRIBUTE_RULES.itemMax, base[k] + (gear[k] ?? 0)))]),
  ) as Attributes;
}

export function heroPerks(own: Attributes, boon: AttributePoints): PerkId[] {
  return perksFor(breakpointAttributes(own, boon));
}

/**
 * Why a new set of own attributes is not allowed, or null. Every attribute stays between the
 * Class Array (`floor`) and `max`, and at most `points` may be spent above `current`.
 */
export function attributeProblem(
  next: Attributes,
  options: {
    readonly floor: Attributes;
    readonly current: Attributes;
    /** Points available on top of `current`. */
    readonly points: number;
    readonly max?: number;
    /** Points that may leave an attribute (Rekindle); default none. */
    readonly moves?: number;
  },
): string | null {
  const max = options.max ?? ATTRIBUTE_RULES.max;
  for (const k of ATTRIBUTES) {
    const v = next[k];
    if (!Number.isInteger(v)) return "Points must be whole";
    if (v < options.floor[k]) return "Below the Class Array";
    if (v > Math.max(max, options.current[k])) return `At most ${max} points`;
  }
  if (movedPoints(options.current, next) > (options.moves ?? 0)) return "Too many points moved";
  if (sumAttributes(next) - sumAttributes(options.current) > options.points) {
    return "Not enough Attribute Points";
  }
  return null;
}
