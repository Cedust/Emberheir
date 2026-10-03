import { codexPartsOf } from "../items/codex";
import type { AffixDefinition, CodexHome, Item, ItemCatalog } from "../items/types";
import { CODEX } from "./constants";

/**
 * Trigger Codex (docs/design/trigger-codex-v1.md): salvaging an item with a trigger affix
 * teaches its Condition and Effect. Mastery = the highest Item Tier a part was salvaged at.
 * Permanent, like the Runeword Codex.
 */

export type CodexPartKind = "condition" | "effect";

export interface CodexState {
  /** Mastery (Item Tier 1–10) by Condition id. */
  readonly conditions: Readonly<Record<string, number>>;
  /** Mastery by Effect id. */
  readonly effects: Readonly<Record<string, number>>;
}

/** The part marked at Old Nan: it drops more often, and for sure after a few misses. */
export interface QuarryMark {
  readonly kind: CodexPartKind;
  readonly id: string;
  /** Elite and boss item picks without it since it was marked or last showed up. */
  readonly misses: number;
}

export const EMPTY_CODEX: CodexState = { conditions: {}, effects: {} };

const bucket = (kind: CodexPartKind) => (kind === "condition" ? "conditions" : "effects");

/** Mastery of a part, 0 if it is unknown. */
export function codexMastery(codex: CodexState, kind: CodexPartKind, id: string): number {
  return codex[bucket(kind)][id] ?? 0;
}

export interface LearnedPart {
  readonly kind: CodexPartKind;
  readonly id: string;
  readonly mastery: number;
  /** Seen for the first time. */
  readonly isNew: boolean;
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
  const learn = (kind: CodexPartKind, id: string, tier: number) => {
    const book = kind === "condition" ? conditions : effects;
    const old = book[id] ?? 0;
    if (tier <= old) return;
    book[id] = tier;
    learned.push({ kind, id, mastery: tier, isNew: old === 0 });
  };
  for (const part of codexPartsOf(item, catalog)) {
    learn("condition", part.condition, part.tier);
    learn("effect", part.effect, part.tier);
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

function hasPart(affix: AffixDefinition, kind: CodexPartKind, id: string): boolean {
  return affix.kind === "trigger" && affix.parts?.[kind] === id;
}

/**
 * Loot weight per affix: trigger affixes with a part at home in this fight ×`homeWeight`, with
 * the Quarry part ×`quarryWeight` on top. Stat affixes are unchanged.
 */
export function codexAffixFactor(
  catalog: ItemCatalog,
  fight: CodexFight,
  quarry: QuarryMark | null,
): (affix: AffixDefinition) => number {
  return (affix) => {
    if (affix.kind !== "trigger" || !affix.parts) return 1;
    const condition = catalog.conditions.get(affix.parts.condition);
    const effect = catalog.effects.get(affix.parts.effect);
    const home =
      (condition && isHome(condition.home, fight)) || (effect && isHome(effect.home, fight));
    const quarried = quarry && hasPart(affix, quarry.kind, quarry.id);
    return (home ? CODEX.homeWeight : 1) * (quarried ? CODEX.quarryWeight : 1);
  };
}

/** Trigger affixes that drop and carry the Quarry part. */
export function quarryAffixIds(catalog: ItemCatalog, quarry: QuarryMark): string[] {
  return [...catalog.affixes.values()]
    .filter((a) => a.weight > 0 && hasPart(a, quarry.kind, quarry.id))
    .map((a) => a.id);
}

/** Does one of these items carry the Quarry part? */
export function quarryFound(items: readonly Item[], catalog: ItemCatalog, quarry: QuarryMark) {
  return items.some((item) =>
    item.affixes.some((r) => {
      const affix = catalog.affixes.get(r.affixId);
      return affix !== undefined && hasPart(affix, quarry.kind, quarry.id);
    }),
  );
}

/** Tier of a kindled trigger: the lower Mastery of both parts, at most the item's tier. */
export function kindleTier(
  codex: CodexState,
  conditionId: string,
  effectId: string,
  item: Item,
): number {
  return Math.min(
    codexMastery(codex, "condition", conditionId),
    codexMastery(codex, "effect", effectId),
    item.tier,
  );
}

/** Index of the item's kindled trigger, or -1. */
export function kindledIndex(item: Item): number {
  return item.affixes.findIndex((r) => r.kindled);
}
