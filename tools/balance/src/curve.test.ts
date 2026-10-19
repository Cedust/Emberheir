import { describe, expect, it } from "vitest";
import { type PowerSample, powerCurve } from "./curve";

const sample = (level: number, dps: number): PowerSample => ({
  generation: 1,
  act: 1,
  newest: true,
  kind: "normal",
  level,
  heroLevel: level,
  dps,
  effectiveLife: 100,
  enemyLife: dps * 10,
  enemyDamage: 2,
});

describe("powerCurve", () => {
  it("takes medians per Monster Level bucket", () => {
    const rows = powerCurve([sample(1, 10), sample(3, 30), sample(5, 20), sample(7, 50)]);
    expect(rows.map((r) => [r.from, r.to, r.samples, r.dps])).toEqual([
      [1, 5, 3, 20],
      [6, 10, 1, 50],
    ]);
    expect(rows[0]?.lifeOverDps).toBe(10);
    expect(rows[0]?.ehpOverDamage).toBe(50);
  });
});
