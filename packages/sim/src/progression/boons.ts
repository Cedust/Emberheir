import { mergeRules } from "../combat/rules";
import { sumBonuses } from "../combat/stats";
import type {
  CombatRules,
  DamageType,
  StatBonuses,
  TriggerEffect,
  TriggerSpec,
} from "../combat/types";
import type { Rng } from "../rng";

/**
 * Stolen Fire Boons (Spielspaß plan, Teil 1): sparks stolen from the Wardens' fire. They bend the
 * build until the next Prestige, then burn with the rest. Content defines the Boons; this module
 * resolves picks into ranks and combat effects and rolls the offers.
 */

/** Exclusive slots hold one Boon each (a new one replaces the old); the others stack. */
export type BoonSlot = "strike" | "skill" | "reaction" | "heat" | "trigger" | "passive";

export const EXCLUSIVE_BOON_SLOTS: readonly BoonSlot[] = ["strike", "skill", "reaction", "heat"];

export type BoonGrade = "spark" | "flame" | "blaze";

export const BOON_GRADES: readonly BoonGrade[] = ["spark", "flame", "blaze"];

export interface BoonFamilyDefinition {
  readonly id: string;
  readonly name: string;
  /** The Warden whose fire it is (shown on the card); Hearth has none. */
  readonly warden?: string;
  /** Damage types this family suits; the offer prefers families that fit the weapon. */
  readonly damageTypes: readonly DamageType[];
  /** Card color. */
  readonly color: string;
}

export interface BoonDefinition {
  readonly id: string;
  readonly name: string;
  readonly family: string;
  readonly slot: BoonSlot;
  /** One line for the card; `#` is replaced by `value` at the Boon's rank and grade. */
  readonly text: string;
  readonly value: number;
  /** Scaled by rank and grade. */
  readonly bonuses?: StatBonuses;
  /** Scaled by rank and grade (multipliers move away from 1). */
  readonly rules?: CombatRules;
  /** The effect's magnitude is scaled by rank and grade (for an ailment or extra attack: the chance). */
  readonly trigger?: Omit<TriggerSpec, "id">;
  /** Fusion Boon: only offered once the hero holds Boons of both families. */
  readonly fusion?: readonly [string, string];
}

/** One Boon taken from an offer. Taking the same Boon again raises its rank. */
export interface BoonPick {
  readonly id: string;
  readonly grade: BoonGrade;
}

/**
 * Boons of this run. `kept` came from acts already cleared in this run and survive death and
 * Retreat; `fresh` came from the current act and burn when the hero dies or retreats.
 */
export interface BoonsState {
  readonly kept: readonly BoonPick[];
  readonly fresh: readonly BoonPick[];
}

export const EMPTY_BOONS: BoonsState = { kept: [], fresh: [] };

export const BOONS = {
  maxRank: 3,
  /** Each rank above I adds this much of the base effect. */
  perRank: 0.5,
  /** Effect multiplier by grade. */
  gradeScale: { spark: 1, flame: 1.3, blaze: 1.6 } satisfies Record<BoonGrade, number>,
  gradeWeight: { spark: 80, flame: 17, blaze: 3 } satisfies Record<BoonGrade, number>,
  offerSize: 3,
  /** Families that fit the weapon's damage type (and Hearth) are this much likelier (≈70 %). */
  preferredWeight: 2.3,
  /** Fusion Boons are rare: their weight. */
  fusionWeight: 0.35,
} as const;

export interface ActiveBoon {
  readonly def: BoonDefinition;
  readonly rank: number;
  readonly grade: BoonGrade;
  /** Effect multiplier from rank and grade. */
  readonly scale: number;
}

const gradeIndex = (g: BoonGrade) => BOON_GRADES.indexOf(g);

/**
 * The Boons in effect: picks in order, the same Boon raises its rank (best grade counts), and a
 * new Boon in an exclusive slot replaces the one there.
 */
export function activeBoons(
  boons: BoonsState,
  defs: readonly BoonDefinition[],
): readonly ActiveBoon[] {
  const list: { def: BoonDefinition; rank: number; grade: BoonGrade }[] = [];
  for (const pick of [...boons.kept, ...boons.fresh]) {
    const def = defs.find((d) => d.id === pick.id);
    if (!def) continue;
    const same = list.find((b) => b.def.id === def.id);
    if (same) {
      same.rank = Math.min(BOONS.maxRank, same.rank + 1);
      if (gradeIndex(pick.grade) > gradeIndex(same.grade)) same.grade = pick.grade;
      continue;
    }
    if (EXCLUSIVE_BOON_SLOTS.includes(def.slot)) {
      const taken = list.findIndex((b) => b.def.slot === def.slot);
      if (taken >= 0) list.splice(taken, 1);
    }
    list.push({ def, rank: 1, grade: pick.grade });
  }
  return list.map((b) => ({ ...b, scale: boonScale(b.rank, b.grade) }));
}

export function boonScale(rank: number, grade: BoonGrade): number {
  return (1 + BOONS.perRank * (rank - 1)) * BOONS.gradeScale[grade];
}

/** The card text with its number at this scale (a chance never shows above 100). */
export function boonText(def: BoonDefinition, scale: number): string {
  const flat = def.trigger?.effect.kind === "ailment" || def.trigger?.effect.kind === "extraAttack";
  const v = flat ? Math.min(100, def.value * scale) : def.value * scale;
  const shown = Math.abs(v) >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  return def.text.replace("#", String(shown));
}

function scaleBonuses(bonuses: StatBonuses, scale: number): StatBonuses {
  return Object.fromEntries(
    Object.entries(bonuses).map(([k, v]) => [k, (v as number) * scale]),
  ) as StatBonuses;
}

const away = (x: number | undefined, scale: number) =>
  x === undefined ? undefined : 1 + (x - 1) * scale;

function scaleRules(rules: CombatRules, scale: number): CombatRules {
  const r: Record<string, unknown> = { ...rules };
  if (rules.damageTaken !== undefined) r.damageTaken = rules.damageTaken * scale;
  if (rules.skillCostMultiplier !== undefined)
    r.skillCostMultiplier = Math.max(0.2, away(rules.skillCostMultiplier, scale) ?? 1);
  if (rules.defaultAttackDamage !== undefined)
    r.defaultAttackDamage = away(rules.defaultAttackDamage, scale);
  if (rules.dotDamage !== undefined) r.dotDamage = away(rules.dotDamage, scale);
  if (rules.dotLifesteal !== undefined) r.dotLifesteal = rules.dotLifesteal * scale;
  if (rules.execute) r.execute = { below: rules.execute.below, bonus: rules.execute.bonus * scale };
  return r as CombatRules;
}

function scaleEffect(effect: TriggerEffect, scale: number): TriggerEffect {
  switch (effect.kind) {
    case "weaponHit":
      return { ...effect, multiplier: effect.multiplier * scale };
    case "spellHit":
      return {
        ...effect,
        damage: { min: effect.damage.min * scale, max: effect.damage.max * scale },
      };
    case "heal":
    case "barrier":
      return { ...effect, fraction: effect.fraction * scale };
    case "heat":
      return { ...effect, amount: effect.amount * scale };
    case "buff":
      return { ...effect, amount: effect.amount * scale };
    case "stun":
      return { ...effect, seconds: effect.seconds * scale };
    case "reflect":
      return { ...effect, fraction: effect.fraction * scale };
    default:
      return effect;
  }
}

/** What the active Boons add to the hero's fight setup. */
export function boonEffects(active: readonly ActiveBoon[]): {
  readonly bonuses: StatBonuses;
  readonly rules: CombatRules | undefined;
  readonly triggers: readonly TriggerSpec[];
} {
  let bonuses: StatBonuses = {};
  const rules: CombatRules[] = [];
  const triggers: TriggerSpec[] = [];
  for (const b of active) {
    if (b.def.bonuses) bonuses = sumBonuses(bonuses, scaleBonuses(b.def.bonuses, b.scale));
    if (b.def.rules) rules.push(scaleRules(b.def.rules, b.scale));
    const trigger = b.def.trigger;
    if (trigger) {
      // Effects without a magnitude (an ailment, an extra attack) get a higher chance instead.
      const flat = trigger.effect.kind === "ailment" || trigger.effect.kind === "extraAttack";
      triggers.push({
        ...trigger,
        id: `boon-${b.def.id}`,
        ...(flat
          ? { chance: Math.min(1, (trigger.chance ?? 1) * b.scale) }
          : { effect: scaleEffect(trigger.effect, b.scale) }),
      });
    }
  }
  return { bonuses, rules: rules.length ? mergeRules(...rules) : undefined, triggers };
}

/**
 * Rolls a Shrine offer: three different Boons from the open families. A Boon at max rank, a
 * Reaction Boon before the Reaction Slot is unlocked, and a Fusion Boon without both families
 * never show up. Families that fit the weapon are preferred, the grade is rolled per card.
 */
export function rollBoonOffer(
  defs: readonly BoonDefinition[],
  families: readonly BoonFamilyDefinition[],
  options: {
    readonly open: readonly string[];
    readonly active: readonly ActiveBoon[];
    readonly damageType: DamageType;
    readonly reactionSlot: boolean;
  },
  rng: Rng,
): BoonPick[] {
  const held = new Set(options.active.map((b) => b.def.family));
  const preferred = new Set(
    families
      .filter((f) => f.damageTypes.includes(options.damageType) || f.damageTypes.length === 0)
      .map((f) => f.id),
  );
  const pool = defs.filter((d) => {
    const owned = options.active.find((b) => b.def.id === d.id);
    if (owned && owned.rank >= BOONS.maxRank) return false;
    if (d.slot === "reaction" && !options.reactionSlot) return false;
    if (d.fusion) return d.fusion.every((f) => held.has(f));
    return options.open.includes(d.family);
  });
  const weight = (d: BoonDefinition) =>
    d.fusion ? BOONS.fusionWeight : preferred.has(d.family) ? BOONS.preferredWeight : 1;
  const offer: BoonPick[] = [];
  const left = [...pool];
  while (offer.length < BOONS.offerSize && left.length) {
    const total = left.reduce((sum, d) => sum + weight(d), 0);
    let roll = rng.next() * total;
    let index = left.findIndex((d) => (roll -= weight(d)) < 0);
    if (index < 0) index = left.length - 1;
    const [def] = left.splice(index, 1);
    if (def) offer.push({ id: def.id, grade: rollGrade(rng) });
  }
  return offer;
}

function rollGrade(rng: Rng): BoonGrade {
  const total = BOON_GRADES.reduce((sum, g) => sum + BOONS.gradeWeight[g], 0);
  let roll = rng.next() * total;
  for (const g of BOON_GRADES) {
    roll -= BOONS.gradeWeight[g];
    if (roll < 0) return g;
  }
  return "spark";
}
