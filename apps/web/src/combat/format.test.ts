import { describe, expect, it } from "vitest";
import { formatEvent } from "./format";

const names = { hero: "Heir", enemy: "Ashen Brute" } as const;

describe("formatEvent", () => {
  it("describes hits with crit and block markers", () => {
    expect(
      formatEvent(
        {
          t: 1.25,
          type: "hit",
          side: "hero",
          source: "Slash",
          damage: 12,
          damageType: "physical",
          crit: true,
          blocked: false,
        },
        names,
      ),
    ).toEqual({
      time: "1.25s",
      side: "hero",
      tone: "physical",
      text: "Slash hits Ashen Brute for 12 (Crit!)",
    });
  });

  it("describes skills, ailments and the end of the fight", () => {
    expect(
      formatEvent({ t: 3, type: "skill", side: "hero", skill: "Firebolt", heatCost: 20 }, names)
        .text,
    ).toBe("Heir uses Firebolt (−20 Heat)");
    expect(formatEvent({ t: 3, type: "ailment", side: "enemy", ailment: "burn" }, names).text).toBe(
      "Ashen Brute suffers Burn",
    );
    expect(formatEvent({ t: 9, type: "fightEnd", winner: null }, names).text).toBe(
      "Time is up: draw",
    );
  });
});
