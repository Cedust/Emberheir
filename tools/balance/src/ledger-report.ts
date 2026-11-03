import { autoRewards } from "@emberheir/sim";
import { CURRENCIES, type Currency, type Ledger, type PhaseLedger, total } from "./ledger";

/**
 * The economy ledger as tables (`--economy 1`, economy-v2): per phase what came in, what went
 * out and what is left, then per currency where it came from and where it went.
 */

const LABEL: Record<Currency, string> = {
  acorns: "Acorns",
  ash: "Ash",
  emberCoal: "Coal",
  phoenixFeathers: "Feathers",
  cinderglass: "Cinderglass",
  runes: "Runes",
};

const round = (x: number) => (Math.abs(x) >= 100 ? Math.round(x) : Number(x.toFixed(1)));

/** One kill's worth of Acorns or Ash at the phase's boss level (the unit prices are counted in). */
export function killWorth(phase: PhaseLedger, c: Currency): number | undefined {
  if (c !== "acorns" && c !== "ash") return undefined;
  return autoRewards(Math.max(1, phase.bossLevel), "normal")[c];
}

/** Per phase and currency: income, spending, share spent, wallet at the end (and in kills). */
export function flowRows(ledger: Ledger) {
  return ledger.phases.map((p) => {
    const row: Record<string, string | number> = { phase: p.phase };
    const wins = total(p.wins);
    row.wins = Math.round(wins);
    for (const c of CURRENCIES) {
      const income = total(p.income[c]);
      const spend = total(p.spend[c]);
      if (!income && !spend && !(p.wallet?.[c] ?? 0)) continue;
      row[`${LABEL[c]} in`] = round(income);
      row[`${LABEL[c]} spent %`] = income ? `${Math.round((spend / income) * 100)}` : "-";
      row[`${LABEL[c]} end`] = round(p.wallet?.[c] ?? 0);
    }
    const kill = killWorth(p, "acorns");
    if (kill) row["Acorns end in kills"] = Math.round((p.wallet?.acorns ?? 0) / kill);
    const ash = killWorth(p, "ash");
    if (ash) row["Ash end in kills"] = Math.round((p.wallet?.ash ?? 0) / ash);
    // start + in − out must be the end; anything else is a change the ledger missed.
    const drift = CURRENCIES.map((c) =>
      Math.abs((p.start?.[c] ?? 0) + total(p.income[c]) - total(p.spend[c]) - (p.wallet?.[c] ?? 0)),
    ).reduce((a, b) => a + b, 0);
    row.drift = round(drift);
    return row;
  });
}

/** Per phase: the share of a currency's income (or spending) by source (or sink), in %. */
export function shareRows(ledger: Ledger, c: Currency, side: "income" | "spend") {
  const keys = new Set<string>();
  for (const p of ledger.phases) for (const k of Object.keys(p[side][c])) keys.add(k);
  const order = [...keys].sort();
  return ledger.phases
    .filter((p) => total(p[side][c]) > 0)
    .map((p) => {
      const sum = total(p[side][c]);
      const row: Record<string, string | number> = { phase: p.phase, total: round(sum) };
      for (const k of order) {
        const v = p[side][c][k] ?? 0;
        row[k] = v ? `${((v / sum) * 100).toFixed(0)}` : "";
      }
      return row;
    });
}

/** The min-maxer's crafts per phase: how many, and the power each bought on average (%). */
export function craftRows(ledger: Ledger) {
  return ledger.phases
    .filter((p) => p.crafts)
    .map((p) => {
      const row: Record<string, string | number> = { phase: p.phase };
      for (const [k, v] of Object.entries(p.crafts ?? {}).sort()) {
        row[`${k} n`] = round(v.count);
        row[`${k} % each`] = v.count ? ((Math.exp(v.gain / v.count) - 1) * 100).toFixed(2) : "-";
      }
      return row;
    });
}

export function printLedger(ledger: Ledger): void {
  console.log("");
  console.log(
    "Economy ledger (mean per play): income, % of it spent, wallet at the end of each phase; 'in kills' = the wallet in normal kills at the run's boss level",
  );
  console.table(flowRows(ledger));
  const crafts = craftRows(ledger);
  if (crafts.length) {
    console.log(
      "Min-maxer crafts: count per phase and the power (dps × effective Life) each bought",
    );
    console.table(crafts);
  }
  for (const c of CURRENCIES) {
    const income = shareRows(ledger, c, "income");
    if (!income.length) continue;
    console.log(`${LABEL[c]}: income by source (% of the phase's income)`);
    console.table(income);
    const spend = shareRows(ledger, c, "spend");
    if (spend.length) {
      console.log(`${LABEL[c]}: spending by sink (% of the phase's spending)`);
      console.table(spend);
    }
  }
}
