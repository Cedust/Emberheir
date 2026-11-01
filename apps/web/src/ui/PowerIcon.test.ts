import { LEGENDARY_POWERS } from "@emberheir/content";
import { describe, expect, it } from "vitest";
import { hasPowerIcon } from "./PowerIcon";

describe("Legendary Power icons", () => {
  it("every Legendary Power has a painted icon", () => {
    expect(LEGENDARY_POWERS.filter((p) => !hasPowerIcon(p.id)).map((p) => p.id)).toEqual([]);
  });
});
