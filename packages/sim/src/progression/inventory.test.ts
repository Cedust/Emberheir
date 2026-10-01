import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import { rollItem } from "../items/generate";
import { TEST_CATALOG } from "../items/test-fixtures";
import { type PlacedItem, addToGrid, findSpace, itemSize, usedCells } from "./inventory";

const item = (baseId: string, seed = 1) =>
  rollItem(TEST_CATALOG, { baseId, itemLevel: 1, rarity: "normal" }, new Rng(seed));

describe("inventory grid", () => {
  it("uses default sizes per slot", () => {
    expect(itemSize(item("test-sword"), TEST_CATALOG)).toEqual({ w: 1, h: 3 });
    expect(itemSize(item("test-ring"), TEST_CATALOG)).toEqual({ w: 1, h: 1 });
    expect(itemSize(item("test-shield"), TEST_CATALOG)).toEqual({ w: 2, h: 2 });
  });

  it("fills column by column from the top left", () => {
    let grid: PlacedItem[] = [];
    for (let i = 0; i < 5; i++) grid = addToGrid(grid, item("test-ring", i), TEST_CATALOG) ?? [];
    expect(grid.map((p) => [p.x, p.y])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 0],
    ]);
    expect(usedCells(grid, TEST_CATALOG)).toBe(5);
  });

  it("returns undefined when an item does not fit", () => {
    let grid: PlacedItem[] = [];
    // Ten swords (1×3) fill rows 0–2 of every column; only 1×1 cells are left in row 3.
    for (let i = 0; i < 10; i++) grid = addToGrid(grid, item("test-sword", i), TEST_CATALOG) ?? [];
    expect(grid).toHaveLength(10);
    expect(findSpace(grid, item("test-shield"), TEST_CATALOG)).toBeUndefined();
    expect(addToGrid(grid, item("test-sword", 99), TEST_CATALOG)).toBeUndefined();
    expect(findSpace(grid, item("test-ring"), TEST_CATALOG)).toEqual({ x: 0, y: 3 });
  });
});
