import { describe, expect, it } from "vitest";
import { addBonus, addFactor, emptyPool, poolFactor } from "./pools";

describe("damage pools", () => {
  it("add bonuses up and multiply penalties", () => {
    const pool = emptyPool();
    addFactor(pool, 1.5);
    addBonus(pool, 0.5);
    addFactor(pool, 0.8);
    addBonus(pool, -0.5);
    addFactor(pool, undefined);
    // (1 + 0.5 + 0.5) × 0.8 × 0.5
    expect(poolFactor(pool)).toBeCloseTo(0.8);
  });

  it("start at ×1", () => {
    expect(poolFactor(emptyPool())).toBe(1);
  });
});
