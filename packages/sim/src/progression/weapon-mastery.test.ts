import { describe, expect, it } from "vitest";
import { TEST_SKILL, TEST_WEAPON } from "../combat/test-fixtures";
import { bossLevel, levelCap } from "./leveling";
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
  infuseSkill,
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
  it("follows the level: each run's boss level gives Rank 4/7/10/13/16/18/20, its cap no more", () => {
    const atBoss = Array.from({ length: 7 }, (_, p) => weaponRank(bossLevel(p)));
    expect(atBoss).toEqual([4, 7, 10, 13, 16, 18, 20]);
    const atCap = Array.from({ length: 7 }, (_, p) => weaponRank(levelCap(p), p));
    expect(atCap).toEqual([4, 7, 10, 13, 16, 18, 20]);
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
    expect(w.weaponRules.critBuildup).toBe(0.06);
  });

  it("a path root without links is open from the start", () => {
    const open = {
      ...tree,
      nodes: tree.nodes.map((n) => (n.id === "p1" ? { ...n, requiresRefine: false } : n)),
    };
    expect(masteryBlockReason(open, EMPTY_MASTERY, "p1", 1)).toBeUndefined();
    expect(masteryBlockReason(open, EMPTY_MASTERY, "p2", 1)).toBe("notConnected");
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

  it("forks: one side of a fork shuts the other; the Path Master links to both", () => {
    const s = learn(EMPTY_MASTERY, 10, "refine", "p1", "p2", "fa");
    expect(masteryBlockReason(tree, s, "fb", 10)).toBe("forkTaken");
    expect(masteryBlockReason(tree, s, "master", 10)).toBeUndefined();
    const w = build(learn(s, 10, "master"), 10);
    expect(w.weaponRules.parry).toBe(MASTERY.maxParry);
  });

  it("Innate patches add damage and change the cost; the fight knows the Innate", () => {
    const w = build(learn(EMPTY_MASTERY, 10, "refine", "p1", "p2", "fa"), 10);
    const hit = w.innate?.hits[0];
    expect(hit?.kind === "weapon" ? hit.multiplier : 0).toBeCloseTo(3);
    expect(w.innate?.heatCost).toBe(TEST_SKILL.heatCost - 5);
    expect(w.weaponRules.innateId).toBe(TEST_SKILL.id);
  });

  it("Master of the Edge style: no Glancing Blows, Precision past the mark becomes Crit", () => {
    const w = build(learn(EMPTY_MASTERY, 10, "refine", "refine", "p1", "p2", "fb"), 10);
    expect(w.precision).toBe(1);
    expect(w.bonuses.critChance).toBeCloseTo(0.1);
  });

  it("Mighty Hits start at 125 % Weapon Damage; the damage scale keeps the average", () => {
    const w = build(EMPTY_MASTERY);
    expect(w.weapon.mightyAt).toBeCloseTo(w.weaponDamage * 1.25);
    const scaled = buildMasteryWeapon(
      TEST_WEAPON,
      { ...tree, damageScale: 0.5 },
      EMPTY_MASTERY,
      0,
      TEST_SKILL,
    );
    expect(scaled.weaponDamage).toBeCloseTo(w.weaponDamage * 0.5);
  });

  it("ranks of a trigger node add up their chances", () => {
    const t = {
      id: "x",
      name: "X",
      condition: { kind: "onHit" as const },
      chance: 0.05,
      effect: { kind: "extraAttack" as const },
    };
    const p1 = tree.nodes.find((n) => n.id === "p1");
    if (!p1) throw new Error("p1");
    const node3 = {
      ...p1,
      id: "t",
      kind: "technique" as const,
      maxRanks: 3,
      requiresRefine: false,
      effect: { triggers: [t] },
    };
    const withT = { ...tree, nodes: [...tree.nodes, node3] };
    const s = ["t", "t", "t"].reduce((m, id) => learnMastery(withT, m, id, 3), EMPTY_MASTERY);
    const w = buildMasteryWeapon(TEST_WEAPON, withT, s, 3, TEST_SKILL);
    expect(w.triggers.filter((x) => x.id === "x")).toHaveLength(1);
    expect(w.triggers.find((x) => x.id === "x")?.chance).toBeCloseTo(0.15);
  });

  it("Infusion turns a Fire Innate into another element and ailment", () => {
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
    const frost = infuseSkill(firebolt, { damageType: "cold", ailment: "chill", chance: 0.2 });
    expect(frost).toMatchObject({ id: "firebolt@cold-chill", name: "Frostbolt", tags: ["cold"] });
    expect(frost.hits[0]).toMatchObject({
      damageType: "cold",
      ailmentChances: [{ ailment: "chill", chance: 0.5 }],
    });
    const arrow = {
      ...TEST_SKILL,
      description: "180 % Weapon Damage as Fire. Always Burns, 25 % chance to Bleed or Poison.",
      hits: [
        {
          kind: "weapon" as const,
          multiplier: 1.8,
          damageType: "fire" as const,
          ailmentChances: [{ ailment: "burn" as const, chance: 1 }],
        },
      ],
    };
    const shocking = infuseSkill(arrow, { damageType: "lightning", ailment: "shock", chance: 0.2 });
    expect(shocking.description).toBe(
      "180 % Weapon Damage as Lightning. Always Shocks, 25 % chance to Shock.",
    );
    const plain = infuseSkill(arrow, { damageType: "physical", ailment: "poison", chance: 0.2 });
    expect(plain.description).toBe("180 % Weapon Damage. Always Poisons, 25 % chance to Poison.");
    expect(plain.hits[0]).toMatchObject({ damageType: "physical" });
  });
});

describe("Weapon Mastery in the game", () => {
  const camp = (level: number, acorns = 0): GameState => {
    const s = newGame(data, { seed: 1, classId: "test-fighter" });
    return { ...s, hero: { ...s.hero, level }, wallet: { ...s.wallet, acorns } };
  };

  it("learning spends Rank points; the fight setup carries the weapon", () => {
    let s = camp(4);
    expect(masteryPointsLeft(s, data)).toBe(2);
    s = act(s, { type: "learnMastery", nodeId: "refine" }, { type: "learnMastery", nodeId: "p1" });
    expect(masteryPointsLeft(s, data)).toBe(0);
    expect(() => act(s, { type: "learnMastery", nodeId: "refine" })).toThrow(/noPoints/);
    const { setup } = heroSetup(s, data);
    expect(setup.weapon.precision).toBeCloseTo(0.75);
    expect(heroWeaponName(s, data)).toBe("Crude Test Blade");
  });

  it("Respec costs Acorns and keeps the Echo", () => {
    let s = camp(3, MASTERY.respecAcorns);
    s = act(s, { type: "learnMastery", nodeId: "refine" });
    s = { ...s, hero: { ...s.hero, mastery: { ...s.hero.mastery, echo: "test-echo" } } };
    s = act(s, { type: "respecMastery" });
    expect(s.hero.mastery).toEqual({ ...EMPTY_MASTERY, echo: "test-echo" });
    expect(s.wallet.acorns).toBe(0);
    expect(() => act(s, { type: "respecMastery" })).toThrow();
  });

  it("the act boss leaves its Echo once per run; it is worn and named", () => {
    let s = act(camp(1), { type: "setOut", actId: "test-act" });
    for (let i = 0; i < 3; i++) {
      s = act(s, { type: "startStage" }, { type: "resolveFight" });
      if (i === 2) break;
      s = act(s, { type: "salvageAll" });
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
