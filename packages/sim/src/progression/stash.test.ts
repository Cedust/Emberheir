import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import { rollItem } from "../items/generate";
import { TEST_CATALOG } from "../items/test-fixtures";
import type { PlacedItem } from "./inventory";
import { STASH_TABS, addToStash, placeInStash, sortStashTab, stashTab, tabOf } from "./stash";

const item = (baseId: string, seed = 1) =>
  rollItem(TEST_CATALOG, { baseId, itemLevel: 1, rarity: "normal" }, new Rng(seed));

/** Fills one tab with swords until no more fit. */
function fillTab(stash: PlacedItem[], tab: number, seed: number): PlacedItem[] {
  let out = stash;
  for (let i = 0; ; i++) {
    const next = addToStash(out, item("test-sword", seed + i), TEST_CATALOG, tab);
    if (!next) return out;
    out = next;
  }
}

describe("stash tabs", () => {
  it("has four tabs; items without a tab sit in the first", () => {
    expect(STASH_TABS).toBe(4);
    const ring = item("test-ring");
    expect(tabOf({ item: ring, x: 0, y: 0 })).toBe(0);
    expect(stashTab([{ item: ring, x: 0, y: 0 }], 0)).toHaveLength(1);
    expect(stashTab([{ item: ring, x: 0, y: 0 }], 1)).toHaveLength(0);
  });

  it("each tab is its own grid", () => {
    const a = item("test-ring", 1);
    const b = item("test-ring", 2);
    let stash = addToStash([], a, TEST_CATALOG, 0) ?? [];
    stash = addToStash(stash, b, TEST_CATALOG, 2) ?? [];
    // Both take the top-left cell, each in its own tab.
    expect(stash.map((p) => [tabOf(p), p.x, p.y])).toEqual([
      [0, 0, 0],
      [2, 0, 0],
    ]);
    expect(addToStash(stash, item("test-ring", 3), TEST_CATALOG, STASH_TABS)).toBeUndefined();
  });

  it("without a tab, an item goes into the first tab with room", () => {
    const full = fillTab([], 0, 100);
    const sword = item("test-sword", 999);
    const out = addToStash(full, sword, TEST_CATALOG) ?? [];
    expect(out.find((p) => p.item.id === sword.id)?.tab).toBe(1);
    expect(addToStash(full, sword, TEST_CATALOG, 0)).toBeUndefined();
  });

  it("moves an item to another tab and sorts one tab only", () => {
    const shield = item("test-shield", 1);
    const ring = item("test-ring", 2);
    let stash = addToStash([], ring, TEST_CATALOG, 0, { x: 5, y: 5 }) ?? [];
    stash = addToStash(stash, shield, TEST_CATALOG, 1, { x: 4, y: 4 }) ?? [];
    stash = placeInStash(stash, ring.id, TEST_CATALOG, 1, { x: 0, y: 0 }) ?? [];
    expect(stashTab(stash, 0)).toHaveLength(0);
    expect(stashTab(stash, 1).map((p) => p.item.id)).toEqual([shield.id, ring.id]);
    // The shield's cells are taken.
    expect(placeInStash(stash, ring.id, TEST_CATALOG, 1, { x: 5, y: 5 })).toBeUndefined();
    const sorted = sortStashTab(stash, TEST_CATALOG, 1);
    expect(sorted.every((p) => tabOf(p) === 1)).toBe(true);
    expect(stashTab(sorted, 1).find((p) => p.item.id === shield.id)).toMatchObject({ x: 0, y: 0 });
  });
});
