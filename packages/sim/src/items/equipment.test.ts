import { describe, expect, it } from "vitest";
import { ZERO_ATTRIBUTES } from "../combat/test-fixtures";
import {
  itemModifiers,
  itemWeapon,
  missingRequirements,
  offHandFits,
  requirementsFor,
  resolveEquipment,
  scaledBaseStats,
} from "./equipment";
import { TEST_AXE, TEST_CATALOG, TEST_SHIELD, TEST_SWORD, TEST_WAND } from "./test-fixtures";
import type { Item } from "./types";

const STRONG = { ...ZERO_ATTRIBUTES, strength: 20 };

const item = (baseId: string, affixes: Item["affixes"] = [], tier = 1): Item => ({
  id: baseId,
  baseId,
  name: baseId,
  rarity: affixes.length ? "rare" : "normal",
  itemLevel: tier * 10,
  tier,
  affixes,
});

describe("equipment stats", () => {
  it("requirements grow with the tier and are checked against the hero's own attributes", () => {
    expect(requirementsFor(TEST_SHIELD, 1)).toEqual({ strength: 8 });
    expect(requirementsFor(TEST_SHIELD, 3)).toEqual({ strength: 24 });
    const shield = item("test-shield");
    expect(missingRequirements(shield, TEST_CATALOG, ZERO_ATTRIBUTES)).toEqual(["strength"]);
    expect(missingRequirements(shield, TEST_CATALOG, STRONG)).toEqual([]);
  });

  it("flat base values scale with the tier, percentages do not", () => {
    expect(scaledBaseStats(TEST_SHIELD, 2)).toEqual({ armor: 20, blockChance: 0.2, blockValue: 6 });
  });

  it("weapon damage scales with the tier and gets local Added Weapon Damage", () => {
    const sword = item("test-sword", [{ affixId: "added", quality: 1 }], 2);
    // TEST_WEAPON 10–10 × 2 (T2) + added 6 × 2 = 12 → +6–12.
    expect(itemWeapon(sword, TEST_CATALOG)?.damage).toEqual({ min: 26, max: 32 });
    // Spells grow with the tier like weapon damage.
    expect(itemWeapon(sword, TEST_CATALOG)?.spellPower).toBe(2);
    expect(itemWeapon(item("test-shield"), TEST_CATALOG)).toBeUndefined();
  });

  it("collects attributes, stats, implicits and triggers", () => {
    const ring = item("test-ring", [
      { affixId: "strength", quality: 1 },
      { affixId: "crit", quality: 0 },
      { affixId: "second-wind", quality: 0 },
    ]);
    const mods = itemModifiers(ring, TEST_CATALOG);
    expect(mods.attributes).toEqual({ strength: 5 });
    expect(mods.bonuses.critChance).toBeCloseTo(0.03);
    expect(mods.triggers.map((t) => t.name)).toEqual(["Second Wind"]);
  });

  it("sums all active items; unmet requirements and wrong off hands give nothing", () => {
    const equipment = {
      offHand: item("test-shield"),
      ring1: item("test-ring", [{ affixId: "life", quality: 1 }]),
      ring2: item("test-ring", [{ affixId: "life", quality: 0 }]),
    };
    const sword = TEST_SWORD.weapon;
    const strong = resolveEquipment(equipment, TEST_CATALOG, STRONG, sword);
    expect(strong.bonuses.life).toBe(30);
    expect(strong.bonuses.armor).toBe(10);
    expect(strong.bonuses.critChance).toBeCloseTo(0.02);
    expect(strong.inactive).toEqual([]);

    const weak = resolveEquipment(equipment, TEST_CATALOG, ZERO_ATTRIBUTES, sword);
    expect(weak.inactive.map((i) => [i.slot, i.reason.kind])).toEqual([
      ["offHand", "requirements"],
    ]);

    const wand = resolveEquipment(
      { offHand: item("test-shield") },
      TEST_CATALOG,
      STRONG,
      TEST_WAND.weapon,
    );
    expect(wand.inactive.map((i) => i.reason.kind)).toEqual(["offHandMismatch"]);

    const wrong = resolveEquipment({ amulet: item("test-ring") }, TEST_CATALOG, STRONG);
    expect(wrong.inactive.map((i) => i.reason.kind)).toEqual(["wrongSlot"]);
  });
});

describe("offHandFits", () => {
  it("checks the weapon type when the off hand names some, else the range", () => {
    const quiver = { ...TEST_SHIELD, fitsWeapons: ["test-axe"] };
    expect(offHandFits(quiver, TEST_AXE.weapon)).toBe(true);
    expect(offHandFits(quiver, TEST_WAND.weapon)).toBe(false);
    expect(offHandFits(quiver, undefined)).toBe(false);
    expect(offHandFits(TEST_SHIELD, TEST_AXE.weapon)).toBe(true);
    expect(offHandFits(TEST_SHIELD, TEST_WAND.weapon)).toBe(false);
  });
});
