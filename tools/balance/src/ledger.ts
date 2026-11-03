import {
  applyAction as simApplyAction,
  type GameAction,
  type GameData,
  type GameState,
  type Wallet,
} from "@emberheir/sim";

/**
 * Economy ledger (economy-v2): every action the autopilot takes goes through `applyAction` here,
 * and the wallet's change is booked by source (income) and by sink (spending), per phase of the
 * game (run 1..7, The Last Ember, Wildfire tiers). The balance tool alone uses it; the sim
 * knows nothing of it.
 */

export const CURRENCIES = [
  "acorns",
  "ash",
  "emberCoal",
  "phoenixFeathers",
  "cinderglass",
  "runes",
] as const;
export type Currency = (typeof CURRENCIES)[number];

type Book = Record<Currency, Record<string, number>>;

/** One phase of the game: what came in, what went out, and the wallet at its end. */
export interface PhaseLedger {
  readonly phase: string;
  readonly income: Book;
  readonly spend: Book;
  /** Normal / Elite / Gatekeeper / boss fights won in the phase (prices are counted in kills). */
  readonly wins: Record<string, number>;
  /** The run's boss level (the price level of resets and Draughts). */
  bossLevel: number;
  /** The wallet when the phase began and when it ended. */
  start?: Record<Currency, number>;
  wallet?: Record<Currency, number>;
  /** Kept states that did not come from a booked action (their wallet change is missing). */
  unbooked: number;
  /** The min-maxer's crafts: how many, and the gear value (log power) they bought, by kind. */
  crafts?: Record<string, { count: number; gain: number }>;
}

export interface Ledger {
  readonly phases: PhaseLedger[];
}

const emptyBook = (): Book => Object.fromEntries(CURRENCIES.map((c) => [c, {}])) as unknown as Book;

export const newLedger = (): Ledger => ({ phases: [] });

let active: { ledger: Ledger; phase: PhaseLedger } | null = null;

/**
 * Every state `applyAction` made points back to the state it came from. The autopilot also tries
 * actions it then throws away (which item to wear, which craft is best), so nothing is booked
 * when it happens: `commit` walks back from the state the autopilot kept to the last committed
 * one and books only that path.
 */
interface Link {
  readonly parent: GameState;
  readonly source: string;
  readonly win: boolean;
}
const links = new WeakMap<GameState, Link>();
let root: GameState | null = null;

/** Books every following action into `phase` of `ledger` (null stops booking). */
export function bookInto(
  ledger: Ledger | null,
  phase?: string,
  bossLevel = 0,
  state?: GameState,
): void {
  if (!ledger || !phase) {
    active = null;
    root = null;
    return;
  }
  let p = ledger.phases.find((x) => x.phase === phase);
  if (!p) {
    p = { phase, income: emptyBook(), spend: emptyBook(), wins: {}, bossLevel, unbooked: 0 };
    if (state) p.start = walletAmounts(state.wallet);
    ledger.phases.push(p);
  }
  active = { ledger, phase: p };
  if (state) root = state;
}

/** Books the path from the last committed state to `state` (the state the autopilot kept). */
export function commit(state: GameState): GameState {
  if (!active) return state;
  const chain: { from: GameState; to: GameState; link: Link }[] = [];
  let x = state;
  for (let link = links.get(x); x !== root && link; link = links.get(x)) {
    chain.push({ from: link.parent, to: x, link });
    links.delete(x);
    x = link.parent;
  }
  if (root && x !== root) {
    // A kept state the ledger did not make: book its change from the last commit as unknown.
    active.phase.unbooked++;
    book(active.phase, "unknown", root, x);
  }
  for (const { from, to, link } of chain.reverse()) {
    book(active.phase, link.source, from, to);
    if (link.win) {
      const kind = link.source.slice("fight:".length);
      active.phase.wins[kind] = (active.phase.wins[kind] ?? 0) + 1;
    }
  }
  root = state;
  return state;
}

/** Commits and notes the wallet at the end of the active phase. */
export function closePhase(state: GameState): void {
  if (!active) return;
  commit(state);
  active.phase.wallet = walletAmounts(state.wallet);
}

export function walletAmounts(wallet: Wallet): Record<Currency, number> {
  return {
    acorns: wallet.acorns,
    ash: wallet.ash,
    emberCoal: wallet.emberCoal,
    phoenixFeathers: wallet.phoenixFeathers,
    cinderglass: wallet.cinderglass ?? 0,
    runes: Object.values(wallet.runes).reduce((a, b) => a + b, 0),
  };
}

/** Where a wallet change comes from, by the action and the state before it. */
export function sourceOf(state: GameState, action: GameAction): string {
  switch (action.type) {
    case "resolveFight": {
      const e = state.run?.encounter;
      if (e?.boss) return "fight:boss";
      if (e?.gate) return "fight:gatekeeper";
      if (e?.thief) return "fight:thief";
      if (e?.eliteModifiers.length) return "fight:elite";
      return "fight:normal";
    }
    case "pickItem":
    case "continue":
    case "discard":
    case "salvage":
    case "salvageAll":
      return state.run?.phase === "rewards" ? "loot salvage" : "camp salvage";
    case "visitNode":
      return `node:${state.run?.visit?.kind ?? "?"}`;
    case "turnInBounty":
    case "closeBountyCache":
    case "takeBountyItem":
      return "bounty";
    case "craft":
      return `craft:${action.request.kind}`;
    case "chooseDraught":
    case "setOut":
      return "draught";
    case "bindPower":
      return "crucible";
    default:
      return action.type;
  }
}

/** Books what the wallet gained or lost from `before` to `after` under `source`. */
export function book(
  phase: PhaseLedger,
  source: string,
  before: GameState,
  after: GameState,
): void {
  const a = walletAmounts(before.wallet);
  const b = walletAmounts(after.wallet);
  for (const c of CURRENCIES) {
    const d = b[c] - a[c];
    if (d > 0) phase.income[c][source] = (phase.income[c][source] ?? 0) + d;
    if (d < 0) phase.spend[c][source] = (phase.spend[c][source] ?? 0) - d;
  }
}

/**
 * For sim helpers that run several actions at once (`learnAshTree`, `setPlanBattlePlan`): `to`
 * comes from `from`, booked under `source`.
 */
export function link(from: GameState, to: GameState, source: string): GameState {
  if (active && to !== from && !links.has(to)) links.set(to, { parent: from, source, win: false });
  return to;
}

/** The min-maxer notes a real craft and what it bought (crafter.ts). */
export function noteCraft(kind: string, gain: number): void {
  if (!active) return;
  const crafts = (active.phase.crafts ??= {});
  const c = (crafts[kind] ??= { count: 0, gain: 0 });
  c.count++;
  c.gain += gain;
}

/** `applyAction` of the sim; the new state remembers where it came from (see `commit`). */
export function applyAction(state: GameState, data: GameData, action: GameAction): GameState {
  const next = simApplyAction(state, data, action);
  if (active && next !== state) {
    links.set(next, {
      parent: state,
      source: sourceOf(state, action),
      win: action.type === "resolveFight" && next.stats.wins > state.stats.wins,
    });
  }
  return next;
}

/** The mean of several plays' ledgers, phase by phase. */
export function meanLedger(ledgers: readonly Ledger[]): Ledger {
  const out = newLedger();
  // Each phase is the mean of the plays that reached it (not every play climbs every Wildfire tier).
  const reached = new Map<string, number>();
  for (const l of ledgers)
    for (const p of l.phases) reached.set(p.phase, (reached.get(p.phase) ?? 0) + 1);
  for (const l of ledgers) {
    for (const p of l.phases) {
      const n = reached.get(p.phase) ?? 1;
      let q = out.phases.find((x) => x.phase === p.phase);
      if (!q) {
        q = {
          phase: p.phase,
          income: emptyBook(),
          spend: emptyBook(),
          wins: {},
          bossLevel: p.bossLevel,
          unbooked: 0,
          start: Object.fromEntries(CURRENCIES.map((c) => [c, 0])) as Record<Currency, number>,
          wallet: Object.fromEntries(CURRENCIES.map((c) => [c, 0])) as Record<Currency, number>,
        };
        out.phases.push(q);
      }
      for (const c of CURRENCIES) {
        for (const [k, v] of Object.entries(p.income[c]))
          q.income[c][k] = (q.income[c][k] ?? 0) + v / n;
        for (const [k, v] of Object.entries(p.spend[c]))
          q.spend[c][k] = (q.spend[c][k] ?? 0) + v / n;
        if (q.wallet) q.wallet[c] += (p.wallet?.[c] ?? 0) / n;
        if (q.start) q.start[c] += (p.start?.[c] ?? 0) / n;
      }
      for (const [k, v] of Object.entries(p.wins)) q.wins[k] = (q.wins[k] ?? 0) + v / n;
      q.unbooked += p.unbooked / n;
      for (const [k, v] of Object.entries(p.crafts ?? {})) {
        const c = ((q.crafts ??= {})[k] ??= { count: 0, gain: 0 });
        c.count += v.count / n;
        c.gain += v.gain / n;
      }
    }
  }
  return out;
}

export const total = (r: Readonly<Record<string, number>>) =>
  Object.values(r).reduce((a, b) => a + b, 0);
