import type { ItemComparison } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { compareRows } from "./itemCompare";

const cmp = (over: Partial<ItemComparison>): ItemComparison => ({
  slot: "helm",
  replaces: {
    id: "old",
    baseId: "iron-helm",
    name: "Old",
    rarity: "magic",
    itemLevel: 1,
    tier: 1,
    affixes: [],
  },
  dps: { before: 100, after: 100 },
  changes: [],
  triggerDelta: 0,
  ...over,
});

describe("compareRows", () => {
  it("leads with DPS, then gains above losses, one row per stat", () => {
    const view = compareRows(
      cmp({
        dps: { before: 100, after: 111 },
        changes: [
          { stat: "coldResistance", before: 0.2, after: 0.16 },
          { stat: "armor", before: 10, after: 39 },
          { stat: "attackSpeed", before: 1, after: 1.1 },
        ],
      }),
    );
    expect(view.rows.map((r) => `${r.value} ${r.label}`)).toEqual([
      "+11 % DPS",
      "+29 Armor",
      "−4 % Cold Resistance",
    ]);
    expect(view.rows[0]?.lead).toBe(true);
    expect(view.empty).toBe(false);
  });

  it("keeps the biggest changes and always shows a Trigger Affix won or lost", () => {
    const changes = (["fireResistance", "coldResistance", "lightningResistance"] as const).map(
      (stat, i) => ({ stat, before: 0, after: 0.1 * (i + 1) }),
    );
    const view = compareRows(cmp({ changes, triggerDelta: -1 }), 2);
    expect(view.rows.map((r) => r.label)).toEqual(["Fire Resistance", "Trigger Affix"]);
    expect(view.rows[1]?.up).toBe(false);
  });

  it("calls an empty slot a gain", () => {
    const view = compareRows(
      cmp({ replaces: undefined, changes: [{ stat: "maxLife", before: 0, after: 20 }] }),
    );
    expect(view).toMatchObject({ empty: true, better: true });
    expect(view.rows[0]).toMatchObject({ value: "+20", label: "Life", icon: "life" });
  });
});
