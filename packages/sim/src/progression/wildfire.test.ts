import { describe, expect, it } from "vitest";
import { PROGRESSION } from "./constants";
import {
  type GameAction,
  type GameData,
  type GameState,
  applyAction,
  enemySetup,
  fail,
  newGame,
  wildfireLevel,
  wildfireName,
  wildfirePressure,
  wildfireTop,
} from "./game";
import { TEST_BOON_DATA, TEST_BOSS } from "./test-fixtures";

// Harmless bosses keep the test about the flow, not the fight.
const harmless = {
  ...TEST_BOSS,
  baseLife: 0.001,
  weapon: { ...TEST_BOSS.weapon, attacksPerSecond: 0 },
};
const data: GameData = {
  ...TEST_BOON_DATA,
  acts: TEST_BOON_DATA.acts.map((a) => ({ ...a, boss: harmless })),
};
const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);
const finaleWon = (wildfire?: number): GameState => {
  const s = newGame(data, { seed: 5, classId: "test-fighter" });
  return {
    ...s,
    legacy: {
      ...s.legacy,
      prestige: PROGRESSION.finalPrestige,
      finaleWon: true,
      ...(wildfire ? { wildfire } : {}),
    },
  };
};

describe("Wildfire", () => {
  it("opens after The Last Ember, one tier above the highest cleared", () => {
    const fresh = newGame(data, { seed: 5, classId: "test-fighter" });
    expect(wildfireTop(fresh)).toBe(0);
    expect(() => act(fresh, { type: "setOut", actId: "test-act", wildfire: 1 })).toThrow(
      /after The Last Ember/,
    );
    expect(wildfireTop(finaleWon())).toBe(1);
    expect(wildfireTop(finaleWon(4))).toBe(5);
    expect(wildfireTop(finaleWon(10))).toBe(10);
    expect(() => act(finaleWon(), { type: "setOut", actId: "test-act", wildfire: 2 })).toThrow(
      /out of reach/,
    );
    expect(wildfireName(4)).toBe("Wildfire IV");
  });

  it("any act burns at Monster Level 90 + 2 per tier, harder per tier, without Waymarks", () => {
    // The last act may be chosen although no act of this run has fallen.
    let s = act(finaleWon(2), { type: "setOut", actId: "final-act", wildfire: 3 });
    expect(s.run?.wildfire).toBe(3);
    s = act(s, { type: "startStage" });
    const encounter = s.run?.encounter ?? fail("missing");
    expect(encounter.level).toBe(wildfireLevel(3));
    expect(encounter.level).toBe(96);
    expect(wildfireLevel(5)).toBe(100);
    expect(wildfireLevel(10)).toBe(110);
    expect(encounter.wall).toBeUndefined();
    expect(wildfirePressure(3).life).toBeGreaterThan(wildfirePressure(1).life);
    // Above V each tier climbs at the steep rate.
    const w = PROGRESSION.wildfire;
    const step = (t: number) => wildfirePressure(t + 1).life - wildfirePressure(t).life;
    expect(step(w.steep.from)).toBeCloseTo(w.steep.life);
    // I–IV get a head start that is gone at V: V climbs from I as if there were none.
    expect(wildfirePressure(1).life).toBeCloseTo(1 + w.early.life);
    expect(wildfirePressure(1).damage).toBeCloseTo(1 + w.early.damage);
    expect(wildfirePressure(w.steep.from).life).toBeCloseTo(1 + w.life * (w.steep.from - 1));
    expect(step(1)).toBeCloseTo(w.life * (1 + w.early.life));
    const tierOne = enemySetup({ ...encounter, pressure: wildfirePressure(1) }, "final-act", data);
    expect(enemySetup(encounter, "final-act", data).baseLife).toBeGreaterThan(
      tierOne.baseLife ?? 0,
    );
    s = act(s, { type: "resolveFight" });
    expect(s.run?.rewards?.waymark).toBeUndefined();
    expect(s.run?.rewards?.boonOffer).toBeUndefined();
    expect(s.progress.waymarks).toEqual([]);
  });

  it("the act boss takes the Wildfire boss pressure on top of the tier", () => {
    const boss = wildfirePressure(4, true);
    expect(boss.damage).toBeCloseTo(PROGRESSION.wildfire.boss.damage * wildfirePressure(4).damage);
    expect(boss.life).toBeCloseTo(PROGRESSION.wildfire.boss.life * wildfirePressure(4).life);
  });

  it("the act boss raises the highest tier and opens the next", () => {
    let s = act(finaleWon(), { type: "setOut", actId: "test-act", wildfire: 1 });
    const stages = data.acts.find((a) => a.id === "test-act")?.stages ?? 0;
    s = { ...s, run: { ...(s.run ?? fail("missing")), stage: stages } };
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    while (s.run?.rewards && !s.run.rewards.itemPick) s = act(s, { type: "salvageAll" });
    s = act(s, { type: "continue" });
    expect(s.run).toBeNull();
    expect(s.pendingPrestige).toBeNull();
    expect(s.notice).toMatchObject({ kind: "actCleared", wildfire: 1 });
    expect(s.legacy.wildfire).toBe(1);
    expect(s.progress.actsCleared).not.toContain("test-act");
    expect(wildfireTop(s)).toBe(2);
  });
});
