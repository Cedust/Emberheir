import { describe, expect, it } from "vitest";
import type { GameState } from "@emberheir/sim";
import type { ActRunReport } from "./act";
import { NO_INCOME, addIncome, eagerSpend, economyRows } from "./economy";

const wallet = (acorns: number, ash: number) =>
  ({
    wallet: { acorns, ash, emberCoal: 0, phoenixFeathers: 0, runes: {} },
  }) as unknown as GameState;

describe("economy", () => {
  it("counts only what the wallet gained", () => {
    const income = addIncome(NO_INCOME, wallet(100, 50), wallet(130, 20));
    expect(income).toEqual({ acorns: 30, ash: 0, emberCoal: 0, phoenixFeathers: 0 });
  });

  it("prices the eager crafter at the run's level", () => {
    const early = eagerSpend(0, 3);
    const late = eagerSpend(6, 3);
    expect(late.ash).toBeGreaterThan(early.ash * 5);
    expect(late.acorns).toBeGreaterThan(early.acorns * 5);
    expect(early.emberCoal).toBe(late.emberCoal);
  });

  it("shows one row per run with the newest act's income", () => {
    const report = {
      generation: 1,
      act: 1,
      income: { acorns: 1000, ash: 1000, emberCoal: 60, phoenixFeathers: 3 },
    } as unknown as ActRunReport;
    const rows = economyRows([report], 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ run: 1, acorns: 1000, coal: 60, "eager coal": "100 %" });
  });
});
