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
import { HUNT, huntKillsFor, huntNextAt, huntQuarry, huntThresholds, huntTier } from "./hunts";
import { TEST_ACT, TEST_GAME_DATA, WEAK_ENEMY } from "./test-fixtures";

/** Hunts (hunts-entwurf-v1.md): kills per enemy, Trails, Hunt Affixes, Hunt nodes. */

const OTHER = { ...WEAK_ENEMY, id: "other" };
const ACTS = [
  { ...TEST_ACT, enemies: [WEAK_ENEMY, OTHER] },
  { ...TEST_ACT, id: "act-7", number: 7, enemies: [{ ...WEAK_ENEMY, id: "late" }] },
];

describe("hunt tiers", () => {
  it("counts the Trails by the act's thresholds", () => {
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

  it("a Cornered Hunt Affix rolls in the best stage, an Apex one is Greater", () => {
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

  it("the Hunt Affix keeps the Trail it was rolled at", () => {
    const item = rollItem(
      TEST_GAME_DATA.items,
      { ...base, signature: { affixIds: ["crit"], best: true, trail: 3 } },
      new Rng(7),
    );
    expect(item.affixes[0]?.hunt).toBe(3);
    expect(item.affixes.slice(1).every((a) => a.hunt === undefined)).toBe(true);
  });
});

describe("hunts in the game", () => {
  const data: GameData = { ...TEST_GAME_DATA, huntSignatures: { weakling: ["crit", "life"] } };
  const act = (state: GameState, ...actions: GameAction[]) =>
    actions.reduce((s, a) => applyAction(s, data, a), state);

  it("a win fills the enemy's hunt bar and pays the new Trail once", () => {
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

  it("a Trail Hunt bounty adds a Hunt node for its enemy", () => {
    const long = { ...TEST_ACT, enemies: [WEAK_ENEMY, OTHER], stages: 15, shrineStages: [5, 10] };
    for (let seed = 1; seed <= 20; seed++) {
      const map = generateActMap(
        long,
        {
          shrines: false,
          thief: false,
          events: false,
          hunts: {
            enemyIds: ["weakling", "other"],
            kills: { other: 0, weakling: 50 },
            bounty: "weakling",
          },
        },
        new Rng(seed),
      );
      const hunts = map.rows.flat().filter((n) => n.kind === "hunt");
      expect(hunts.length).toBeLessThanOrEqual(HUNT.maxNodes + 1);
      expect(hunts.some((n) => n.quarry === "weakling")).toBe(true);
    }
  });

  it("every fight before the boss names its enemy, and the fight brings it", () => {
    const map = generateActMap(
      { ...TEST_ACT, enemies: [WEAK_ENEMY, OTHER] },
      { shrines: false, thief: false, events: false },
      new Rng(5),
    );
    map.rows.forEach((row, r) =>
      row.forEach((n) => {
        if ((n.kind === "fight" || n.kind === "elite") && r + 1 < TEST_ACT.stages)
          expect(["weakling", "other"]).toContain(n.enemy);
        else expect(n.enemy).toBeUndefined();
      }),
    );
    const two: GameData = {
      ...data,
      acts: data.acts.map((a) =>
        a.id === "test-act" ? { ...a, enemies: [WEAK_ENEMY, OTHER] } : a,
      ),
    };
    let s = applyAction(newGame(two, { seed: 3, classId: "test-fighter" }), two, {
      type: "setOut",
      actId: "test-act",
    });
    const run = s.run;
    if (!run?.map) throw new Error("no map");
    const first = run.map.rows[0]?.[0];
    const rows = run.map.rows.map((row, r) =>
      r === 0 ? row.map((n) => ({ ...n, enemy: "other" })) : row,
    );
    s = { ...s, run: { ...run, map: { rows } } };
    s = applyAction(s, two, { type: "startStage" });
    expect(first?.kind).toBe("fight");
    expect(s.run?.encounter?.enemyId).toBe("other");
  });
});

describe("the sure Hunt Affix", () => {
  it("one card of every hunted pick carries it, a Normal card turns Magic for it", async () => {
    const { rollItemChoices } = await import("./game/loot");
    const data: GameData = { ...TEST_GAME_DATA, huntSignatures: { weakling: ["crit"] } };
    for (let seed = 1; seed <= 40; seed++) {
      const items = rollItemChoices(
        data,
        "test-act",
        { enemyId: "weakling", level: 10, boss: false, eliteModifiers: [], seed: 0 },
        "normal",
        0,
        0,
        new Rng(seed),
        undefined,
        1,
        undefined,
        { signature: { affixIds: ["crit"] } },
      );
      const signed = items.filter((it) => it.affixes.some((a) => a.affixId === "crit"));
      expect(signed.length, `seed ${seed}`).toBeGreaterThanOrEqual(1);
    }
  });
});
