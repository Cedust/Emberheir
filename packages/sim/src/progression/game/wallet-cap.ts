import { PROGRESSION } from "../constants";
import { type GameState, type Wallet } from "./state";

/** The most of each currency the hero can carry (economy-v2-plan.md, Currency Caps). */
export interface WalletCap {
  readonly acorns: number;
  readonly ash: number;
  readonly emberCoal: number;
  readonly phoenixFeathers: number;
  readonly cinderglass: number;
  /** Per Rune kind. */
  readonly runes: number;
}

/** The fixed caps (Timo: none that grow). */
export function walletCap(): WalletCap {
  return PROGRESSION.walletCap;
}

/** A currency gained past its cap is lost; what the hero already held above it stays. */
const clamp = (before: number, after: number, cap: number): number =>
  after > before ? Math.min(after, Math.max(before, cap)) : after;

/** `next` with every currency that grew since `prev` held at its cap. */
export function capWallet(prev: GameState, next: GameState): GameState {
  const cap = walletCap();
  const a = prev.wallet;
  const b = next.wallet;
  if (a === b) return next;
  const runes: Record<string, number> = {};
  for (const [id, n] of Object.entries(b.runes)) runes[id] = clamp(a.runes[id] ?? 0, n, cap.runes);
  const wallet: Wallet = {
    ...b,
    acorns: clamp(a.acorns, b.acorns, cap.acorns),
    ash: clamp(a.ash, b.ash, cap.ash),
    emberCoal: clamp(a.emberCoal, b.emberCoal, cap.emberCoal),
    phoenixFeathers: clamp(a.phoenixFeathers, b.phoenixFeathers, cap.phoenixFeathers),
    runes,
    ...(b.cinderglass === undefined
      ? {}
      : { cinderglass: clamp(a.cinderglass ?? 0, b.cinderglass, cap.cinderglass) }),
  };
  const same =
    wallet.acorns === b.acorns &&
    wallet.ash === b.ash &&
    wallet.emberCoal === b.emberCoal &&
    wallet.phoenixFeathers === b.phoenixFeathers &&
    wallet.cinderglass === b.cinderglass &&
    Object.keys(runes).every((id) => runes[id] === b.runes[id]);
  return same ? next : { ...next, wallet };
}

/** Currencies at or over their cap: the wallet shows them as full. */
export function fullCurrencies(state: GameState): ReadonlySet<keyof WalletCap> {
  const cap = walletCap();
  const w = state.wallet;
  const full = new Set<keyof WalletCap>();
  if (w.acorns >= cap.acorns) full.add("acorns");
  if (w.ash >= cap.ash) full.add("ash");
  if (w.emberCoal >= cap.emberCoal) full.add("emberCoal");
  if (w.phoenixFeathers >= cap.phoenixFeathers) full.add("phoenixFeathers");
  if ((w.cinderglass ?? 0) >= cap.cinderglass) full.add("cinderglass");
  return full;
}
