import { describe, expect, it } from "vitest";
import { minPeril, OMEN_RULES } from "@emberheir/sim";
import { OMENS, RUN_OMENS, WILDFIRE_OMENS } from "./omens";

/** The rules for Omens (neuausrichtung-v1.md 5.2 and 7.2). */
describe("Omens", () => {
  it("have unique ids and a readable price and question", () => {
    expect(new Set(OMENS.map((o) => o.id)).size).toBe(OMENS.length);
    for (const o of OMENS) {
      expect(o.price.length).toBeGreaterThan(5);
      expect(o.question.endsWith("?")).toBe(true);
    }
  });

  it("Run Omens: a price and a reward, never a layer switched off, no hard ones", () => {
    expect(RUN_OMENS.length).toBeGreaterThanOrEqual(OMEN_RULES.runOffer * 2);
    for (const o of RUN_OMENS) {
      expect(o.kind).toBe("run");
      expect(o.reward, o.id).toBeDefined();
      expect(o.peril).toBeUndefined();
      expect(o.flaskHeal ?? 1, o.id).toBeGreaterThanOrEqual(0.5);
      expect(o.hero?.rules?.lifeMultiplier ?? 1, o.id).toBeGreaterThanOrEqual(0.5);
      expect(o.lockFirstSlot, o.id).toBeUndefined();
      expect(o.fightSeconds, o.id).toBeUndefined();
    }
  });

  it("Wildfire Omens: Peril 1–3, enough for Wildfire X in many ways", () => {
    for (const o of WILDFIRE_OMENS) {
      expect(o.kind).toBe("wildfire");
      expect([1, 2, 3]).toContain(o.peril);
    }
    expect(WILDFIRE_OMENS.length).toBeGreaterThanOrEqual(18);
    const total = WILDFIRE_OMENS.reduce((sum, o) => sum + (o.peril ?? 0), 0);
    expect(total).toBeGreaterThanOrEqual(3 * minPeril(10));
  });
});
