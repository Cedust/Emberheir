import { describe, expect, it } from "vitest";
import { type ItemBaseDefinition } from "../items/types";
import { Rng } from "../rng";
import { PROGRESSION } from "./constants";
import { gambleItem } from "./crafting";
import { heroCanWear, rollItemChoices, smartBases } from "./game/loot";
import { newGame } from "./game/new-game";
import { type GameData, type GameState } from "./game/state";
import { TEST_GAME_DATA } from "./test-fixtures";

/** A second off hand anyone with a melee weapon can wear, next to the Test Shield (STR 8). */
const BUCKLER: ItemBaseDefinition = {
  id: "test-buckler",
  name: "Test Buckler",
  slot: "offHand",
  fitsWeaponRange: "melee",
  baseStats: { armor: 4 },
};

const data: GameData = {
  ...TEST_GAME_DATA,
  items: {
    ...TEST_GAME_DATA.items,
    bases: new Map([...TEST_GAME_DATA.items.bases, [BUCKLER.id, BUCKLER]]),
  },
  lootBases: ["test-shield", "test-buckler"],
};

const withStrength = (state: GameState, strength: number): GameState => ({
  ...state,
  hero: { ...state.hero, attributes: { ...state.hero.attributes, strength } },
});

describe("Smart Base", () => {
  const fighter = newGame(data, { seed: 1, classId: "test-fighter" });
  const caster = newGame(data, { seed: 1, classId: "test-caster" });

  it("knows which bases the hero can wear: own attributes and the weapon", () => {
    const wear = heroCanWear(fighter, data);
    expect(wear("test-buckler")).toBe(true);
    expect(wear("test-shield")).toBe(false); // STR 6 < 8
    expect(heroCanWear(withStrength(fighter, 8), data)("test-shield")).toBe(true);
    // A wand never holds a melee off hand, whatever the Strength.
    expect(heroCanWear(withStrength(caster, 8), data)("test-buckler")).toBe(false);
  });

  it("leaves the bases alone when all or none fit", () => {
    const bases = ["a", "b"];
    expect(smartBases(bases, () => true, new Rng(1))).toBe(bases);
    expect(smartBases(bases, () => false, new Rng(1))).toBe(bases);
    expect(smartBases(bases, undefined, new Rng(1))).toBe(bases);
  });

  it("mostly rolls a base the hero can wear, but not always", () => {
    const wear = heroCanWear(fighter, data);
    let worn = 0;
    const picks = 400;
    for (let seed = 1; seed <= picks; seed++) {
      const [card] = rollItemChoices(
        data,
        "test-act",
        { enemyId: "weakling", level: 10, boss: false, eliteModifiers: [], seed: 0 },
        "normal",
        0,
        0,
        new Rng(seed),
        undefined,
        1,
        undefined,
        {},
        wear,
      );
      if (card && wear(card.baseId)) worn++;
    }
    // 75 % sure + half of the random rest.
    const expected = PROGRESSION.smartBaseShare + (1 - PROGRESSION.smartBaseShare) / 2;
    expect(worn / picks).toBeGreaterThan(expected - 0.07);
    expect(worn / picks).toBeLessThan(0.97);
  });

  it("Marisha's gamble leans the same way", () => {
    let worn = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const item = gambleItem(fighter, data, "offHand", new Rng(seed), 10);
      if (item.baseId === "test-buckler") worn++;
    }
    expect(worn / 200).toBeGreaterThan(0.75);
  });
});
