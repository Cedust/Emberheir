import { describe, expect, it } from "vitest";
import { rollDuration, rollValue } from "./juice";

describe("wallet counter", () => {
  it("starts at the old value and lands exactly on the new one", () => {
    expect(rollValue(100, 250, 0, 500)).toBe(100);
    expect(rollValue(100, 250, 500, 500)).toBe(250);
    expect(rollValue(100, 250, 9999, 500)).toBe(250);
  });

  it("moves fast first, then slows down, both ways", () => {
    const up = rollValue(0, 100, 250, 500);
    expect(up).toBeGreaterThan(50);
    expect(up).toBeLessThan(100);
    const down = rollValue(100, 0, 250, 500);
    expect(down).toBeLessThan(50);
    expect(down).toBeGreaterThan(0);
  });

  it("takes longer for big jumps but never too long", () => {
    expect(rollDuration(5)).toBeLessThan(rollDuration(5000));
    expect(rollDuration(1e9)).toBeLessThanOrEqual(900);
    expect(rollDuration(-300)).toBe(rollDuration(300));
  });
});
