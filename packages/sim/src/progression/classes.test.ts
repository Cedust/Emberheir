import { describe, expect, it } from "vitest";
import { ATTRIBUTE_RULES, attributeFloor } from "./attributes";
import { type HeroClass, classTitle, LINEAGE_STEPS, mainBranch } from "./classes";
import { heroSetup, heroTitle, newGame } from "./game";
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

  it("the main Mastery is the one picked at the first Harvest", () => {
    expect(mainBranch([])).toBeUndefined();
    expect(mainBranch(["a", "b"])).toBe("a");
    expect(mainBranch(["a", "b", "b"])).toBe("a");
  });

  it("the title: class name, then own title or epithet by the main branch", () => {
    expect(classTitle(fighter, [], epithets)).toBe("Fighter");
    expect(classTitle(fighter, ["test-branch"], epithets)).toBe("Champion");
    expect(classTitle(fighter, ["other-branch"], epithets)).toBe("Fighter of Others");
    expect(classTitle(fighter, ["unknown"], epithets)).toBe("Fighter");
    const s = newGame(data, { seed: 1, classId: "test-fighter" });
    const later = {
      ...s,
      legacy: { ...s.legacy, branches: ["test-branch", "other-branch"] },
    };
    expect(heroTitle(later, data)).toBe("Champion");
  });
});

describe("Lineage", () => {
  it("adds +1 per won class's main attribute at creation, part of the floor", () => {
    const s = newGame(data, {
      seed: 1,
      classId: "test-fighter",
      lineage: ["strength", "intelligence", "strength"],
    });
    expect(s.hero.lineage).toEqual({ strength: 1, intelligence: 1 });
    expect(s.hero.attributes.strength).toBe(fighter.startingAttributes.strength + 1);
    expect(s.hero.attributes.intelligence).toBe(fighter.startingAttributes.intelligence + 1);
    expect(s.hero.unspentAttributePoints).toBe(ATTRIBUTE_RULES.creationPoints);
    expect(attributeFloor(fighter.startingAttributes, s.hero.lineage).strength).toBe(
      s.hero.attributes.strength,
    );
    // The inherited point may go past the creation max.
    const room = ATTRIBUTE_RULES.creationMax - fighter.startingAttributes.strength;
    const full = newGame(data, {
      seed: 1,
      classId: "test-fighter",
      lineage: ["strength"],
      attributes: { strength: room },
    });
    expect(full.hero.attributes.strength).toBe(ATTRIBUTE_RULES.creationMax + 1);
    expect(() =>
      newGame(data, {
        seed: 1,
        classId: "test-fighter",
        lineage: ["strength"],
        attributes: { strength: room + 1 },
      }),
    ).toThrow();
  });

  it("all three classes won put Emberheir in front of the title", () => {
    const s = newGame(data, { seed: 1, classId: "test-fighter" });
    expect(heroTitle({ ...s, lineage: ["a", "b"] }, data)).toBe("Fighter");
    expect(LINEAGE_STEPS).toBe(3);
    expect(heroTitle({ ...s, lineage: ["a", "b", "c"] }, data)).toBe("Emberheir Fighter");
  });
});
