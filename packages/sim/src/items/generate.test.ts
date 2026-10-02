import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import { ITEMS } from "./constants";
import { affixPosition, createItemCatalog, pickWeighted, rollItem, rollRarity } from "./generate";
import { TEST_CATALOG, TEST_RING, TEST_SWORD } from "./test-fixtures";
import { type AffixDefinition, RARITIES, type Rarity } from "./types";

const roll = (rarity: Rarity, seed: number, baseId = "test-ring", itemLevel = 5) =>
  rollItem(TEST_CATALOG, { baseId, itemLevel, rarity }, new Rng(seed));

describe("rollItem", () => {
  it("is deterministic per seed", () => {
    expect(roll("rare", 4)).toEqual(roll("rare", 4));
    expect(roll("rare", 4)).not.toEqual(roll("rare", 5));
  });

  it("rolls the affix counts of each rarity, never the same affix twice", () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const rarity of ["normal", "magic", "rare", "epic"] as const) {
        const item = roll(rarity, seed);
        const counts = ITEMS.affixCounts[rarity];
        const kinds = item.affixes.map((a) => TEST_CATALOG.affixes.get(a.affixId)?.kind);
        const stats = kinds.filter((k) => k === "stat").length;
        const triggers = kinds.filter((k) => k === "trigger").length;
        expect(stats).toBeGreaterThanOrEqual(Math.min(counts.stat[0], 3));
        expect(stats).toBeLessThanOrEqual(counts.stat[1]);
        expect(triggers).toBeGreaterThanOrEqual(counts.trigger[0]);
        expect(triggers).toBeLessThanOrEqual(counts.trigger[1] + 1);
        expect(new Set(item.affixes.map((a) => a.affixId)).size).toBe(item.affixes.length);
      }
    }
  });

  it("Normal items have no affixes, Epic items always have a trigger", () => {
    expect(roll("normal", 1).affixes).toEqual([]);
    expect(roll("normal", 1).name).toBe("Test Ring");
    for (let seed = 1; seed <= 50; seed++) {
      const kinds = roll("epic", seed).affixes.map(
        (a) => TEST_CATALOG.affixes.get(a.affixId)?.kind,
      );
      expect(kinds).toContain("trigger");
    }
  });

  it("only rolls affixes of the base's slot and respects zero weights", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const ids = roll("epic", seed, "test-sword").affixes.map((a) => a.affixId);
      expect(ids).not.toContain("life");
      expect(ids).not.toContain("elemental");
    }
  });

  it("sets Item Level, Tier and names by rarity", () => {
    const item = rollItem(
      TEST_CATALOG,
      { baseId: "test-ring", itemLevel: 23, rarity: "rare" },
      new Rng(1),
    );
    expect(item.itemLevel).toBe(23);
    expect(item.tier).toBe(3);
    expect(item.name).toBe("Ash Bite");
    expect(roll("magic", 2).name).toMatch(/^(Arcane )?Test Ring/);
  });

  it("names Magic items D2 style: one prefix and one suffix at most", () => {
    const names = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const item = roll("magic", seed);
      const positions = item.affixes.map((a) => {
        const affix = TEST_CATALOG.affixes.get(a.affixId);
        if (!affix) throw new Error("unknown affix");
        return affixPosition(affix);
      });
      expect(new Set(positions).size).toBe(positions.length);
      expect(item.name).toMatch(/^(Arcane )?Test Ring( of .+)?$/);
      names.add(item.name.startsWith("Arcane ") && item.name.includes(" of ") ? "both" : "one");
    }
    expect(names).toEqual(new Set(["both", "one"]));
  });

  it("rejects stat affixes without exactly one name part", () => {
    const [strength] = TEST_CATALOG.affixes.values();
    if (strength?.kind !== "stat") throw new Error("fixture changed");
    const make = (affix: AffixDefinition) =>
      createItemCatalog({ bases: [], affixes: [affix], rareNames: TEST_CATALOG.rareNames });
    expect(() => make({ ...strength, prefix: "Mighty" })).toThrow("either a prefix or a suffix");
    const bare = Object.fromEntries(
      Object.entries(strength).filter(([key]) => key !== "suffix"),
    ) as AffixDefinition;
    expect(() => make(bare)).toThrow("either a prefix or a suffix");
  });

  it("rejects unknown bases and duplicate ids", () => {
    expect(() => roll("rare", 1, "nope")).toThrow("Unknown item base");
    expect(() =>
      createItemCatalog({
        bases: [TEST_RING, TEST_RING],
        affixes: [],
        rareNames: TEST_CATALOG.rareNames,
      }),
    ).toThrow("Duplicate");
    expect(TEST_SWORD.slot).toBe("mainHand");
  });
});

describe("weighted picks", () => {
  it("follows the weights", () => {
    const rng = new Rng(1);
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 4000; i++)
      counts[pickWeighted(["a", "b"] as const, (x) => (x === "a" ? 3 : 1), rng) ?? "a"]++;
    expect(counts.a / counts.b).toBeGreaterThan(2.5);
    expect(counts.a / counts.b).toBeLessThan(3.5);
    expect(pickWeighted([1, 2], () => 0, rng)).toBeUndefined();
  });

  it("rolls rarities by weight; Legendary has weight 0 in the PoC", () => {
    const rng = new Rng(2);
    const seen = new Set(Array.from({ length: 500 }, () => rollRarity(rng)));
    expect([...seen].sort()).toEqual(RARITIES.filter((r) => r !== "legendary").sort());
  });
});

describe("Act loot", () => {
  it("an affix factor makes favored affixes roll far more often", () => {
    const count = (favored?: Record<string, number>) => {
      let hits = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const options = { baseId: "test-ring", itemLevel: 5, rarity: "magic" as const };
        const item = rollItem(
          TEST_CATALOG,
          favored
            ? { ...options, affixFactor: (a: { id: string }) => favored[a.id] ?? 1 }
            : options,
          new Rng(seed),
        );
        if (item.affixes.some((a) => a.affixId === "crit")) hits++;
      }
      return hits;
    };
    expect(count({ crit: 20 })).toBeGreaterThan(count() * 2);
  });
});
