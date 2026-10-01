import { describe, expect, it } from "vitest";
import { createEnemySetup, deriveStats, runFight } from "@emberheir/sim";
import { ACT1_ENEMIES } from "./enemies";
import { createHeroSetup } from "./heroes";
import { FLURRY, HERO_SKILLS, POWER_STRIKE, START_SKILLS } from "./skills";
import { HERO_WEAPONS, SWORD } from "./weapons";

describe("combat content", () => {
  it("has unique ids", () => {
    for (const list of [HERO_SKILLS, HERO_WEAPONS, ACT1_ENEMIES]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("skills cost 20-100 Heat and deal damage", () => {
    for (const skill of HERO_SKILLS) {
      expect(skill.heatCost, skill.id).toBeGreaterThanOrEqual(20);
      expect(skill.heatCost, skill.id).toBeLessThanOrEqual(100);
      expect(skill.hits.length, skill.id).toBeGreaterThan(0);
    }
  });

  it("every hero weapon brings a Start Skill", () => {
    for (const weapon of HERO_WEAPONS) {
      expect(START_SKILLS[weapon.id], weapon.id).toBeDefined();
      expect(createHeroSetup({ weapon }).rotation).toHaveLength(1);
    }
  });

  it("PoC weapons cover Cooling and Warming", () => {
    expect(HERO_WEAPONS.map((w) => w.heatBehavior).sort()).toEqual(["cooling", "warming"]);
  });

  it("hero setup takes skills and Trigger Thresholds per slot", () => {
    const hero = createHeroSetup({
      weapon: SWORD,
      skills: [POWER_STRIKE, FLURRY],
      thresholds: [60],
    });
    expect(hero.rotation).toEqual([{ skill: POWER_STRIKE, threshold: 60 }, { skill: FLURRY }]);
    expect(deriveStats(hero).maxLife).toBeGreaterThan(0);
  });

  it("a level 1 Heir can beat every Act 1 enemy with the Start Skill", () => {
    for (const weapon of HERO_WEAPONS) {
      for (const enemy of ACT1_ENEMIES) {
        let wins = 0;
        for (let seed = 1; seed <= 20; seed++) {
          const result = runFight(createHeroSetup({ weapon }), createEnemySetup(enemy, 1), seed);
          if (result.winner === "hero") wins++;
        }
        expect(wins, `${weapon.id} vs ${enemy.id}`).toBeGreaterThanOrEqual(18);
      }
    }
  });
});
