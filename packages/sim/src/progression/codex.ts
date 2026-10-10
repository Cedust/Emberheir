import { codexPartsOf } from "../items/codex";
import type { AffixDefinition, CodexHome, Item, ItemCatalog } from "../items/types";
import { CODEX } from "./constants";

/**
 * Trigger Codex (docs/design/trigger-codex-v1.md): salvaging an item with a trigger affix
 * teaches its Condition and Effect. Permanent, like the Runeword Codex. Kindle puts a learned
 * pair on an item at the item's own tier (entschlackung-v1.md: no Mastery, no Quarry).
 */

export type CodexPartKind = "condition" | "effect";

export interface CodexState {
  /** Learned Conditions by id (the value is above 0; older saves kept a tier there). */
  readonly conditions: Readonly<Record<string, number>>;
  /** Learned Effects by id. */
  readonly effects: Readonly<Record<string, number>>;
}

export const EMPTY_CODEX: CodexState = { conditions: {}, effects: {} };

const bucket = (kind: CodexPartKind) => (kind === "condition" ? "conditions" : "effects");

/** Whether a part is learned. */
export function codexKnows(codex: CodexState, kind: CodexPartKind, id: string): boolean {
  return (codex[bucket(kind)][id] ?? 0) > 0;
}

export interface LearnedPart {
  readonly kind: CodexPartKind;
  readonly id: string;
}

/** Learns the parts of a salvaged item. Returns the new Codex and what it gained. */
export function learnFromItem(
  codex: CodexState,
  item: Item,
  catalog: ItemCatalog,
): { readonly codex: CodexState; readonly learned: readonly LearnedPart[] } {
  const conditions = { ...codex.conditions };
  const effects = { ...codex.effects };
  const learned: LearnedPart[] = [];
  const learn = (kind: CodexPartKind, id: string) => {
    const book = kind === "condition" ? conditions : effects;
    if ((book[id] ?? 0) > 0) return;
    book[id] = 1;
    learned.push({ kind, id });
  };
  for (const part of codexPartsOf(item, catalog)) {
    learn("condition", part.condition);
    learn("effect", part.effect);
  }
  return { codex: learned.length ? { conditions, effects } : codex, learned };
}

/** What the current fight is: its enemy's archetype, the act, and whether it is the boss. */
export interface CodexFight {
  readonly archetype: string;
  readonly actId: string;
  readonly boss: boolean;
}

export function isHome(home: CodexHome, fight: CodexFight): boolean {
  return (
    (!fight.boss && (home.archetypes?.includes(fight.archetype) ?? false)) ||
    (home.actId !== undefined && home.actId === fight.actId) ||
    (home.boss === true && fight.boss)
  );
}

/**
 * Loot weight per affix: trigger affixes with a part at home in this fight ×`homeWeight`. Stat
 * affixes are unchanged.
 */
export function codexAffixFactor(
  catalog: ItemCatalog,
  fight: CodexFight,
): (affix: AffixDefinition) => number {
  return (affix) => {
    if (affix.kind !== "trigger" || !affix.parts) return 1;
    const condition = catalog.conditions.get(affix.parts.condition);
    const effect = catalog.effects.get(affix.parts.effect);
    const home =
      (condition && isHome(condition.home, fight)) || (effect && isHome(effect.home, fight));
    return home ? CODEX.homeWeight : 1;
  };
}

/** Index of the item's kindled trigger, or -1. */
export function kindledIndex(item: Item): number {
  return item.affixes.findIndex((r) => r.kindled);
}
