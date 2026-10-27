import {
  CRAFTING,
  ITEMS,
  type GameState,
  bossLevel,
  craftCost,
  gamblePrice,
  killPrice,
} from "@emberheir/sim";

/**
 * Economy check (economy-audit-v1.md E5): what the fights of an act pay against what an eager
 * crafter would spend there. The autopilot crafts little, so its income is the whole income.
 */

export interface Income {
  readonly acorns: number;
  readonly ash: number;
  readonly emberCoal: number;
  readonly phoenixFeathers: number;
}

export const NO_INCOME: Income = { acorns: 0, ash: 0, emberCoal: 0, phoenixFeathers: 0 };

const KEYS = ["acorns", "ash", "emberCoal", "phoenixFeathers"] as const;

/** `income` plus what the wallet gained from `before` to `after` (losses are spending, not income). */
export function addIncome(income: Income, before: GameState, after: GameState): Income {
  const next = { ...income };
  for (const k of KEYS) next[k] += Math.max(0, after.wallet[k] - before.wallet[k]);
  return next;
}

/**
 * An eager crafter in one newest act: a few new items, each tempered and reforged many times,
 * sockets, some gambles, and every Feather of the act spent on an Upgrade.
 */
export const EAGER = { items: 3, tempers: 20, reforges: 20, sockets: 2, gambles: 5 } as const;

/** What `EAGER` costs at the run's boss level, with `feathers` Upgrades. */
export function eagerSpend(prestige: number, feathers: number): Income {
  const itemLevel = bossLevel(prestige);
  const tier = Math.min(ITEMS.maxTier, Math.max(1, Math.ceil(itemLevel / ITEMS.itemLevelsPerTier)));
  const item = { itemLevel, tier, sockets: 0 } as Parameters<typeof craftCost>[1];
  const temper = craftCost({ kind: "temper", itemId: "", affixIndex: 0 }, item);
  const reforge = craftCost({ kind: "reforge", itemId: "" }, item);
  const socket = craftCost({ kind: "addSocket", itemId: "" }, item);
  const upgrade = killPrice(itemLevel, { acorns: CRAFTING.upgradeKillsPerTier * tier }).acorns;
  const n = EAGER.items;
  return {
    acorns:
      n * EAGER.tempers * temper.acorns +
      EAGER.sockets * socket.acorns +
      EAGER.gambles * gamblePrice(itemLevel) +
      feathers * upgrade,
    ash: n * EAGER.tempers * temper.ash + EAGER.sockets * socket.ash,
    emberCoal: n * EAGER.reforges * reforge.emberCoal,
    phoenixFeathers: feathers,
  };
}

/** One row per run: the newest act's mean income next to the eager spending (share of income). */
/** The parts of an act report the economy reads (`ActRunReport`). */
export interface IncomeReport {
  readonly generation: number;
  readonly act: number;
  readonly income?: Income;
}

export function economyRows(reports: readonly IncomeReport[], generations: number) {
  const rows = [];
  for (let g = 1; g <= generations; g++) {
    const newest = reports.filter((r) => r.generation === g && r.act === g && r.income);
    if (!newest.length) continue;
    const mean = (k: keyof Income) =>
      newest.reduce((sum, r) => sum + (r.income?.[k] ?? 0), 0) / newest.length;
    const spend = eagerSpend(g - 1, Math.round(mean("phoenixFeathers")));
    const share = (k: keyof Income) => `${((spend[k] / Math.max(1, mean(k))) * 100).toFixed(0)} %`;
    rows.push({
      run: g,
      acorns: Math.round(mean("acorns")),
      "eager acorns": share("acorns"),
      ash: Math.round(mean("ash")),
      "eager ash": share("ash"),
      coal: Math.round(mean("emberCoal")),
      "eager coal": share("emberCoal"),
      feathers: mean("phoenixFeathers").toFixed(1),
    });
  }
  return rows;
}
