import { describe, expect, it } from "vitest";
import type { ActRunReport } from "./act";
import { PLAYTIME, median, reportMinutes, runMinutes } from "./playtime";

const report = (generation: number, deaths: number, seconds: number[]): ActRunReport =>
  ({
    generation,
    deaths,
    stageFights: seconds.map((s) => ({ kind: "normal", seconds: s, died: false })),
  }) as unknown as ActRunReport;

describe("playtime", () => {
  it("adds fight seconds, the time after each fight and each trip", () => {
    const r = report(1, 1, [30, 30]);
    expect(reportMinutes(r)).toBeCloseTo((60 + 2 * PLAYTIME.perFight + 2 * PLAYTIME.perTrip) / 60);
  });

  it("sums a run's acts per seed and takes medians", () => {
    const reports = [report(1, 0, [60]), report(1, 0, [60]), report(2, 0, [60])];
    expect(runMinutes(reports, 1, 2)).toBeCloseTo(reportMinutes(reports[0] as ActRunReport));
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});
