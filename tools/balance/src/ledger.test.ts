import { describe, expect, it } from "vitest";
import { GAME_DATA } from "@emberheir/content";
import { type GameState, newGame } from "@emberheir/sim";
import {
  applyAction,
  bookInto,
  closePhase,
  commit,
  link,
  meanLedger,
  newLedger,
  sourceOf,
  total,
} from "./ledger";
import { flowRows } from "./ledger-report";

const start = (): GameState => {
  const c = GAME_DATA.classes[0];
  if (!c) throw new Error("no class");
  return newGame(GAME_DATA, { seed: 7, classId: c.id, weapon: c.weapons[0] ?? "" });
};

const withAcorns = (s: GameState, acorns: number): GameState => ({
  ...s,
  wallet: { ...s.wallet, acorns },
});

describe("economy ledger", () => {
  it("books only the path the autopilot kept, not the actions it tried and threw away", () => {
    const ledger = newLedger();
    const s0 = start();
    bookInto(ledger, "run 1", 10, s0);
    // A tried branch: never committed.
    link(s0, withAcorns(s0, s0.wallet.acorns + 500), "tried");
    const kept = link(s0, withAcorns(s0, s0.wallet.acorns + 40), "fight:normal");
    const spent = link(kept, withAcorns(kept, kept.wallet.acorns - 15), "craft:temper");
    commit(spent);
    closePhase(spent);
    bookInto(null);
    const [phase] = ledger.phases;
    expect(phase?.income.acorns).toEqual({ "fight:normal": 40 });
    expect(phase?.spend.acorns).toEqual({ "craft:temper": 15 });
    expect(phase?.unbooked).toBe(0);
    expect(flowRows(ledger)[0]?.drift).toBe(0);
  });

  it("books a kept state it did not make as unknown, so nothing goes missing", () => {
    const ledger = newLedger();
    const s0 = start();
    bookInto(ledger, "run 1", 10, s0);
    const outside = withAcorns(s0, s0.wallet.acorns + 25);
    closePhase(outside);
    bookInto(null);
    expect(ledger.phases[0]?.income.acorns).toEqual({ unknown: 25 });
    expect(ledger.phases[0]?.unbooked).toBe(1);
  });

  it("names the source of a real action and books nothing while no phase is open", () => {
    const s0 = start();
    expect(sourceOf(s0, { type: "craft", request: { kind: "reforge", itemId: "x" } })).toBe(
      "craft:reforge",
    );
    const next = applyAction(s0, GAME_DATA, { type: "dismissNotice" });
    expect(next).toBeDefined();
  });

  it("averages each phase over the plays that reached it", () => {
    const a = newLedger();
    const b = newLedger();
    const s0 = start();
    for (const [l, gain, phases] of [
      [a, 100, ["run 1", "wildfire 1"]],
      [b, 300, ["run 1"]],
    ] as const) {
      for (const phase of phases) {
        bookInto(l, phase, 10, s0);
        const s1 = link(s0, withAcorns(s0, s0.wallet.acorns + gain), "fight:normal");
        closePhase(s1);
      }
    }
    bookInto(null);
    const mean = meanLedger([a, b]);
    expect(total(mean.phases[0]?.income.acorns ?? {})).toBe(200);
    expect(total(mean.phases[1]?.income.acorns ?? {})).toBe(100);
  });
});
