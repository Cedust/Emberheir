import { describe, expect, it } from "vitest";
import { TEST_SKILL, TEST_WEAPON } from "../combat/test-fixtures";
import { levelCap } from "./leveling";
import {
  type GameAction,
  type GameState,
  applyAction,
  heroSetup,
  heroWeapon,
  heroWeaponName,
  masteryPointsLeft,
  newGame,
} from "./game";
import { TEST_ECHO, TEST_GAME_DATA as data, TEST_MASTERY as tree } from "./test-fixtures";
import {
  EMPTY_MASTERY,
  MASTERY,
  type MasteryState,
  attuneSkill,
  buildMasteryWeapon,
  learnMastery,
  masteryBlockReason,
  mergeWeaponRules,
  pointsSpent,
  rankGrowth,
  weaponGrade,
  weaponRank,
} from "./weapon-mastery";

const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);
const learn = (state: MasteryState, rank: number, ...ids: string[]) =>
  ids.reduce((s, id) => learnMastery(tree, s, id, rank), state);
const build = (state: MasteryState, rank = 0) =>
  buildMasteryWeapon(TEST_WEAPON, tree, state, rank, TEST_SKILL);

describe("Weapon Rank", () => {
  it("follows the level: the run's Level Cap gives Rank 4/7/10/13/16/18/20", () => {
    const caps = Array.from({ length: 7 }, (_, p) => weaponRank(levelCap(p)));
    expect(caps).toEqual([4, 7, 10, 13, 16, 18, 20]);
    expect(weaponRank(1)).toBe(0);
  });

  it("names the grade and raises Weapon Damage", () => {
    expect([0, 4, 8, 12, 16, 20].map(weaponGrade)).toEqual([
      "Crude",
      "Honed",
      "Tempered",
      "Ascendant",
      "Exalted",
      "Exalted",
    ]);
    expect(rankGrowth(0)).toBe(1);
    expect(rankGrowth(20)).toBeGreaterThan(rankGrowth(10));
  });
});

describe("Weapon Mastery tree", () => {
  it("starts raw: wide Damage Range, low Precision, Steady Heat", () => {
    const w = build(EMPTY_MASTERY);
    expect(w.precision).toBeCloseTo(0.7);
    expect(w.weapon.damage.min).toBeCloseTo(10 * MASTERY.damageFactor * 0.4);
    expect(w.weapon.damage.max).toBeCloseTo(10 * MASTERY.damageFactor * 1.1);
    expect(w.weapon.heatBehavior).toBe("steady");
    expect(w.innate?.id).toBe(TEST_SKILL.id);
  });

  it("costs one point per Rank; paths need a point in Refine first", () => {
    expect(masteryBlockReason(tree, EMPTY_MASTERY, "refine", 0)).toBe("noPoints");
    expect(masteryBlockReason(tree, EMPTY_MASTERY, "p1", 3)).toBe("notConnected");
    const s = learn(EMPTY_MASTERY, 3, "refine", "p1", "p2");
    expect(pointsSpent(tree, s)).toBe(3);
    expect(masteryBlockReason(tree, s, "refine", 3)).toBe("noPoints");
    const w = build(s, 3);
    expect(w.precision).toBeCloseTo(0.75);
    expect(w.bonuses.life).toBe(10);
    expect(w.weaponRules.glancingDamage).toBe(0.25);
  });

  it("Heat Forms open at Rank 3, Innate Forms at Rank 5; switching is free", () => {
    expect(masteryBlockReason(tree, EMPTY_MASTERY, "cooling", 2)).toBe("rankLocked");
    expect(masteryBlockReason(tree, EMPTY_MASTERY, "steady", 3)).toBe("chosen");
    const cooling = learn(EMPTY_MASTERY, 3, "cooling");
    expect(pointsSpent(tree, cooling)).toBe(1);
    expect(build(cooling, 3).weapon.heatBehavior).toBe("cooling");
    // Back to Steady costs nothing and gives the point back.
    const back = learn(cooling, 3, "steady");
    expect(pointsSpent(tree, back)).toBe(0);
    expect(masteryBlockReason(tree, EMPTY_MASTERY, "form", 4)).toBe("rankLocked");
    expect(build(learn(EMPTY_MASTERY, 5, "form"), 5).innate?.id).toBe("form-skill");
  });

  it("the Keystone ring opens after 12 points; only one Keystone at a time", () => {
    const rank = 20;
    let s = learn(EMPTY_MASTERY, rank, "refine", "refine", "refine", "swing", "swing", "swing");
    s = learn(s, rank, "p1", "p2", "cooling", "form");
    expect(pointsSpent(tree, s)).toBe(10);
    expect(masteryBlockReason(tree, s, "ks1", rank)).toBe("keystoneLocked");
    s = learn(s, rank, "grip", "grip", "ks1");
    expect(pointsSpent(tree, s)).toBe(13);
    // Switching to the other Keystone is free; the first stays the only one.
    s = learn(s, rank, "ks2");
    expect(pointsSpent(tree, s)).toBe(13);
    expect(s.choices.keystone).toBe("ks2");
  });

  it("Focused Will style Keystones remove Glancing Blows", () => {
    const s: MasteryState = { ...EMPTY_MASTERY, choices: { keystone: "ks1" } };
    expect(build(s).precision).toBe(1);
    expect(build(s).weaponRules).not.toHaveProperty("noGlancing");
  });

  it("merges rules: numbers add, multipliers multiply, lists join", () => {
    const merged = mergeWeaponRules(
      { glancingHeat: 2, damageDealt: 1.2, critAfter: ["evade"] },
      { glancingHeat: 3, damageDealt: 1.5, critAfter: ["block"], noGlancing: true },
    );
    expect(merged.glancingHeat).toBe(5);
    expect(merged.damageDealt).toBeCloseTo(1.8);
    expect(merged.critAfter).toEqual(["evade", "block"]);
    expect(merged.noGlancing).toBe(true);
  });

  it("Attunement turns a Fire Innate into another element", () => {
    const firebolt = {
      ...TEST_SKILL,
      id: "firebolt",
      name: "Firebolt",
      description: "Hurls Fire.",
      tags: ["fire" as const],
      hits: [
        {
          kind: "spell" as const,
          damageType: "fire" as const,
          damage: { min: 10, max: 10 },
          ailmentChances: [{ ailment: "burn" as const, chance: 0.5 }],
        },
      ],
    };
    const frost = attuneSkill(firebolt, { damageType: "cold", ailment: "chill" });
    expect(frost).toMatchObject({ id: "firebolt@cold", name: "Frostbolt", tags: ["cold"] });
    expect(frost.hits[0]).toMatchObject({
      damageType: "cold",
      ailmentChances: [{ ailment: "chill", chance: 0.5 }],
    });
  });
});

describe("Weapon Mastery in the game", () => {
  const camp = (level: number, gold = 0): GameState => {
    const s = newGame(data, { seed: 1, classId: "test-fighter" });
    return { ...s, hero: { ...s.hero, level }, wallet: { ...s.wallet, gold } };
  };

  it("learning spends Rank points; the fight setup carries the weapon", () => {
    let s = camp(3);
    expect(masteryPointsLeft(s, data)).toBe(2);
    s = act(s, { type: "learnMastery", nodeId: "refine" }, { type: "learnMastery", nodeId: "p1" });
    expect(masteryPointsLeft(s, data)).toBe(0);
    expect(() => act(s, { type: "learnMastery", nodeId: "refine" })).toThrow(/noPoints/);
    const { setup } = heroSetup(s, data);
    expect(setup.weapon.precision).toBeCloseTo(0.75);
    expect(heroWeaponName(s, data)).toBe("Crude Test Blade");
  });

  it("Respec costs Gold and keeps the Echo", () => {
    let s = camp(3, MASTERY.respecGold);
    s = act(s, { type: "learnMastery", nodeId: "refine" });
    s = { ...s, hero: { ...s.hero, mastery: { ...s.hero.mastery, echo: "test-echo" } } };
    s = act(s, { type: "respecMastery" });
    expect(s.hero.mastery).toEqual({ ...EMPTY_MASTERY, echo: "test-echo" });
    expect(s.wallet.gold).toBe(0);
    expect(() => act(s, { type: "respecMastery" })).toThrow();
  });

  it("the act boss leaves its Echo once per run; it is worn and named", () => {
    let s = act(camp(1), { type: "setOut", actId: "test-act" });
    for (let i = 0; i < 3; i++) {
      s = act(s, { type: "startStage" }, { type: "resolveFight" });
      if (i === 2) break;
      s = act(s, { type: "salvageAll" });
      if (s.run?.rewards?.spoils.length) s = act(s, { type: "pickSpoils", index: 0 });
      s = act(s, { type: "continue" });
    }
    expect(s.run?.rewards?.echo).toEqual({ id: "test-echo", stage: 1 });
    expect(s.legacy.echoes["test-echo"]).toEqual({ stage: 1, prestige: 0 });
    expect(s.hero.mastery.echo).toBe("test-echo");
    expect(heroWeaponName(s, data)).toBe("Crude Test Blade of Test Echo");
    expect(heroWeapon(s, data).bonuses.life).toBe(TEST_ECHO.effect(1, 0).bonuses?.life);
  });

  it("only earned Echoes can be worn", () => {
    const s = camp(1);
    expect(() => act(s, { type: "setEcho", echoId: "test-echo" })).toThrow(/earned/);
    const earned = {
      ...s,
      legacy: { ...s.legacy, echoes: { "test-echo": { stage: 2, prestige: 0 } } },
    };
    expect(act(earned, { type: "setEcho", echoId: "test-echo" }).hero.mastery.echo).toBe(
      "test-echo",
    );
    expect(act(earned, { type: "setEcho", echoId: null }).hero.mastery.echo).toBeNull();
  });
});
