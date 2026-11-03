import { describe, expect, it } from "vitest";
import { PROGRESSION } from "./constants";
import { capWallet, fullCurrencies, newGame, walletCap } from "./game";
import { TEST_GAME_DATA } from "./test-fixtures";

const base = newGame(TEST_GAME_DATA, { seed: 1, classId: "test-fighter" });
const withWallet = (w: Partial<typeof base.wallet>, level = 10) => ({
  ...base,
  hero: { ...base.hero, level },
  wallet: { ...base.wallet, ...w },
});

describe("Currency Caps", () => {
  it("caps are fixed, not by level", () => {
    expect(walletCap()).toEqual(PROGRESSION.walletCap);
  });

  it("a gain past the cap is lost, spending works, a hoard above the cap stays", () => {
    const cap = walletCap();
    const prev = withWallet({ acorns: cap.acorns - 5, emberCoal: 10, runes: { ash: 29 } });
    const next = capWallet(
      prev,
      withWallet({ acorns: cap.acorns + 100, emberCoal: 12, runes: { ash: 40, moss: 2 } }),
    );
    expect(next.wallet.acorns).toBe(cap.acorns);
    expect(next.wallet.emberCoal).toBe(12);
    expect(next.wallet.runes).toEqual({ ash: cap.runes, moss: 2 });
    // An old save above the cap keeps its amount but does not grow, and can spend.
    const hoard = withWallet({ ash: cap.ash * 3 });
    expect(capWallet(hoard, withWallet({ ash: cap.ash * 3 + 50 })).wallet.ash).toBe(cap.ash * 3);
    expect(capWallet(hoard, withWallet({ ash: 7 })).wallet.ash).toBe(7);
  });

  it("names the currencies that are full", () => {
    const cap = walletCap();
    const full = fullCurrencies(withWallet({ ash: cap.ash, phoenixFeathers: 1 }));
    expect([...full]).toEqual(["ash"]);
  });
});
