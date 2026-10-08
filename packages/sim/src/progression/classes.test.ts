import { describe, expect, it } from "vitest";
import { type HeroClass, classTitle, mainBranch } from "./classes";
import { rollItem } from "../items/generate";
import { Rng } from "../rng";
import {
  SAVE_VERSION,
  deserializeGame,
  heroSetup,
  heroTitle,
  newGame,
  serializeGame,
} from "./game";
import { TEST_CLASSES, TEST_GAME_DATA as data } from "./test-fixtures";

const [fighter, caster] = TEST_CLASSES as [HeroClass, HeroClass];
const epithets = data.branchEpithets;

describe("classes", () => {
  it("a new character gets the class, its start weapon, attributes and name", () => {
    const s = newGame(data, { seed: 1, classId: "test-caster", name: "  Mira " });
    expect(s.hero).toMatchObject({ classId: "test-caster", name: "Mira" });
    expect(s.hero.weaponId).toBe("test-wand");
    expect(s.hero.equipment).toEqual({});
    expect(s.hero.attributes).toEqual(caster.startingAttributes);
    expect(newGame(data, { seed: 1, classId: "test-fighter" }).hero.name).toBe("Fighter");
  });

  it("refuses unknown classes and weapons outside the class", () => {
    expect(() => newGame(data, { seed: 1, classId: "nope" })).toThrow();
    expect(() =>
      newGame(data, { seed: 1, classId: "test-fighter", weapon: "test-wand" }),
    ).toThrow();
  });

  it("starts with the class's off hand", () => {
    const withShield = {
      ...data,
      classes: [{ ...fighter, offHand: "test-shield" }],
    };
    const s = newGame(withShield, { seed: 1, classId: "test-fighter" });
    expect(s.hero.equipment.offHand?.baseId).toBe("test-shield");
  });

  it("the Class Trait counts in the fight setup", () => {
    const traited = {
      ...data,
      classes: [
        {
          ...fighter,
          trait: {
            name: "Iron",
            description: "",
            bonuses: { armor: 7 },
            rules: { lifeMultiplier: 1.1 },
          },
        },
      ],
    };
    const s = newGame(traited, { seed: 1, classId: "test-fighter" });
    const { setup } = heroSetup(s, traited);
    expect(setup.bonuses?.armor).toBe(7);
    expect(setup.rules?.lifeMultiplier).toBeCloseTo(1.1);
  });

  it("the main branch has the most tiers; a tie keeps the one that got there first", () => {
    expect(mainBranch([])).toBeUndefined();
    expect(mainBranch(["a", "b"])).toBe("a");
    expect(mainBranch(["a", "b", "b"])).toBe("b");
    expect(mainBranch(["a", "b", "b", "a"])).toBe("b");
  });

  it("the title: class name, then own title or epithet by the main branch", () => {
    expect(classTitle(fighter, [], epithets)).toBe("Fighter");
    expect(classTitle(fighter, ["test-branch"], epithets)).toBe("Champion");
    expect(classTitle(fighter, ["other-branch"], epithets)).toBe("Fighter of Others");
    expect(classTitle(fighter, ["unknown"], epithets)).toBe("Fighter");
    const s = newGame(data, { seed: 1, classId: "test-fighter" });
    const later = {
      ...s,
      legacy: { ...s.legacy, branches: ["other-branch", "test-branch", "test-branch"] },
    };
    expect(heroTitle(later, data)).toBe("Champion");
  });

  it("older saves get the class of the weapon in hand", () => {
    const s = newGame(data, { seed: 1, classId: "test-caster" });
    const old = JSON.parse(serializeGame(s)) as { version: number; hero: Record<string, unknown> };
    old.version = 8;
    delete old.hero.classId;
    delete old.hero.name;
    delete old.hero.weaponId;
    delete old.hero.mastery;
    const wand = rollItem(
      data.items,
      { baseId: "test-wand", itemLevel: 1, rarity: "normal" },
      new Rng(1),
    );
    old.hero.equipment = { mainHand: wand };
    const loaded = deserializeGame(JSON.stringify(old), data);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.hero).toMatchObject({
      classId: "test-caster",
      name: "Caster",
      weaponId: "test-wand",
    });
  });
});
