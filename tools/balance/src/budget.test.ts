import { BUILD_PLANS, GAME_DATA } from "@emberheir/content";
import { heroSetup } from "@emberheir/sim";
import { describe, expect, it } from "vitest";
import { LAYERS, dummyFight, endgameHero, withoutLayer } from "./budget";

describe("damage budget", () => {
  const plan = BUILD_PLANS.find((b) => b.id === "mace-forge");
  if (!plan) throw new Error("mace-forge missing");
  const state = endgameHero(GAME_DATA, plan, 1);

  it("damage shares add up to the whole", () => {
    const { dps, shares } = dummyFight(heroSetup(state, GAME_DATA).setup);
    expect(dps).toBeGreaterThan(1);
    const { weapon, ...parts } = shares;
    const sum = Object.values(parts).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 6);
    // The weapon's share holds its hits and the ailment damage they caused (ticks or bursts).
    expect(weapon).toBeGreaterThanOrEqual(shares.defaultAttack + shares.innate - 1e-9);
    expect(weapon).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("each layer comes off on its own, skills and the path's damage type stay", () => {
    const tree = GAME_DATA.skillTree;
    const kind = (id: string) => tree.nodes.find((n) => n.id === id);
    const skills = (s: typeof state) =>
      Object.keys(s.hero.learned).filter((id) => kind(id)?.kind === "skill");
    const type = heroSetup(state, GAME_DATA).setup.weapon.damageType;
    for (const layer of LAYERS) {
      const s = withoutLayer(state, GAME_DATA, plan, layer);
      expect(skills(s).sort(), layer).toEqual(skills(state).sort());
      expect(heroSetup(s, GAME_DATA).setup.weapon.damageType, layer).toBe(type);
    }
    expect(withoutLayer(state, GAME_DATA, plan, "gear").hero.equipment).toEqual({});
    const noKeystones = withoutLayer(state, GAME_DATA, plan, "keystones");
    expect(Object.keys(noKeystones.hero.learned).some((id) => kind(id)?.kind === "keystone")).toBe(
      false,
    );
    expect(noKeystones.hero.mastery.choices.keystone).toBeUndefined();
    const noTree = withoutLayer(state, GAME_DATA, plan, "ashTree");
    expect(
      Object.keys(noTree.hero.learned).every(
        (id) => kind(id)?.kind === "skill" || kind(id)?.prestigeBranch,
      ),
    ).toBe(true);
    const noPath = withoutLayer(state, GAME_DATA, plan, "heirloom").hero.mastery;
    expect(noPath.learned["forge-t1"]).toBe(1);
    expect(noPath.learned["forge-master"]).toBeUndefined();
  });
});
