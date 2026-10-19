import {
  MASTERY_SKILL,
  PROGRESSION,
  applyBuildPlan,
  applyCheat,
  heroSetup,
  newGame,
  planRotation,
} from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { BUILD_PLANS } from "./build-plans";
import { GAME_DATA } from "./game";

describe("build plans", () => {
  it("one per Heirloom path, every goal and skill in the game", () => {
    const paths = Object.entries(GAME_DATA.weaponMastery).flatMap(([weapon, tree]) =>
      [...new Set(tree.nodes.map((n) => n.path).filter(Boolean))].map((p) => `${weapon}-${p}`),
    );
    expect(BUILD_PLANS.map((b) => b.id).sort()).toEqual(paths.sort());
    const nodes = new Set(GAME_DATA.skillTree.nodes.map((n) => n.id));
    for (const plan of BUILD_PLANS) {
      expect(
        plan.nodes.filter((n) => !n.startsWith("@") && !nodes.has(n)),
        plan.id,
      ).toEqual([]);
      // The Heirloom Keystone is one of the weapon's own.
      const keystone = GAME_DATA.weaponMastery[plan.weapon]?.nodes.find(
        (n) => n.id === plan.heirloom.keystone,
      );
      expect(keystone?.group, plan.id).toBe("keystone");
      const cls = GAME_DATA.classes.find((c) => c.id === plan.classId);
      expect(cls?.weapons, plan.id).toContain(plan.weapon);
      expect(cls?.branches, plan.id).toEqual(expect.arrayContaining([...plan.masteries]));
    }
  });

  it("the Cheat Panel's last stage: seven runs, Level 100, the whole plan learned", () => {
    for (const plan of BUILD_PLANS) {
      const start = newGame(GAME_DATA, { seed: 3, classId: plan.classId, weapon: plan.weapon });
      const s = applyCheat(start, GAME_DATA, { kind: "buildPlan", plan });
      expect(s.legacy.prestige, plan.id).toBe(PROGRESSION.finalPrestige);
      expect(s.hero.level).toBe(PROGRESSION.maxLevel);
      expect(s.legacy.branches[0], plan.id).toBe(plan.masteries[0]);
      expect(s.hero.unspentSkillPoints, plan.id).toBe(0);
      const goals = plan.nodes.filter((n) => !n.startsWith("@"));
      expect(
        goals.filter((n) => !(s.hero.learned[n] ?? 0)),
        plan.id,
      ).toEqual([]);
      expect(s.hero.mastery.learned[`${plan.heirloom.path}-master`], plan.id).toBe(1);
      expect(s.hero.mastery.choices.keystone, plan.id).toBe(plan.heirloom.keystone);
      // The main Mastery's Keystone up to its Supreme tier.
      expect(s.hero.learned[`pb-${plan.masteries[0]}-keystone-3`], plan.id).toBe(1);
      // The Battle Plan: the Innate, then two or three skills with the main Mastery's among them
      // (Cinderguard keeps two so the Innate comes round often enough to spend the Fury).
      const rotation = planRotation(s, GAME_DATA, plan);
      expect(s.hero.rotation.slice(1).filter(Boolean), plan.id).toEqual(rotation.slice(0, 3));
      expect(rotation.length, plan.id).toBeGreaterThanOrEqual(2);
      expect(plan.rotation, plan.id).toContain(MASTERY_SKILL);
      expect(s.hero.plan.reactions[0]?.skillId, plan.id).toBe(plan.reaction?.skillId);
      // Epic gear the hero can wear, the class's Off Hand kept.
      expect(
        Object.values(s.hero.equipment).every((i) => i?.rarity === "epic"),
        plan.id,
      ).toBe(true);
      expect(s.hero.equipment.offHand?.baseId).toBe(start.hero.equipment.offHand?.baseId);
      expect(heroSetup(s, GAME_DATA).setup.level).toBe(PROGRESSION.maxLevel);
    }
  }, 30_000);

  it("Ash Tree Keystones wait for the second place, the first goes to the Mastery", () => {
    for (const plan of BUILD_PLANS) {
      const start = newGame(GAME_DATA, { seed: 3, classId: plan.classId, weapon: plan.weapon });
      const mastery = plan.masteries[0] ?? "";
      const s = applyBuildPlan(
        {
          ...start,
          legacy: { ...start.legacy, prestige: 1, branches: [mastery] },
          hero: { ...start.hero, unspentSkillPoints: 60 },
        },
        GAME_DATA,
        plan,
      );
      const keystones = Object.keys(s.hero.learned).filter(
        (id) => GAME_DATA.skillTree.nodes.find((n) => n.id === id)?.kind === "keystone",
      );
      expect(keystones, plan.id).toEqual([`pb-${mastery}-keystone`]);
    }
  });
});
