import type { Capstone, ReactionCondition, SlotCondition, SlotModifier } from "../combat/types";

/**
 * The Battle Plan (skills-v1.md section 6): the third Prestige system next to Seals and the Skill
 * Tree. Every Prestige unlocks one upgrade; the hero's choices are stored in `BattlePlanState`.
 */

export interface BattlePlanUnlocks {
  readonly rotationSlots: number;
  /** Trigger Thresholds can be set per Rotation Slot. */
  readonly thresholds: boolean;
  readonly reactionSlots: number;
  /** Slot Modifiers per slot (0, 1 or 2). */
  readonly modifiers: number;
  /** "Skip if…" conditions on Rotation Slots. */
  readonly conditions: boolean;
  readonly capstone: boolean;
}

export type BattlePlanUpgrade =
  "rotationSlot" | "thresholds" | "reactionSlot" | "modifier" | "conditions" | "capstone";

/**
 * The ladder of upgrades (skills-v1.md, "Freischaltung über 10 Prestiges"): entry n comes with
 * the n-th Prestige. `BATTLE_PLAN_START` is what the first run has. Everything else (unlocks, the
 * Kaelen view, the Inheritance cards) is derived from these two tables, so moving an upgrade to
 * another Prestige is a one-line change.
 */
export const BATTLE_PLAN_START: readonly BattlePlanUpgrade[] = ["rotationSlot"];

export const BATTLE_PLAN_LADDER: readonly {
  readonly upgrade: BattlePlanUpgrade;
  readonly name: string;
}[] = [
  { upgrade: "rotationSlot", name: "Rotation Slot 2" },
  { upgrade: "thresholds", name: "Trigger Threshold" },
  { upgrade: "rotationSlot", name: "Rotation Slot 3" },
  { upgrade: "reactionSlot", name: "Reaction Slot 1" },
  { upgrade: "modifier", name: "Slot Modifiers" },
  { upgrade: "rotationSlot", name: "Rotation Slot 4" },
  { upgrade: "reactionSlot", name: "Reaction Slot 2" },
  { upgrade: "conditions", name: "Rotation Conditions" },
  { upgrade: "modifier", name: "2nd Slot Modifier" },
  { upgrade: "capstone", name: "Capstone" },
];

/** Upgrades the hero has after `prestige` Prestiges. */
function upgradesAt(prestige: number): BattlePlanUpgrade[] {
  return [...BATTLE_PLAN_START, ...BATTLE_PLAN_LADDER.slice(0, prestige).map((u) => u.upgrade)];
}

export function battlePlanUnlocks(prestige: number): BattlePlanUnlocks {
  const ups = upgradesAt(prestige);
  const count = (u: BattlePlanUpgrade) => ups.filter((x) => x === u).length;
  return {
    rotationSlots: count("rotationSlot"),
    thresholds: count("thresholds") > 0,
    reactionSlots: count("reactionSlot"),
    modifiers: count("modifier"),
    conditions: count("conditions") > 0,
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
}[] = [
  { id: "thrifty", name: "Thrifty", text: "−15 % Heat Cost" },
  { id: "empowered", name: "Empowered", text: "+1 Skill Level" },
  { id: "reverb", name: "Reverb", text: "20 % chance to repeat for free" },
  { id: "overcharge", name: "Overcharge", text: "Extra Heat adds up to +50 % effect" },
];

export const REACTION_CONDITIONS: readonly {
  readonly id: string;
  readonly name: string;
  readonly condition: ReactionCondition;
}[] = [
  { id: "fight-start", name: "Fight Start", condition: { kind: "fightStart" } },
  { id: "life-50", name: "Life below 50 %", condition: { kind: "lifeBelow", fraction: 0.5 } },
  { id: "life-30", name: "Life below 30 %", condition: { kind: "lifeBelow", fraction: 0.3 } },
  { id: "enemy-windup", name: "Enemy winds up", condition: { kind: "enemyWindup" } },
  { id: "enemy-30", name: "Enemy below 30 %", condition: { kind: "enemyBelow", fraction: 0.3 } },
  { id: "ailmented", name: "You suffer an ailment", condition: { kind: "ailmented" } },
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
}

export const EMPTY_PLAN: BattlePlanState = {
  thresholds: [],
  modifiers: [],
  conditions: [],
  reactions: [],
  reactionModifiers: [],
  capstone: null,
};

/** Seconds a Reaction Slot needs before it can fire again. */
export const REACTION_COOLDOWN = 10;

export function capstoneSpec(plan: BattlePlanState): Capstone | undefined {
  const c = plan.capstone;
  if (!c) return undefined;
  return c.id === "echo" ? { kind: "echo", slot: c.slot } : { kind: c.id };
}

/** The unlocked part of a slot's modifiers. */
export function slotModifiers(
  list: readonly (readonly SlotModifier[])[],
  index: number,
  unlocks: BattlePlanUnlocks,
): SlotModifier[] {
  return (list[index] ?? []).slice(0, unlocks.modifiers);
}

export function slotCondition(id: string | null | undefined): SlotCondition | undefined {
  return SLOT_CONDITIONS.find((c) => c.id === id)?.condition;
}

export function reactionCondition(id: string): ReactionCondition | undefined {
  return REACTION_CONDITIONS.find((c) => c.id === id)?.condition;
}
