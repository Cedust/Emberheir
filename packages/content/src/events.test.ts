import { describe, expect, it } from "vitest";
import { EVENTS } from "./events";
import { GAME_DATA } from "./game";

describe("Events of the act map", () => {
  it("have unique ids and at least one option each", () => {
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    for (const event of EVENTS) expect(event.options.length).toBeGreaterThan(0);
    expect(GAME_DATA.events).toBe(EVENTS);
  });

  it("never take more than half of a layer (Life, the Flask)", () => {
    for (const option of EVENTS.flatMap((e) => e.options)) {
      expect((option.cost?.life ?? 0) + (option.risk?.life ?? 0)).toBeLessThanOrEqual(0.5);
      expect(option.cost?.flask ?? 0).toBeLessThanOrEqual(1);
    }
  });

  it("give Boons only on Events marked as Shrines", () => {
    for (const event of EVENTS) {
      const boons = event.options.some((o) => o.gain?.boons);
      expect(boons).toBe(event.shrine === true);
    }
  });
});
