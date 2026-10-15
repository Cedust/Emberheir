import { describe, expect, it } from "vitest";
import { CRUCIBLE_SLOTS } from "@emberheir/sim";
import { LEGENDARY_POWERS } from "./legendary";

describe("Ember Crucible", () => {
  it("every Power has a slot, and every slot has several Powers to choose from", () => {
    for (const slot of CRUCIBLE_SLOTS) {
      expect(LEGENDARY_POWERS.filter((p) => p.crucible === slot).length).toBeGreaterThanOrEqual(5);
    }
  });
});
