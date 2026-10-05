import type { Capstone, ReactionCondition, SlotCondition, SlotModifier } from "../combat/types";

/**
 * The Battle Plan (skills-v1.md section 6, sped up by the "Spielspaß" plan): the third Prestige
 * system next to Seals and the Skill Tree. Every Prestige unlocks upgrades; the hero's choices are
 * stored in `BattlePlanState`.
 */

export interface BattlePlanUnlocks {
  readonly rotationSlots: number;
  /** Trigger Thresholds can be set per Rotation Slot. */
  readonly thresholds: boolean;
  readonly reactionSlots: number;
  /** The advanced Reaction conditions (Enemy heals, Barrier breaks, …). */
  readonly reactionConditions: boolean;
  /** Slot Modifiers per slot (0, 1 or 2). */
  readonly modifiers: number;
  /** "Skip if…" conditions on Rotation Slots. */
  readonly conditions: boolean;
  /** A skill that fires for free when the fight starts. */
  readonly openingMove: boolean;
  /** Rare Slot Modifiers (Reverb) can be chosen. */
  readonly rareModifiers: boolean;
  readonly capstone: boolean;
}

export type BattlePlanUpgrade =
  | "rotationSlot"
  | "thresholds"
  | "reactionSlot"
  | "reactionConditions"
  | "modifier"
  | "conditions"
  | "openingMove"
  | "rareModifiers"
  | "capstone";

/**
 * The ladder of upgrades: entry n comes with the n-th Prestige. The first run is a tutorial with
 * one Rotation Slot (`BATTLE_PLAN_START`); seven Prestiges bring the rest (Playtest 2: no more
 * Ascension runs), so most bring two building blocks and the Capstone comes with the last. Everything else (unlocks, the Kaelen
 * view, the Inheritance cards) is derived from these two tables.
 */
export const BATTLE_PLAN_START: readonly BattlePlanUpgrade[] = ["rotationSlot"];

export const BATTLE_PLAN_LADDER: readonly {
  readonly upgrades: readonly BattlePlanUpgrade[];
  readonly name: string;
}[] = [
  { upgrades: ["rotationSlot", "reactionSlot"], name: "Rotation Slot 2 · Reaction Slot 1" },
  { upgrades: ["rotationSlot", "thresholds"], name: "Rotation Slot 3 · Trigger Threshold" },
  { upgrades: ["modifier", "conditions"], name: "Slot Modifiers · Rotation Conditions" },
  { upgrades: ["reactionSlot", "reactionConditions"], name: "Reaction Slot 2 · New Reactions" },
  { upgrades: ["rotationSlot", "modifier"], name: "Rotation Slot 4 · 2nd Slot Modifier" },
  { upgrades: ["openingMove", "rareModifiers"], name: "Opening Move · Rare Modifiers" },
  { upgrades: ["capstone"], name: "Capstone" },
];

/** Upgrades the hero has after `prestige` Prestiges. */
function upgradesAt(prestige: number): BattlePlanUpgrade[] {
  return [
    ...BATTLE_PLAN_START,
    ...BATTLE_PLAN_LADDER.slice(0, Math.max(0, prestige)).flatMap((u) => u.upgrades),
  ];
}

export function battlePlanUnlocks(prestige: number): BattlePlanUnlocks {
  const ups = upgradesAt(prestige);
  const count = (u: BattlePlanUpgrade) => ups.filter((x) => x === u).length;
  return {
    rotationSlots: count("rotationSlot"),
    thresholds: count("thresholds") > 0,
    reactionSlots: count("reactionSlot"),
    reactionConditions: count("reactionConditions") > 0,
    modifiers: count("modifier"),
    conditions: count("conditions") > 0,
    openingMove: count("openingMove") > 0,
    rareModifiers: count("rareModifiers") > 0,
    capstone: count("capstone") > 0,
  };
}

/** The Prestige that brings the n-th (1-based) copy of an upgrade; undefined if none does. */
export function unlockPrestige(upgrade: BattlePlanUpgrade, n: number): number | undefined {
  for (let p = 0; p <= BATTLE_PLAN_LADDER.length; p++) {
    if (upgradesAt(p).filter((u) => u === upgrade).length >= n) return p;
  }
  return undefined;
}

export const SLOT_MODIFIERS: readonly {
  readonly id: SlotModifier;
  readonly name: string;
  readonly text: string;
  /** Rare modifiers need the "Rare Modifiers" upgrade. */
  readonly rare?: boolean;
}[] = [
  { id: "thrifty", name: "Thrifty", text: "−15 % Heat Cost" },
  { id: "empowered", name: "Empowered", text: "+1 Skill Level" },
  { id: "reverb", name: "Reverb", text: "20 % chance to repeat for free", rare: true },
  { id: "overcharge", name: "Overcharge", text: "Extra Heat adds up to +50 % effect" },
];

export const REACTION_CONDITIONS: readonly {
  readonly id: string;
  readonly name: string;
  readonly condition: ReactionCondition;
  /** Advanced conditions need the "New Reactions" upgrade. */
  readonly advanced?: boolean;
}[] = [
  { id: "fight-start", name: "Fight Start", condition: { kind: "fightStart" } },
  { id: "life-50", name: "Life below 50 %", condition: { kind: "lifeBelow", fraction: 0.5 } },
  { id: "life-30", name: "Life below 30 %", condition: { kind: "lifeBelow", fraction: 0.3 } },
  { id: "enemy-windup", name: "Enemy winds up", condition: { kind: "enemyWindup" } },
  {
    id: "enemy-30",
    name: "Enemy below 30 %",
    condition: { kind: "enemyBelow", fraction: 0.3 },
    advanced: true,
  },
  {
    id: "ailmented",
    name: "You suffer an ailment",
    condition: { kind: "ailmented" },
    advanced: true,
  },
  { id: "enemy-heals", name: "Enemy heals", condition: { kind: "enemyHeals" }, advanced: true },
  {
    id: "barrier-breaks",
    name: "Your Barrier breaks",
    condition: { kind: "barrierBreaks" },
    advanced: true,
  },
  {
    id: "enemy-stacks",
    name: "Enemy has 5+ ailment stacks",
    condition: { kind: "enemyStacks", count: 5 },
    advanced: true,
  },
];

export const SLOT_CONDITIONS: readonly {
  readonly id: string;
  readonly name: string;
  readonly condition: SlotCondition;
}[] = [
  ...(["bleed", "poison", "burn", "chill", "shock", "corruption"] as const).map((ailment) => ({
    id: `enemy-${ailment}`,
    name: `Enemy has ${ailment[0]?.toUpperCase()}${ailment.slice(1)}`,
    condition: { kind: "enemyHas", ailment } as const,
  })),
  { id: "enemy-50", name: "Enemy below 50 %", condition: { kind: "enemyBelow", fraction: 0.5 } },
  { id: "life-50", name: "Life below 50 %", condition: { kind: "lifeBelow", fraction: 0.5 } },
];

export type CapstoneId = Capstone["kind"];

export const CAPSTONES: readonly {
  readonly id: CapstoneId;
  readonly name: string;
  readonly text: string;
}[] = [
  { id: "echo", name: "Echo", text: "One slot fires a second time at 50 %." },
  { id: "crescendo", name: "Crescendo", text: "+2 % damage per 100 Heat spent this fight." },
  { id: "vigil", name: "Vigil", text: "Reactions cost no Heat; their cooldown doubles." },
  { id: "ignition", name: "Ignition", text: "Start with full Heat; the first pass is free." },
  {
    id: "lingeringFlame",
    name: "Lingering Flame",
    text: "Skill hits extend every ailment on the enemy.",
  },
  { id: "emberWard", name: "Ember Ward", text: "Heat you pay becomes Barrier, up to 20 %." },
];

/** One Reaction Slot as the hero set it up. */
export interface PlanReaction {
  readonly skillId: string;
  /** Id from `REACTION_CONDITIONS`. */
  readonly conditionId: string;
}

/** The hero's Battle Plan choices. Arrays are indexed by slot; missing entries mean "none". */
export interface BattlePlanState {
  /** Trigger Threshold per Rotation Slot; `null` = the skill's Heat Cost. */
  readonly thresholds: readonly (number | null)[];
  /** Slot Modifiers per Rotation Slot. */
  readonly modifiers: readonly (readonly SlotModifier[])[];
  /** "Skip if…" condition id per Rotation Slot (`SLOT_CONDITIONS`). */
  readonly conditions: readonly (string | null)[];
  readonly reactions: readonly (PlanReaction | null)[];
  /** Slot Modifiers per Reaction Slot. */
  readonly reactionModifiers: readonly (readonly SlotModifier[])[];
  /** `slot` is the Rotation Slot Echo repeats. */
  readonly capstone: { readonly id: CapstoneId; readonly slot: number } | null;
  /** Skill id that fires for free at fight start (8th Prestige); missing in older saves. */
  readonly openingMove?: string | null;
}

export const EMPTY_PLAN: BattlePlanState = {
  thresholds: [],
  modifiers: [],
  conditions: [],
  reactions: [],
  reactionModifiers: [],
  capstone: null,
  openingMove: null,
};

/** Seconds a Reaction Slot needs before it can fire again. */
export const REACTION_COOLDOWN = 10;

export function capstoneSpec(plan: BattlePlanState): Capstone | undefined {
  const c = plan.capstone;
  if (!c) return undefined;
  return c.id === "echo" ? { kind: "echo", slot: c.slot } : { kind: c.id };
}

/** Whether a modifier can be chosen with these unlocks. */
export function modifierAllowed(id: SlotModifier, unlocks: BattlePlanUnlocks): boolean {
  const def = SLOT_MODIFIERS.find((d) => d.id === id);
  return !!def && (!def.rare || unlocks.rareModifiers);
}

/** The unlocked part of a slot's modifiers. */
export function slotModifiers(
  list: readonly (readonly SlotModifier[])[],
  index: number,
  unlocks: BattlePlanUnlocks,
): SlotModifier[] {
  return (list[index] ?? []).filter((m) => modifierAllowed(m, unlocks)).slice(0, unlocks.modifiers);
}

/** Whether a Reaction condition can be chosen with these unlocks. */
export function reactionConditionAllowed(id: string, unlocks: BattlePlanUnlocks): boolean {
  const def = REACTION_CONDITIONS.find((c) => c.id === id);
  return !!def && (!def.advanced || unlocks.reactionConditions);
}

export function slotCondition(id: string | null | undefined): SlotCondition | undefined {
  return SLOT_CONDITIONS.find((c) => c.id === id)?.condition;
}

export function reactionCondition(id: string): ReactionCondition | undefined {
  return REACTION_CONDITIONS.find((c) => c.id === id)?.condition;
}
