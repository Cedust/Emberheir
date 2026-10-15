import { describe, expect, it } from "vitest";
import { ASHBORN, ASHBORN_BOARDS } from "@emberheir/sim";
import { ASHBORN_VALUES } from "./ashborn";

describe("Ashborn Boards", () => {
  it("four boards with unique values, more room than the 100 points", () => {
    expect(new Set(ASHBORN_VALUES.map((v) => v.id)).size).toBe(ASHBORN_VALUES.length);
    for (const board of ASHBORN_BOARDS) {
      expect(ASHBORN_VALUES.filter((v) => v.board === board).length).toBeGreaterThanOrEqual(4);
    }
    expect(ASHBORN_VALUES.length * ASHBORN.maxPerValue).toBeGreaterThan(ASHBORN.maxLevel);
  });
});
