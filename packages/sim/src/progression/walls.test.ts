import { describe, expect, it } from "vitest";
import { PROGRESSION } from "./constants";
import {
  type GameData,
  applyAction,
  emberPenalty,
  enemySetup,
  gateStages,
  hearthEmbers,
  newGame,
  sawtoothShare,
  stageWall,
} from "./game";
import { TEST_ACT, TEST_GAME_DATA } from "./test-fixtures";

/** Two 15-stage acts: run 1 has only the first, run 2 both. */
const LONG_ACT = { ...TEST_ACT, id: "long-act", stages: 15, shrineStages: [5, 10] };
const NEXT_ACT = { ...LONG_ACT, id: "next-act", number: 2 };
const data: GameData = { ...TEST_GAME_DATA, acts: [LONG_ACT, NEXT_ACT] };

describe("Walls of the newest act", () => {
  it("Gatekeepers stand on the Waymarks before the boss", () => {
    expect(gateStages(LONG_ACT)).toEqual([5, 10]);
    // Short acts keep their first stages free.
    expect(gateStages(TEST_ACT)).toEqual([]);
  });

  it("only the newest act of a run has a wall, rising towards the boss", () => {
    expect(stageWall(data, LONG_ACT, 1, 1)).toBeNull();
    const first = stageWall(data, NEXT_ACT, 1, 1);
    const late = stageWall(data, NEXT_ACT, 14, 1);
    const gate = stageWall(data, NEXT_ACT, 10, 1);
    const boss = stageWall(data, NEXT_ACT, 15, 1);
    const wall = PROGRESSION.wall.boss.later;
    const share = (s: number) => 1 + (wall.damage - 1) * s;
    expect(first?.damage).toBeCloseTo(share(PROGRESSION.wall.ramps[0]?.[0] ?? 0));
    expect(late?.damage).toBeCloseTo(share(PROGRESSION.wall.ramps[2]?.[1] ?? 0));
    expect(gate?.gate).toBe(true);
    expect(boss?.damage).toBeGreaterThan(late?.damage ?? 0);
    expect(boss).toMatchObject(wall);
  });

  it("climbs in teeth: each Gatekeeper is a peak above the stretch around it", () => {
    const shares = Array.from({ length: 14 }, (_, i) => sawtoothShare(NEXT_ACT, i + 1));
    const [r1, r2, r3] = PROGRESSION.wall.ramps;
    expect(shares[0]).toBeCloseTo(r1?.[0] ?? 0);
    expect(shares[3]).toBeCloseTo(r1?.[1] ?? 0);
    expect(shares[4]).toBe(PROGRESSION.wall.gates[0]);
    expect(shares[5]).toBeCloseTo(r2?.[0] ?? 0);
    expect(shares[9]).toBe(PROGRESSION.wall.gates[1]);
    expect(shares[13]).toBeCloseTo(r3?.[1] ?? 0);
    expect(shares[4]).toBeGreaterThan(shares[5] ?? 1);
    expect(shares[9]).toBeGreaterThan(shares[10] ?? 1);
    // Rising within a stretch.
    expect(shares[7]).toBeGreaterThan(shares[6] ?? 1);
  });

  it("run 1 is gentler than run 2", () => {
    const one = stageWall(data, LONG_ACT, 15, 0)?.life ?? 0;
    const two = stageWall(data, NEXT_ACT, 15, 1)?.life ?? 0;
    expect(one).toBeGreaterThan(1);
    expect(one).toBeLessThan(two);
  });

  it("a Gatekeeper is a sure Elite with more Life", () => {
    let s = newGame(data, { seed: 3, classId: "test-fighter" });
    s = applyAction(s, data, { type: "setOut", actId: "long-act" });
    s = { ...s, run: s.run && { ...s.run, stage: 5 } };
    s = applyAction(s, data, { type: "startStage" });
    const encounter = s.run?.encounter;
    if (!encounter) throw new Error("no encounter");
    expect(encounter?.gate).toBe(true);
    expect(encounter?.thief).toBeUndefined();
    expect(encounter?.eliteModifiers.length).toBeGreaterThan(0);
    const plain = enemySetup({ ...encounter, wall: { life: 1, damage: 1 } }, "long-act", data);
    const walled = enemySetup(encounter, "long-act", data);
    expect(walled.baseLife).toBeGreaterThan(plain.baseLife ?? 0);
    expect(encounter.wall?.life ?? 1).toBeGreaterThan(1);
    expect(encounter.pressure).toEqual(PROGRESSION.stageKinds.gate);
  });

  it("each stage kind has its own Life and damage; the boss hits a little softer", () => {
    const at = (stage: number) => {
      let s = newGame(data, { seed: 3, classId: "test-fighter" });
      s = applyAction(s, data, { type: "setOut", actId: "long-act" });
      s = { ...s, run: s.run && { ...s.run, stage } };
      return applyAction(s, data, { type: "startStage" }).run?.encounter;
    };
    const k = PROGRESSION.stageKinds;
    expect(at(1)?.pressure).toEqual(k.normal);
    expect(at(5)?.pressure).toEqual(k.gate);
    expect(at(15)?.pressure).toEqual(k.boss);
    expect(k.boss.damage).toBeLessThan(k.normal.damage);
  });

  it("Hearth Embers burn on the Waymarks before the boss, not in the Wildfire", () => {
    expect([4, 5, 10, 15].map((st) => hearthEmbers(LONG_ACT, st))).toEqual([
      false,
      true,
      true,
      false,
    ]);
    expect(hearthEmbers(LONG_ACT, 5, 3)).toBe(false);
  });

  it("the Ember Penalty grows by run: none in run 1, up to its max", () => {
    const game = newGame(data, { seed: 1, classId: "test-fighter" });
    const at = (prestige: number) =>
      emberPenalty({ ...game, legacy: { ...game.legacy, prestige } });
    expect(at(0)).toBe(0);
    expect(at(2)).toBeCloseTo(2 * PROGRESSION.resistancePenalty.perPrestige);
    expect(at(20)).toBe(PROGRESSION.resistancePenalty.max);
  });
});
