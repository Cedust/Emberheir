import { ITEM_CATALOG, RUNEWORDS } from "@emberheir/content";
import { type GameState, codexKnows } from "@emberheir/sim";

export type CollectionId = "trophies" | "runewords" | "codex";

/** One collection goal at the Hearthfire (spielzeit-v1.md, E): progress and its banner. */
export interface Collection {
  readonly id: CollectionId;
  readonly name: string;
  /** What a full collection brings. */
  readonly reward: string;
  readonly found: number;
  readonly total: number;
}

const CODEX_PARTS = [
  ...[...ITEM_CATALOG.conditions.keys()].map((id) => ({ kind: "condition" as const, id })),
  ...[...ITEM_CATALOG.effects.keys()].map((id) => ({ kind: "effect" as const, id })),
];

/** The three collections of a character: Trophy Wall, Runeword Codex, Trigger Codex. */
export function collections(state: GameState): readonly Collection[] {
  const { legacy } = state;
  const uniques = new Set(ITEM_CATALOG.uniques.keys());
  const runewords = new Set(RUNEWORDS.map((w) => w.id));
  return [
    {
      id: "trophies",
      name: "Trophy Wall",
      reward: "A gold banner in the Camp",
      found: new Set(legacy.trophies.filter((t) => uniques.has(t))).size,
      total: uniques.size,
    },
    {
      id: "runewords",
      name: "Runeword Codex",
      reward: "A rune banner in the Camp",
      found: new Set(legacy.runewords.filter((w) => runewords.has(w))).size,
      total: runewords.size,
    },
    {
      id: "codex",
      name: "Trigger Codex",
      reward: "A sigil banner in the Camp",
      found: CODEX_PARTS.filter((p) => codexKnows(legacy.codex, p.kind, p.id)).length,
      total: CODEX_PARTS.length,
    },
  ];
}

/** Collections that are full: each hangs its banner in the Camp. */
export function completedCollections(state: GameState): readonly CollectionId[] {
  return collections(state)
    .filter((c) => c.total > 0 && c.found >= c.total)
    .map((c) => c.id);
}
