import type { CombatantSetup, StatBonuses, TriggerSpec } from "../combat/types";
import { sumBonuses } from "../combat/stats";
import { PROGRESSION } from "./constants";

/** An Elite modifier (docs/design/gegner-bosse-v1.md section 4). */
export interface EliteModifier {
  readonly id: string;
  /** Shown on the enemy plaque, e.g. "Stone Skin". */
  readonly name: string;
  readonly description: string;
  readonly bonuses?: StatBonuses;
  readonly triggers?: readonly TriggerSpec[];
}

/** Elite chance at a stage: base + per act + per stage in the act, capped. */
export function eliteChance(act: number, stageInAct: number): number {
  return Math.min(
    PROGRESSION.eliteChanceCap,
    PROGRESSION.eliteChanceBase +
      PROGRESSION.eliteChancePerAct * (act - 1) +
      PROGRESSION.eliteChancePerStage * (stageInAct - 1),
  );
}

/** Number of Elite modifiers, which grows with the Monster Level. */
export function eliteModifierCount(monsterLevel: number): number {
  return Math.min(
    PROGRESSION.maxEliteModifiers,
    1 + Math.floor((monsterLevel - 1) / PROGRESSION.monsterLevelsPerEliteModifier),
  );
}

/** Turns an enemy setup into an Elite: more life and damage plus its modifiers. */
export function applyEliteModifiers(
  setup: CombatantSetup,
  modifiers: readonly EliteModifier[],
): CombatantSetup {
  const triggers = [...(setup.triggers ?? []), ...modifiers.flatMap((m) => m.triggers ?? [])];
  return {
    ...setup,
    baseLife: (setup.baseLife ?? 100) * PROGRESSION.eliteLifeMultiplier,
    damageMultiplier: (setup.damageMultiplier ?? 1) * PROGRESSION.eliteDamageMultiplier,
    bonuses: sumBonuses(setup.bonuses, ...modifiers.map((m) => m.bonuses)),
    ...(triggers.length ? { triggers } : {}),
  };
}
