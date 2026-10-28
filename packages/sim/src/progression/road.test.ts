import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import { PROGRESSION } from "./constants";
import {
  type GameData,
  type GameState,
  applyAction,
  dummySetup,
  gearDelta,
  itemPickAt,
  newGame,
  type NodeKind,
  wardensGate,
  tagAffixFactor,
  trainingDummy,
} from "./game";
import { rollEliteModifiers } from "./game/run";
import { rollItem } from "../items/generate";
import { TEST_SHIELD } from "../items/test-fixtures";
import { TEST_ACT, TEST_GAME_DATA } from "./test-fixtures";

/** Elites, item picks, the Warden's Gate and the Training Dummy (neuausrichtung-v1.md 6 and 9). */

const LONG_ACT = { ...TEST_ACT, id: "long-act", stages: 15, shrineStages: [5, 10], pickEvery: 3 };
const data: GameData = {
  ...TEST_GAME_DATA,
  acts: [LONG_ACT],
  eliteModifiers: [
    ...TEST_GAME_DATA.eliteModifiers,
    { id: "act-own", act: "long-act", name: "Own", description: "", lootTags: ["defense"] },
    { id: "elsewhere", act: "other-act", name: "Else", description: "" },
  ],
};

/** On the road of the long act, at `stage`, in the intermission, on a node of this kind. */
function onRoad(stage: number, seed = 3, kind: NodeKind = "fight"): GameState {
  const s = applyAction(newGame(data, { seed, classId: "test-fighter" }), data, {
    type: "setOut",
    actId: "long-act",
  });
  const run = s.run;
  if (!run?.map) return s;
  const rows = run.map.rows.map((row, r) =>
    r === stage - 1 ? row.map((n) => ({ ...n, kind })) : row,
  );
  return { ...s, run: { ...run, stage, map: { rows } } };
}

describe("Elites with a theme", () => {
  it("roll their act's own modifier first, then general ones", () => {
    for (let seed = 0; seed < 20; seed++) {
      const mods = rollEliteModifiers(data, LONG_ACT, 3, new Rng(seed));
      expect(mods[0]).toBe("act-own");
      expect(mods.slice(1).every((m) => m === "tough" || m === "fast")).toBe(true);
    }
  });

  it("lean their loot to the tags of their modifiers", () => {
    const factor = tagAffixFactor(["defense"], PROGRESSION.eliteThemeWeight);
    const affix = (tags: string[]) =>
      ({ id: "a", kind: "stat", tags }) as unknown as Parameters<typeof factor>[0];
    expect(factor(affix(["defense", "life"]))).toBe(PROGRESSION.eliteThemeWeight);
    expect(factor(affix(["offense"]))).toBe(1);
    expect(tagAffixFactor([], 4)(affix(["defense"]))).toBe(1);
  });
});

describe("Item picks: fewer, but weightier", () => {
  it("normal fights only on every third normal fight; Elites, bosses and caught thieves always", () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => itemPickAt("normal", n, false))).toEqual([
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
    expect(itemPickAt("elite", 1, false)).toBe(true);
    expect(itemPickAt("boss", 1, false)).toBe(true);
    expect(itemPickAt("normal", 1, true)).toBe(true);
  });

  it("a fight without a pick pays its cards as Ash at once (run 1 too)", () => {
    const road = onRoad(7);
    const third = applyAction({ ...road, run: road.run && { ...road.run, fights: 2 } }, data, {
      type: "startStage",
    });
    const won = applyAction(third, data, { type: "resolveFight" }).run;
    if (!third.run?.encounter?.eliteModifiers.length) {
      expect(won?.rewards?.items.length).toBe(PROGRESSION.itemChoices);
      expect(won?.fights).toBe(3);
    }
    let s = applyAction(onRoad(1), data, { type: "startStage" });
    const ash = s.wallet.ash;
    s = applyAction(s, data, { type: "resolveFight" });
    const rewards = s.run?.rewards;
    expect(rewards?.items).toEqual([]);
    expect(rewards?.itemPick).toEqual({ kind: "salvageAll" });
    // The cards are paid as plain Ash, not shown as a salvage.
    expect(rewards?.salvagedAsh).toBe(0);
    expect(s.wallet.ash).toBe(ash + (rewards?.ash ?? 0));
    expect(s.run?.fights).toBe(1);
    // Salvage All is a no-op there, so the usual flow goes on.
    expect(applyAction(s, data, { type: "salvageAll" })).toBe(s);
  });
});

describe("Warden's Gate", () => {
  it("stands before each wall of the run's newest act: its Gatekeepers and its boss", () => {
    const run = onRoad(15).run ?? { actId: "long-act", stage: 0 };
    expect(wardensGate(onRoad(15), data, run)).toBe(true);
    expect(wardensGate(onRoad(15), data, { ...run, stage: 14 })).toBe(false);
    expect(wardensGate(onRoad(15), data, { ...run, stage: 5 })).toBe(true);
    expect(wardensGate(onRoad(15), data, { ...run, wildfire: 1 })).toBe(false);
    expect(() => applyAction(onRoad(14), data, { type: "wander" })).toThrow();
    expect(applyAction(onRoad(10), data, { type: "wander" }).run?.stage).toBe(1);
  });

  it("wandering starts the act anew on a new map: Life, Flask and Boons stay", () => {
    const road = onRoad(15);
    const gate: GameState = {
      ...road,
      flaskCharges: 1,
      run: road.run && { ...road.run, lifeFraction: 0.6, path: [1, 0, 0, 1, 1] },
    };
    const s = applyAction(gate, data, { type: "wander" });
    expect(s.run).toMatchObject({ stage: 1, lifeFraction: 0.6, phase: "intermission", wanders: 1 });
    expect(s.run?.path).toEqual([1]);
    expect(s.run?.map).toBeDefined();
    expect(s.run?.map).not.toEqual(gate.run?.map);
    expect(s.flaskCharges).toBe(1);
    expect(s.pendingPrestige).toBeNull();
    const again = applyAction({ ...s, run: s.run && { ...s.run, stage: 15 } }, data, {
      type: "wander",
    });
    expect(again.run?.wanders).toBe(2);
  });
});

describe("Champions", () => {
  it("appear from run 3 on with three modifiers and more Life", () => {
    const elite = (seed: number) => {
      const s = onRoad(8, seed, "elite");
      const run3 = { ...s, legacy: { ...s.legacy, prestige: 2 } };
      return applyAction(run3, data, { type: "startStage" }).run?.encounter;
    };
    const champions = Array.from({ length: 200 }, (_, seed) => elite(seed)).filter(
      (e) => e?.champion,
    );
    expect(champions.length).toBeGreaterThan(0);
    for (const c of champions) {
      expect(c?.eliteModifiers.length).toBe(PROGRESSION.maxEliteModifiers);
    }
    // Not in runs 1 and 2.
    const early = applyAction(onRoad(8, 1, "elite"), data, { type: "startStage" });
    expect(early.run?.encounter?.champion).toBeUndefined();
  });
});

describe("Training Dummy", () => {
  it("measures the hero's damage per second on a straw man that never dies", () => {
    const s = newGame(data, { seed: 1, classId: "test-fighter" });
    const report = trainingDummy(s, data, "plain", 10);
    expect(report.dps).toBeGreaterThan(0);
    expect(report.sources.length).toBeGreaterThan(0);
    expect(report.takenPerSecond).toBe(0);
    expect(dummySetup(s, data, "striking").weapon.attacksPerSecond).toBeGreaterThan(0);
    expect(trainingDummy(s, data, "striking", 10).takenPerSecond).toBeGreaterThan(0);
  });

  it("compares an item with the worn one: damage per second and Life", () => {
    const s = newGame(data, { seed: 1, classId: "test-fighter" });
    const shield = rollItem(
      data.items,
      { baseId: TEST_SHIELD.id, itemLevel: 3, rarity: "magic" },
      new Rng(4),
    );
    const delta = gearDelta(s, data, shield, "plain", 10);
    expect(delta).not.toBeNull();
    expect(Number.isFinite(delta?.dps)).toBe(true);
    expect(delta?.life).toBeGreaterThanOrEqual(0);
  });
});
