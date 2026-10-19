import {
  MASTERY_SKILL,
  PROGRESSION,
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
      // The Battle Plan: the Innate, then three skills with the main Mastery's among them.
      const rotation = planRotation(s, GAME_DATA, plan);
      expect(s.hero.rotation.slice(1).filter(Boolean), plan.id).toEqual(rotation.slice(0, 3));
      expect(rotation.length, plan.id).toBeGreaterThanOrEqual(3);
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
});
