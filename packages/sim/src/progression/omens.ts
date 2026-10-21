import type { Rng } from "../rng";
import { mergeRules } from "../combat/rules";
import { sumBonuses } from "../combat/stats";
import type { CombatRules, StatBonuses, TriggerSpec } from "../combat/types";

/**
 * Omens (neuausrichtung-v1.md 5.2 and 7.2): one visible rule for a whole trip. Run Omens twist an
 * old act of the run: the hero picks one of two when setting out, each has a price and a reward
 * and never switches a layer of defense or healing off. Wildfire Omens are the endgame's mods:
 * the hero picks as many as they like, each adds its Peril, and every tier above V asks for a
 * minimum. The hard ones (no Flask, a locked slot) only exist there.
 */
export interface OmenSide {
  readonly bonuses?: StatBonuses;
  readonly rules?: CombatRules;
  readonly triggers?: readonly TriggerSpec[];
}

export interface OmenReward {
  /** More Ember Coal from every fight (0.5 = +50 %, rounded up). */
  readonly emberCoal?: number;
  /** More Legendary chance (0.25 = +25 %). */
  readonly legendary?: number;
  /** Runes drop this many ranks higher. */
  readonly runeTiers?: number;
  /** More XP (0.15 = +15 %). */
  readonly xp?: number;
  /** More Ash from every fight (0.25 = +25 %). */
  readonly ash?: number;
}

export interface OmenDefinition {
  readonly id: string;
  readonly name: string;
  /** "run": offered when setting out into an old act. "wildfire": a Wildfire mod with Peril. */
  readonly kind: "run" | "wildfire";
  /** The price in one sentence, e.g. "Enemies have +50 % Armor." */
  readonly price: string;
  /** The reward in one sentence (Run Omens; the Wildfire pays per Peril). */
  readonly reward?: string;
  /** The Scout's question to the build, e.g. "Do you have Penetration?" */
  readonly question: string;
  /** Wildfire Omens: 1–3. */
  readonly peril?: number;
  /** Every enemy of the trip; `life` and `damage` multiply. */
  readonly enemy?: OmenSide & { readonly life?: number; readonly damage?: number };
  readonly hero?: OmenSide;
  /** Multiplies what one Flask charge heals; 0 = no Flask at all. */
  readonly flaskHeal?: number;
  /** Multiplies the rest at the Hearth Embers and at a Hearth of the act map. */
  readonly restHeal?: number;
  /** A fight that lasts longer than this is lost. */
  readonly fightSeconds?: number;
  /** The first Rotation Slot stays empty. */
  readonly lockFirstSlot?: boolean;
  /** Multiplies the Elite chance of every stage. */
  readonly eliteChance?: number;
  readonly bonus?: OmenReward;
}

/** All Omens of a trip at once. */
export interface OmenEffects {
  readonly enemy: Required<Pick<OmenSide, "triggers">> &
    OmenSide & { readonly life: number; readonly damage: number };
  readonly hero: Required<Pick<OmenSide, "triggers">> & OmenSide;
  readonly flaskHeal: number;
  readonly restHeal: number;
  readonly fightSeconds?: number;
  readonly lockFirstSlot: boolean;
  readonly eliteChance: number;
  readonly bonus: Required<OmenReward>;
}

export const OMEN_RULES = {
  /** Run Omens Eldrin shows when the hero sets out into an old act. */
  runOffer: 2,
  /** Minimum Peril per Wildfire tier (I–X). */
  minPeril: [0, 0, 0, 0, 0, 2, 4, 6, 8, 10],
  /** What every point of Peril pays in the Wildfire. */
  perPeril: { xp: 0.08, legendary: 0.05 },
  /** One Rune rank more for every this many Peril. */
  perilPerRuneTier: 4,
} as const;

/** The Peril a Wildfire tier asks for at least. */
export const minPeril = (tier: number): number =>
  OMEN_RULES.minPeril[Math.min(OMEN_RULES.minPeril.length, Math.max(1, tier)) - 1] ?? 0;

export const omenPeril = (omens: readonly OmenDefinition[]): number =>
  omens.reduce((sum, o) => sum + (o.peril ?? 0), 0);

/** What a Wildfire trip pays for its Peril. */
export function perilReward(peril: number): Required<OmenReward> {
  return {
    emberCoal: 0,
    ash: 0,
    xp: OMEN_RULES.perPeril.xp * peril,
    legendary: OMEN_RULES.perPeril.legendary * peril,
    runeTiers: Math.floor(peril / OMEN_RULES.perilPerRuneTier),
  };
}

const minOf = (values: readonly (number | undefined)[]): number | undefined => {
  const set = values.filter((v): v is number => v !== undefined);
  return set.length ? Math.min(...set) : undefined;
};

/** All Omens of a trip combined, the Peril reward of a Wildfire trip included. */
export function omenEffects(omens: readonly OmenDefinition[], wildfire = false): OmenEffects {
  const product = (pick: (o: OmenDefinition) => number | undefined) =>
    omens.reduce((p, o) => p * (pick(o) ?? 1), 1);
  const sum = (pick: (o: OmenReward) => number | undefined) =>
    omens.reduce((s, o) => s + (o.bonus ? (pick(o.bonus) ?? 0) : 0), 0);
  const peril = wildfire ? perilReward(omenPeril(omens)) : perilReward(0);
  const fightSeconds = minOf(omens.map((o) => o.fightSeconds));
  return {
    enemy: {
      bonuses: sumBonuses(...omens.map((o) => o.enemy?.bonuses)),
      rules: mergeRules(...omens.map((o) => o.enemy?.rules)),
      triggers: omens.flatMap((o) => o.enemy?.triggers ?? []),
      life: product((o) => o.enemy?.life),
      damage: product((o) => o.enemy?.damage),
    },
    hero: {
      bonuses: sumBonuses(...omens.map((o) => o.hero?.bonuses)),
      rules: mergeRules(...omens.map((o) => o.hero?.rules)),
      triggers: omens.flatMap((o) => o.hero?.triggers ?? []),
    },
    flaskHeal: product((o) => o.flaskHeal),
    restHeal: product((o) => o.restHeal),
    ...(fightSeconds !== undefined ? { fightSeconds } : {}),
    lockFirstSlot: omens.some((o) => o.lockFirstSlot),
    eliteChance: product((o) => o.eliteChance),
    bonus: {
      emberCoal: sum((b) => b.emberCoal) + peril.emberCoal,
      legendary: sum((b) => b.legendary) + peril.legendary,
      runeTiers: sum((b) => b.runeTiers) + peril.runeTiers,
      xp: sum((b) => b.xp) + peril.xp,
      ash: sum((b) => b.ash) + peril.ash,
    },
  };
}

/** Two different Run Omens from the pool. */
export function rollOmenOffer(
  pool: readonly OmenDefinition[],
  rng: Rng,
  count: number = OMEN_RULES.runOffer,
): string[] {
  const left = pool.filter((o) => o.kind === "run");
  const out: string[] = [];
  while (out.length < count && left.length) {
    const [omen] = left.splice(rng.int(0, left.length - 1), 1);
    if (omen) out.push(omen.id);
  }
  return out;
}
