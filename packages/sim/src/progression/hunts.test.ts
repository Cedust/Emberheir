import { describe, expect, it } from "vitest";
import { rollItem } from "../items/generate";
import { Rng } from "../rng";
import {
  type GameAction,
  type GameData,
  type GameState,
  applyAction,
  generateActMap,
  newGame,
} from "./game";
import {
  HUNT,
  actHuntStages,
  huntKillsFor,
  huntNextAt,
  huntQuarry,
  huntStages,
  huntThresholds,
  huntTier,
} from "./hunts";
import { TEST_ACT, TEST_GAME_DATA, WEAK_ENEMY } from "./test-fixtures";

/** Hunts (hunts-entwurf-v1.md): kills per enemy, Hunter's Marks, Signature Affixes, Hunt nodes. */

const OTHER = { ...WEAK_ENEMY, id: "other" };
const ACTS = [
  { ...TEST_ACT, enemies: [WEAK_ENEMY, OTHER] },
  { ...TEST_ACT, id: "act-7", number: 7, enemies: [{ ...WEAK_ENEMY, id: "late" }] },
];

describe("hunt tiers", () => {
  it("counts the Marks by the act's thresholds", () => {
    const scale = huntThresholds(ACTS, "weakling");
    expect(scale).toEqual(HUNT.actTiers[0]);
    expect(huntTier(0, scale)).toBe(0);
    expect(huntTier(scale[0] ?? 0, scale)).toBe(1);
    expect(huntTier((scale[1] ?? 0) - 1, scale)).toBe(1);
    expect(huntTier(scale[3] ?? 0, scale)).toBe(4);
    expect(huntNextAt(0, scale)).toBe(scale[0]);
    expect(huntNextAt(scale[3] ?? 0, scale)).toBeUndefined();
  });

  it("gives late acts, Wardens and the thief their own thresholds", () => {
    expect(huntThresholds(ACTS, "late")).toEqual(HUNT.actTiers[6]);
    expect(huntThresholds(ACTS, TEST_ACT.boss.id)).toEqual(HUNT.bossTiers);
    expect(huntThresholds(ACTS, "ember-thief")).toEqual(HUNT.thiefTiers);
  });

  it("counts Elites, Champions and Hunt nodes for more", () => {
    expect(huntKillsFor({ elite: false })).toBe(1);
    expect(huntKillsFor({ elite: true })).toBe(HUNT.eliteKills);
    expect(huntKillsFor({ elite: true, champion: true })).toBe(HUNT.championKills);
    expect(huntKillsFor({ elite: false, boss: true }, true)).toBe(HUNT.nodeFactor);
    expect(huntKillsFor({ elite: false }, true)).toBe(HUNT.nodeFactor);
  });

  it("opens the affix stages with the Marks; the road follows the least hunted enemy", () => {
    expect([0, 1, 2, 3, 4].map((t) => huntStages(t as 0))).toEqual([1, 1, 2, 3, 3]);
    const act = ACTS[0] ?? TEST_ACT;
    const second = HUNT.actTiers[0][1];
    expect(actHuntStages(ACTS, act, { weakling: second })).toBe(1);
    expect(actHuntStages(ACTS, act, { weakling: second, other: second })).toBe(2);
  });

  it("points a Hunt node at the least hunted enemy", () => {
    expect(huntQuarry(["a", "b"], { a: 5 }, new Rng(1))).toBe("b");
    expect(huntQuarry([], {}, new Rng(1))).toBeUndefined();
  });
});

describe("hunt loot", () => {
  const base = { baseId: "test-ring", itemLevel: 10, rarity: "rare" as const };

  it("a signature puts one of its affixes on the item", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const item = rollItem(
        TEST_GAME_DATA.items,
        { ...base, signature: { affixIds: ["crit"] } },
        new Rng(seed),
      );
      expect(item.affixes[0]?.affixId).toBe("crit");
      expect(new Set(item.affixes.map((a) => a.affixId)).size).toBe(item.affixes.length);
    }
  });

  it("caps the affix stages and keeps the cap on the item", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const item = rollItem(TEST_GAME_DATA.items, { ...base, stages: 1 }, new Rng(seed));
      expect(item.stages).toBe(1);
      for (const a of item.affixes) expect(a.quality).toBeLessThan(1 / 3 + 1e-9);
    }
    expect(rollItem(TEST_GAME_DATA.items, base, new Rng(1)).stages).toBeUndefined();
  });

  it("a mastered signature rolls in the best stage, an Apex one is Greater", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const best = rollItem(
        TEST_GAME_DATA.items,
        { ...base, signature: { affixIds: ["crit"], best: true } },
        new Rng(seed),
      );
      expect(best.affixes[0]?.quality).toBeGreaterThanOrEqual(2 / 3);
      const apex = rollItem(
        TEST_GAME_DATA.items,
        { ...base, signature: { affixIds: ["crit"], greater: HUNT.apexRanks } },
        new Rng(seed),
      );
      expect(apex.greater?.index).toBe(0);
      expect(apex.greater?.rank).toBeGreaterThanOrEqual(1);
      expect(apex.greater?.rank).toBeLessThanOrEqual(5);
    }
  });
});

describe("hunts in the game", () => {
  const data: GameData = { ...TEST_GAME_DATA, huntSignatures: { weakling: ["crit", "life"] } };
  const act = (state: GameState, ...actions: GameAction[]) =>
    actions.reduce((s, a) => applyAction(s, data, a), state);

  it("a win fills the enemy's hunt bar and pays the new Mark once", () => {
    let s = act(newGame(data, { seed: 3, classId: "test-fighter" }), {
      type: "setOut",
      actId: "test-act",
    });
    const scale = huntThresholds(data.acts, "weakling");
    s = { ...s, legacy: { ...s.legacy, hunts: { weakling: (scale[0] ?? 1) - 1 } } };
    const acorns = s.wallet.acorns;
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    const hunt = s.run?.rewards?.hunt;
    expect(s.legacy.hunts?.["weakling"]).toBe(scale[0]);
    expect(hunt).toMatchObject({ enemyId: "weakling", tier: 1, tierUp: true });
    expect(hunt?.acorns).toBe(HUNT.rewards[0]?.acorns);
    expect(s.wallet.acorns).toBeGreaterThanOrEqual(acorns + (HUNT.rewards[0]?.acorns ?? 0));
    // Below Mark II the cards roll only in the lowest stage.
    for (const item of s.run?.rewards?.items ?? []) {
      if (!item.uniqueId && item.affixes.length) expect(item.stages).toBe(1);
    }
  });

  it("Hunt nodes stand on plain fights and name their quarry", () => {
    const long = { ...TEST_ACT, stages: 15, shrineStages: [5, 10] };
    let found = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const map = generateActMap(
        long,
        {
          shrines: false,
          thief: false,
          events: false,
          hunts: { enemyIds: ["weakling"], kills: {} },
        },
        new Rng(seed),
      );
      const hunts = map.rows.flat().filter((n) => n.kind === "hunt");
      expect(hunts.length).toBeLessThanOrEqual(HUNT.maxNodes);
      for (const n of hunts) expect(n.quarry).toBe("weakling");
      found += hunts.length;
    }
    expect(found).toBeGreaterThan(30);
  });
});
