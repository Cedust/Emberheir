import { describe, expect, it } from "vitest";
import { PROGRESSION } from "./constants";
import { type GameData, applyAction, enemySetup, gateStages, newGame, stageWall } from "./game";
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
    expect(first).toEqual({ life: 1, damage: 1, gate: false });
    expect(late?.life).toBeGreaterThan(1);
    expect(gate?.gate).toBe(true);
    expect(gate?.life).toBeGreaterThan(late?.life ?? 0);
    expect(boss?.life).toBe(PROGRESSION.wall.strength[1]);
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
  });
});
