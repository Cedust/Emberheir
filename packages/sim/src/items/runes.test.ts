import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import { describeItem } from "./describe";
import { itemModifiers } from "./equipment";
import { createItemCatalog, rollItem, rollSockets, rollUnique, uniquesFor } from "./generate";
import { activeRuneword, freeSockets, matchRuneword, runeBonuses } from "./runes";
import {
  TEST_AFFIXES,
  TEST_AXE,
  TEST_CATALOG,
  TEST_CONDITIONS,
  TEST_EFFECTS,
  TEST_RING,
  TEST_RUNES,
} from "./test-fixtures";
import type { Item } from "./types";

const axe = (runes: string[], sockets = 2, rarity: Item["rarity"] = "normal"): Item => ({
  id: "axe-1",
  baseId: "test-axe",
  name: "Test Axe",
  rarity,
  itemLevel: 5,
  tier: 1,
  affixes: [],
  sockets,
  runes,
});

describe("Runes and Runewords", () => {
  it("counts free Sockets", () => {
    expect(freeSockets(axe([]))).toBe(2);
    expect(freeSockets(axe(["ash"]))).toBe(1);
    expect(freeSockets({ ...axe([]), sockets: 0 })).toBe(0);
  });

  it("each socketed Rune gives its weapon or armor bonus", () => {
    expect(runeBonuses(axe(["ash", "ash"]), TEST_CATALOG)).toMatchObject({
      physicalDamage: 0.2,
      armor: 0,
    });
    const shield: Item = { ...axe(["ash"]), baseId: "test-shield" };
    expect(runeBonuses(shield, TEST_CATALOG)).toMatchObject({ armor: 5, physicalDamage: 0 });
  });

  it("a Runeword needs the exact Runes in order, all Sockets filled, a fitting base", () => {
    expect(matchRuneword(TEST_CATALOG, "mainHand", 2, ["ash", "thorn"])?.id).toBe("splinter");
    expect(matchRuneword(TEST_CATALOG, "mainHand", 2, ["thorn", "ash"])).toBeUndefined();
    expect(matchRuneword(TEST_CATALOG, "mainHand", 3, ["ash", "thorn"])).toBeUndefined();
    expect(matchRuneword(TEST_CATALOG, "offHand", 2, ["ash", "thorn"])).toBeUndefined();
    expect(activeRuneword(axe(["ash", "thorn"]), TEST_CATALOG)?.id).toBe("splinter");
    // Only Normal items carry Runewords.
    expect(activeRuneword(axe(["ash", "thorn"], 2, "magic"), TEST_CATALOG)).toBeUndefined();
  });

  it("a Runeword adds its bonuses, attributes, triggers and rules on top of the Runes", () => {
    const mods = itemModifiers(axe(["ash", "thorn"]), TEST_CATALOG);
    expect(mods.bonuses).toMatchObject({ physicalDamage: 0.1, bleedChance: 0.1, attackSpeed: 0.2 });
    expect(mods.attributes.strength).toBe(3);
    expect(mods.triggers.map((t) => t.id)).toEqual(["searing-crit"]);
    expect(mods.rules?.critsApplyBleed).toBe(true);
    const tip = describeItem(axe(["ash", "thorn"]), TEST_CATALOG);
    expect(tip.special).toBe("runeword");
    expect(tip.rarityName).toBe("Runeword");
    expect(tip.runewordRecipe).toBe("Ash · Thorn");
    expect(tip.sockets).toEqual({ total: 2, runes: ["Ash", "Thorn"] });
  });

  it("dropped Normal items of a socketable base sometimes have Sockets, never more than max", () => {
    const counts = new Set<number>();
    for (let seed = 1; seed <= 100; seed++) counts.add(rollSockets(TEST_AXE, new Rng(seed)));
    expect([...counts].sort()).toEqual([0, 1, 2]);
    expect(rollSockets(TEST_RING, new Rng(1))).toBe(0);
    const magic = rollItem(
      TEST_CATALOG,
      { baseId: "test-axe", itemLevel: 5, rarity: "magic" },
      new Rng(3),
    );
    expect(magic.sockets).toBeUndefined();
  });

  it("checks Runeword references", () => {
    expect(() =>
      createItemCatalog({
        bases: [TEST_AXE],
        affixes: TEST_AFFIXES,
        rareNames: { first: [], second: [] },
        runes: TEST_RUNES,
        runewords: [{ id: "x", name: "X", runes: ["nope"], slots: ["mainHand"], bonuses: {} }],
        conditions: TEST_CONDITIONS,
        effects: TEST_EFFECTS,
      }),
    ).toThrow(/unknown rune/);
  });
});

describe("Legendary items and Uniques", () => {
  it("a Legendary rolls a Legendary Power for its slot", () => {
    const item = rollItem(
      TEST_CATALOG,
      { baseId: "test-ring", itemLevel: 5, rarity: "legendary" },
      new Rng(2),
    );
    expect(item.powerId).toBe("echo");
    const mods = itemModifiers(item, TEST_CATALOG);
    expect(mods.rules?.ailmentEcho).toEqual([{ from: "bleed", to: "poison" }]);
    expect(describeItem(item, TEST_CATALOG).power).toEqual({
      name: "Echo",
      text: "Your Bleed also Poisons.",
    });
  });

  it("a Unique has its fixed name, affixes inside their ranges and its power", () => {
    const item = rollUnique(TEST_CATALOG, "band", 5, new Rng(1));
    expect(item.name).toBe("The Test Band");
    expect(item.uniqueId).toBe("band");
    expect(item.powerId).toBe("echo");
    expect(item.affixes[0]).toEqual({ affixId: "life", quality: 0.5 });
    expect(item.affixes[1]?.quality).toBeGreaterThanOrEqual(0.8);
    const tip = describeItem(item, TEST_CATALOG);
    expect(tip.special).toBe("unique");
    expect(tip.flavor).toBe("Round.");
    expect(uniquesFor(TEST_CATALOG, 5, ["test-sword"])).toEqual([]);
    expect(uniquesFor(TEST_CATALOG, 5, ["test-ring"]).map((u) => u.id)).toEqual(["band"]);
  });
});
