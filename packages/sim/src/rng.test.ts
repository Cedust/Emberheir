import { describe, expect, it } from "vitest";
import { Rng } from "./rng";

describe("Rng", () => {
  it("produces the same sequence for the same seed", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    expect(new Rng(1).next()).not.toEqual(new Rng(2).next());
  });

  it("stays within [0, 1)", () => {
    const rng = new Rng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("int() covers the whole inclusive range", () => {
    const rng = new Rng(123);
    const seen = new Set<number>();
    for (let i = 0; i < 1_000; i++) seen.add(rng.int(1, 6));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("int() rejects invalid ranges", () => {
    expect(() => new Rng(1).int(5, 1)).toThrow(RangeError);
  });

  it("chance() roughly matches the probability", () => {
    const rng = new Rng(99);
    let hits = 0;
    for (let i = 0; i < 10_000; i++) if (rng.chance(0.25)) hits++;
    expect(hits / 10_000).toBeCloseTo(0.25, 1);
  });
});
