import type { GameState } from "@emberheir/sim";
import { type NoteHover, useNoteHover } from "../ItemTooltip";
import { useRollingNumber } from "./juice";
import acornsUrl from "../../assets/currency/acorns.webp";
import ashUrl from "../../assets/currency/ash.webp";
import coalUrl from "../../assets/currency/coal.webp";
import feathersUrl from "../../assets/currency/feathers.webp";
import flaskUrl from "../../assets/currency/flask.webp";
import glassUrl from "../../assets/currency/glass.webp";
import runesUrl from "../../assets/currency/runes.webp";

/** Every currency the wallet shows, plus the Ember Flask charges in the Camp header. */
export type CurrencyId = "acorns" | "ash" | "coal" | "feathers" | "runes" | "glass" | "flask";

interface CurrencyDef {
  readonly name: string;
  /** What it buys, in plain words (tooltip). Never where it drops (Timo). */
  readonly explain: string;
  readonly kind: string;
}

export const CURRENCIES: Readonly<Record<CurrencyId, CurrencyDef>> = {
  acorns: {
    name: "Acorns",
    kind: "Currency",
    explain: "The caravan's coin. Pays for Respecs, Sockets, Runes and Marisha's gambles.",
  },
  ash: {
    name: "Ash",
    kind: "Currency",
    explain: "Thoric and Liora craft with it.",
  },
  coal: {
    name: "Ember Coal",
    kind: "Currency",
    explain: "Thoric reforges with it, Liora kindles with it.",
  },
  feathers: {
    name: "Phoenix Feathers",
    kind: "Currency",
    explain: "Thoric needs one to raise an item by a Tier.",
  },
  runes: {
    name: "Runes",
    kind: "Currency",
    explain: "Nyssa sets them into Sockets. The right Runes in the right order make a Runeword.",
  },
  glass: {
    name: "Cinderglass",
    kind: "Currency",
    explain: "Liora awakens Greater Affixes with it.",
  },
  flask: {
    name: "Ember Flask",
    kind: "Charges",
    explain: "Heals you during a fight. The Camp refills it.",
  },
};

/** Timo's painted currency icons (tools/art/cut_currency.py cuts them from his sheet). */
const ICONS: Readonly<Record<CurrencyId, string>> = {
  acorns: acornsUrl,
  ash: ashUrl,
  coal: coalUrl,
  feathers: feathersUrl,
  runes: runesUrl,
  glass: glassUrl,
  flask: flaskUrl,
};

export function CurrencyIcon(props: { id: CurrencyId; size?: number }) {
  const s = props.size ?? 26;
  return (
    <img
      className={`k-coin k-coin-${props.id}`}
      src={ICONS[props.id]}
      width={s}
      height={s}
      alt=""
      draggable={false}
    />
  );
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** The wallet as `CurrencyId → amount`; Runes and Cinderglass only once you have some. */
export function walletAmounts(state: GameState): [CurrencyId, number][] {
  const w = state.wallet;
  const runes = Object.values(w.runes).reduce((a, b) => a + b, 0);
  return [
    ["acorns", w.acorns],
    ["ash", w.ash],
    ["coal", w.emberCoal],
    ["feathers", w.phoenixFeathers],
    ...(runes > 0 ? [["runes", runes] as [CurrencyId, number]] : []),
    ...(w.cinderglass ? [["glass", w.cinderglass] as [CurrencyId, number]] : []),
  ];
}

function currencyNote(id: CurrencyId, amount: string): NoteHover {
  const def = CURRENCIES[id];
  return { name: def.name, kind: def.kind, explain: def.explain, status: `You have ${amount}` };
}

/** One currency: icon and amount; the name shows in the tooltip (Timo: no names next to icons). */
export function CurrencyChip(props: {
  id: CurrencyId;
  /** A number, or text such as "3/3" for the Flask. */
  amount: number | string;
  /** Gained since the last fight, shown as "+n". */
  gain?: number | undefined;
}) {
  const exact = typeof props.amount === "number" ? fmt(props.amount) : props.amount;
  // Numbers count to their new value (Diablo gold); text like the Flask's "3/3" just changes.
  const roll = useRollingNumber(typeof props.amount === "number" ? props.amount : 0);
  const shown = typeof props.amount === "number" ? fmt(roll.value) : props.amount;
  const hover = useNoteHover(currencyNote(props.id, exact));
  const name = CURRENCIES[props.id].name;
  return (
    <span
      className={`k-currency${roll.trend ? ` k-${roll.trend}` : ""}`}
      data-currency={props.id}
      tabIndex={0}
      aria-label={`${name}: ${exact}`}
      {...hover}
    >
      <CurrencyIcon id={props.id} />
      <b className="mono">{shown}</b>
      {(props.gain ?? 0) > 0 && <span className="k-gain mono">+{fmt(props.gain ?? 0)}</span>}
    </span>
  );
}

/**
 * The wallet, the same everywhere (ui-ux-plan-v1.md 3.4). `only` limits it to the currencies a
 * screen needs; `extra` adds e.g. the Flask charges.
 */
export function Wallet(props: {
  state: GameState;
  only?: readonly CurrencyId[];
  extra?: readonly { id: CurrencyId; amount: number | string }[];
  gains?: Readonly<Partial<Record<CurrencyId, number>>>;
  className?: string;
}) {
  const rows = walletAmounts(props.state).filter(([id]) => !props.only || props.only.includes(id));
  return (
    <div className={`k-wallet ${props.className ?? ""}`} aria-label="Wallet">
      {rows.map(([id, amount]) => (
        <CurrencyChip key={id} id={id} amount={amount} gain={props.gains?.[id]} />
      ))}
      {props.extra?.map((e) => (
        <CurrencyChip key={e.id} id={e.id} amount={e.amount} />
      ))}
    </div>
  );
}

/** A price: icons and amounts, red where the wallet is short. */
export function Cost(props: {
  parts: readonly { id: CurrencyId; amount: number; have: number }[];
}) {
  return (
    <span className="k-cost">
      {props.parts.map((p) => (
        <span
          key={p.id}
          className={`k-cost-part${p.have < p.amount ? " short" : ""}`}
          aria-label={`${fmt(p.amount)} ${CURRENCIES[p.id].name}`}
          title={`${fmt(p.amount)} ${CURRENCIES[p.id].name}`}
        >
          <CurrencyIcon id={p.id} />
          <b className="mono">{fmt(p.amount)}</b>
        </span>
      ))}
    </span>
  );
}

/**
 * An amount inside text or a button: icon and number, the name on hover and for screen readers.
 * `plus` writes a gain ("+3").
 */
export function Price(props: { id: CurrencyId; amount: number; plus?: boolean; size?: number }) {
  const label = `${fmt(props.amount)} ${CURRENCIES[props.id].name}`;
  return (
    <span className="k-price" aria-label={label} title={label}>
      <CurrencyIcon id={props.id} size={props.size ?? 20} />
      <b className="mono">
        {props.plus ? "+" : ""}
        {fmt(props.amount)}
      </b>
    </span>
  );
}
