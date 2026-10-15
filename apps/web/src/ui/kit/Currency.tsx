import type { GameState } from "@emberheir/sim";
import { type NoteHover, useNoteHover } from "../ItemTooltip";

/** Every currency the wallet shows, plus the Ember Flask charges in the Camp header. */
export type CurrencyId = "acorns" | "ash" | "coal" | "feathers" | "runes" | "glass" | "flask";

interface CurrencyDef {
  readonly name: string;
  /** Where it comes from and what it buys, in plain words (tooltip). */
  readonly explain: string;
  readonly kind: string;
}

export const CURRENCIES: Readonly<Record<CurrencyId, CurrencyDef>> = {
  acorns: {
    name: "Acorns",
    kind: "Currency · every fight",
    explain: "The caravan's coin. Pays for Respecs, Sockets, Runes and Marisha's gambles.",
  },
  ash: {
    name: "Ash",
    kind: "Currency · Salvage",
    explain: "What is left of salvaged items and the loot you leave behind. Crafting needs it.",
  },
  coal: {
    name: "Ember Coal",
    kind: "Currency · Elites and bosses",
    explain: "Falls into your pouch on its own. Thoric reforges with it, Liora kindles with it.",
  },
  feathers: {
    name: "Phoenix Feathers",
    kind: "Currency · bosses",
    explain: "Rare. Thoric needs one to raise an item by a Tier.",
  },
  runes: {
    name: "Runes",
    kind: "Currency · Act drops",
    explain: "Nyssa sets them into Sockets. The right Runes in the right order make a Runeword.",
  },
  glass: {
    name: "Cinderglass",
    kind: "Currency · Wildfire",
    explain: "Only Wildfire bosses drop it. Liora awakens Greater Affixes with it.",
  },
  flask: {
    name: "Ember Flask",
    kind: "Charges",
    explain: "Heals you during a fight. The Camp refills it.",
  },
};

/** Small painted currency icons (code-drawn until Timo's art arrives). */
export function CurrencyIcon(props: { id: CurrencyId; size?: number }) {
  const s = props.size ?? 20;
  return (
    <svg
      className={`k-coin k-coin-${props.id}`}
      width={s}
      height={s}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {COIN_ART[props.id]}
    </svg>
  );
}

const INK = "#2a1f17";

const COIN_ART: Readonly<Record<CurrencyId, React.ReactNode>> = {
  acorns: (
    <g stroke={INK} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M6 11c0 6 3 10 6 10s6-4 6-10z" fill="#c98a3f" />
      <path d="M4.5 11.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5z" fill="#7a4e24" />
      <path d="M12 5V2.5" fill="none" strokeLinecap="round" />
      <path d="M8.5 14.5c.4 2 1.4 3.6 2.6 4.4" fill="none" stroke="#f1c27d" strokeWidth="1" />
    </g>
  ),
  ash: (
    <g stroke={INK} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M3 20c1-5 4-9 9-9s8 4 9 9z" fill="#9a948c" />
      <path d="M7 17c1.5-2.5 3-3.5 5-3.5" fill="none" stroke="#d6d0c6" strokeWidth="1" />
      <circle cx="15.5" cy="16.5" r="1.4" fill="#ff8a3a" stroke="none" />
      <path d="M12 9c-1-2 0-4 1.5-5.5" fill="none" stroke="#9a948c" strokeLinecap="round" />
    </g>
  ),
  coal: (
    <g stroke={INK} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M4 14l3-7 7-3 6 5-1 8-7 4-6-2z" fill="#3a3330" />
      <path d="M8 10l4 3 3-4 M12 13l-1 5 M12 13l5 2" fill="none" stroke="#ff7a2b" />
    </g>
  ),
  feathers: (
    <g stroke={INK} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M19 3C11 4 6 10 5 19c6-1 12-6 14-16z" fill="#ff8a1f" />
      <path d="M17 5C13 9 9 14 4 21" fill="none" stroke="#7a2a0e" strokeLinecap="round" />
      <path d="M9 13l-2-1 M11 10l-2-1.5 M13 8l-1.5-2" fill="none" stroke="#ffd27a" />
    </g>
  ),
  runes: (
    <g stroke={INK} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M12 2.5l8 4.5v10l-8 4.5-8-4.5V7z" fill="#8c8478" />
      <path d="M12 7v10 M9 9.5l3 3 3-3" fill="none" stroke="#ffb13b" strokeWidth="1.6" />
    </g>
  ),
  glass: (
    <g stroke={INK} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M12 2l5 7-5 13-5-13z" fill="#ff6a2b" />
      <path d="M7 9h10 M12 2v20" fill="none" stroke="#ffd0a0" strokeWidth="0.9" />
    </g>
  ),
  flask: (
    <g stroke={INK} strokeWidth="1.2" strokeLinejoin="round">
      <path
        d="M9.5 2.5h5 M10 2.5v5L5 17a3 3 0 0 0 2.7 4.5h8.6A3 3 0 0 0 19 17l-5-9.5v-5"
        fill="#e5484d"
      />
      <path d="M7 15h10" fill="none" stroke="#ffb0a8" />
    </g>
  ),
};

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

/** One currency: icon, amount, and the name in the tooltip (or next to it with `named`). */
export function CurrencyChip(props: {
  id: CurrencyId;
  /** A number, or text such as "3/3" for the Flask. */
  amount: number | string;
  named?: boolean | undefined;
  /** Gained since the last fight, shown as "+n". */
  gain?: number | undefined;
}) {
  const shown = typeof props.amount === "number" ? fmt(props.amount) : props.amount;
  const hover = useNoteHover(currencyNote(props.id, shown));
  const name = CURRENCIES[props.id].name;
  return (
    <span
      className="k-currency"
      data-currency={props.id}
      tabIndex={0}
      aria-label={`${name}: ${shown}`}
      {...hover}
    >
      <CurrencyIcon id={props.id} />
      <b className="mono">{shown}</b>
      {props.named && <span className="sub">{name}</span>}
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
  named?: boolean;
  className?: string;
}) {
  const rows = walletAmounts(props.state).filter(([id]) => !props.only || props.only.includes(id));
  return (
    <div className={`k-wallet ${props.className ?? ""}`} aria-label="Wallet">
      {rows.map(([id, amount]) => (
        <CurrencyChip
          key={id}
          id={id}
          amount={amount}
          named={props.named}
          gain={props.gains?.[id]}
        />
      ))}
      {props.extra?.map((e) => (
        <CurrencyChip key={e.id} id={e.id} amount={e.amount} named={props.named} />
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
          <CurrencyIcon id={p.id} size={20} />
          <b className="mono">{fmt(p.amount)}</b>
        </span>
      ))}
    </span>
  );
}
