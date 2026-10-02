import { describe, expect, it } from "vitest";
import { COMBAT } from "./constants";
import {
  addHeat,
  heatFromHitTaken,
  heatFromOwnHit,
  heatGainMultiplier,
  stepHeat,
  triggerThreshold,
} from "./heat";

describe("Heat", () => {
  it("is clamped to 0..100", () => {
    expect(addHeat(95, 10, 1)).toBe(100);
    expect(addHeat(5, -10, 1)).toBe(0);
  });

  it("Heat Gain and Chill scale every gain", () => {
    expect(heatGainMultiplier(0.2, 1)).toBeCloseTo(1.2);
    expect(heatGainMultiplier(0, 0.7)).toBeCloseTo(0.7);
    expect(addHeat(0, 10, heatGainMultiplier(0.5, 1))).toBe(15);
  });

  it("Cooling and Steady gain Heat per landed hit, Warming does not", () => {
    expect(heatFromOwnHit("cooling", 10)).toBe(10);
    expect(heatFromOwnHit("steady", 20)).toBe(20);
    expect(heatFromOwnHit("warming", 10)).toBe(0);
  });

  it("only Cooling gains Heat from hits taken: 1 per 1 % max life, at most 10", () => {
    expect(heatFromHitTaken("cooling", 5, 100)).toBe(5);
    expect(heatFromHitTaken("cooling", 50, 100)).toBe(COMBAT.maxHeatFromHitTaken);
    expect(heatFromHitTaken("steady", 5, 100)).toBe(0);
    expect(heatFromHitTaken("warming", 5, 100)).toBe(0);
  });

  it("Warming gains 12 per second", () => {
    expect(stepHeat("warming", 0, 1, 0, 1)).toBe(COMBAT.warmingHeatPerSecond);
    expect(stepHeat("warming", 0, 1, 0, 1.5)).toBe(COMBAT.warmingHeatPerSecond * 1.5);
  });

  it("Cooling decays only after the grace time without a landed hit", () => {
    const grace = COMBAT.coolingGraceSeconds;
    expect(stepHeat("cooling", 50, 0.05, grace, 1)).toBe(50);
    expect(stepHeat("cooling", 50, 0.05, grace + 0.05, 1)).toBeCloseTo(
      50 - COMBAT.coolingDecayPerSecond * 0.05,
    );
    expect(stepHeat("cooling", 0.1, 1, 5, 1)).toBe(0);
  });

  it("Steady never decays", () => {
    expect(stepHeat("steady", 50, 1, 100, 1)).toBe(50);
  });
});

describe("triggerThreshold", () => {
  it("defaults to the Heat Cost and never goes below it", () => {
    expect(triggerThreshold(25, undefined)).toBe(25);
    expect(triggerThreshold(25, 10)).toBe(25);
    expect(triggerThreshold(25, 70)).toBe(70);
    expect(triggerThreshold(25, 500)).toBe(COMBAT.maxHeat);
  });
});
