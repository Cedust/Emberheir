import { describe, expect, it } from "vitest";
import { type HeroClass, classTitle, lineageEffect, lineageScale, mainBranch } from "./classes";
import { deriveStats } from "../combat/stats";
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
});

describe("Lineage", () => {
  const iron = { name: "Iron", stat: "Life", percent: 5, lifeMultiplier: 1.05 };
  const keen = { name: "Keen", stat: "Crit Chance", percent: 3, bonuses: { critChance: 0.03 } };

  it("opens with the first finale win and doubles by step 5", () => {
    expect(lineageScale(0)).toBe(0);
    expect(lineageScale(1)).toBe(1);
    expect(lineageScale(5)).toBe(2);
    expect(lineageScale(9)).toBe(2);
    expect(lineageEffect(keen, 0)).toEqual({});
    expect(lineageEffect(keen, 1).bonuses?.critChance).toBeCloseTo(0.03);
    expect(lineageEffect(keen, 5).bonuses?.critChance).toBeCloseTo(0.06);
    expect(lineageEffect(iron, 5).rules?.lifeMultiplier).toBeCloseTo(1.1);
  });

  it("the hero gets the bonus of its own class", () => {
    const withLineage = {
      ...data,
      classes: data.classes.map((c, i) => (i === 0 ? { ...c, lineage: iron } : c)),
    };
    const s = newGame(withLineage, { seed: 1, classId: "test-fighter" });
    const life = (lineage: number) =>
      deriveStats(heroSetup({ ...s, lineage }, withLineage).setup).maxLife;
    expect(life(3)).toBeGreaterThan(life(0));
    expect(heroTitle({ ...s, lineage: 4 }, withLineage)).toBe("Fighter");
    expect(heroTitle({ ...s, lineage: 5 }, withLineage)).toBe("Emberheir Fighter");
  });
});
