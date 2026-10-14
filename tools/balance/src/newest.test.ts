import { describe, expect, it } from "vitest";
import { type ActRunReport, type StageFight, stageKind } from "./act";
import { isNewestAct, quantile, summarizeStageKinds, targetMark } from "./newest";

const report = (stageFights: StageFight[], extra: Partial<ActRunReport> = {}): ActRunReport => ({
  generation: 2,
  act: 2,
  cleared: true,
  deaths: stageFights.filter((f) => f.died).length,
  deathEnemies: [],
  fights: stageFights.length,
  levelAtBoss: 20,
  fightSeconds: [],
  bossSeconds: 0,
  elites: 0,
  thieves: 0,
  thievesCaught: 0,
  deathStages: [],
  bossDeaths: 0,
  firstFightLost: false,
  stageFights,
  runewords: [],
  runesWorn: 0,
  ...extra,
});

describe("newest act per stage kind", () => {
  it("names the stage kind of an encounter: boss, Gatekeeper, Elite or normal", () => {
    const base = { enemyId: "x", level: 1, boss: false, eliteModifiers: [], seed: 1 };
    expect(stageKind({ ...base, boss: true })).toBe("boss");
    expect(stageKind({ ...base, gate: true, eliteModifiers: ["hardened"] })).toBe("gate");
    expect(stageKind({ ...base, eliteModifiers: ["hardened"] })).toBe("elite");
    expect(stageKind(base)).toBe("normal");
  });

  it("splits deaths and fight lengths by stage kind and counts attempts", () => {
    const s = summarizeStageKinds([
      report([
        { kind: "normal", seconds: 10, died: false },
        { kind: "normal", seconds: 20, died: false },
        { kind: "normal", seconds: 30, died: false },
        { kind: "gate", seconds: 40, died: true },
        { kind: "boss", seconds: 50, died: true },
        { kind: "boss", seconds: 90, died: false },
      ]),
      report([{ kind: "boss", seconds: 70, died: false }]),
    ]);
    expect(s.deaths).toBe(2);
    expect(s.avgAttempts).toBe(2); // (2 deaths + 1) and (0 + 1)
    expect(s.kinds.gate.deathShare).toBe(0.5);
    expect(s.kinds.boss.deathShare).toBe(0.5);
    expect(s.kinds.normal.medianSeconds).toBe(20);
    expect(s.kinds.boss.medianSeconds).toBe(70);
    expect(s.kinds.boss.p90Seconds).toBe(90);
    expect(s.kinds.elite.fights).toBe(0);
  });

  it("reads quantiles, targets and the newest act", () => {
    expect(quantile([], 0.5)).toBe(0);
    expect(quantile([1, 2, 3, 4], 0.9)).toBe(4);
    expect(targetMark(10, [20, 30])).toBe("↑");
    expect(targetMark(25, [20, 30])).toBe("✓");
    expect(targetMark(31, [20, 30])).toBe("↓");
    expect(isNewestAct(report([], { generation: 3, act: 3 }))).toBe(true);
    expect(isNewestAct(report([], { generation: 3, act: 1 }))).toBe(false);
  });
});
