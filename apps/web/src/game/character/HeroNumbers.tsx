import { COMBAT, DEFENSE_NOTES, formatPercent } from "@emberheir/sim";
import type { ReactNode } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { type NoteHover, useNoteHover } from "../../ui/ItemTooltip";
import { fmt } from "../../ui/items";
import { MAX_PINS, type PanelId, usePinContext } from "./pins";

export const pct = (v: number) => `${formatPercent(v)} %`;

const LIFE_NOTE: NoteHover = {
  name: "Life",
  kind: "Defense",
  explain: "When it hits zero, the fight is lost.",
};
export const RES_NAMES = {
  fire: "Fire",
  cold: "Cold",
  lightning: "Lightning",
  void: "Void",
} as const;
export type Element = keyof typeof RES_NAMES;
const RES_ICON: Record<Element, IconName> = {
  fire: "fire",
  cold: "snow",
  lightning: "bolt",
  void: "void",
};

export function Plaque(props: {
  label: string;
  className: string;
  note?: NoteHover | undefined;
  /** Shown at the right end of the label line, e.g. the Ember Penalty. */
  aside?: ReactNode;
  /** The panel's id: a star pins it to the Overview. */
  pin?: PanelId;
  children: ReactNode;
}) {
  const hover = useNoteHover(props.note);
  const star = props.pin && <PinStar id={props.pin} />;
  return (
    <div
      className={`hero-card ${props.className}`}
      tabIndex={props.note ? 0 : undefined}
      {...hover}
    >
      {props.aside || star ? (
        <span className="hero-card-top">
          <span className="hero-card-label">{props.label}</span>
          <span className="hero-card-aside">
            {props.aside}
            {star}
          </span>
        </span>
      ) : (
        <span className="hero-card-label">{props.label}</span>
      )}
      {props.children}
    </div>
  );
}

/** Pins a panel to the Overview, up to three. */
function PinStar(props: { id: PanelId }) {
  const pins = usePinContext();
  const on = !!pins?.pinned.includes(props.id);
  const full = !on && (pins?.pinned.length ?? 0) >= MAX_PINS;
  const hover = useNoteHover(
    full
      ? { name: "Overview", kind: "", explain: "", status: `Up to ${MAX_PINS}` }
      : { name: on ? "Unpin from Overview" : "Pin to Overview", kind: "", explain: "" },
  );
  if (!pins) return null;
  return (
    <button
      type="button"
      className={`pin-star${on ? " on" : ""}`}
      aria-label={on ? "Unpin from Overview" : "Pin to Overview"}
      aria-pressed={on}
      aria-disabled={full || undefined}
      onClick={full ? undefined : () => pins.toggle(props.id)}
      {...hover}
    >
      <Icon name="star" size={16} />
    </button>
  );
}

export function Pill(props: {
  icon: IconName;
  label: string;
  note?: NoteHover;
  children?: ReactNode;
}) {
  const hover = useNoteHover(props.note);
  return (
    <span className="hero-pill" tabIndex={props.note ? 0 : undefined} {...hover}>
      <Icon name={props.icon} size={14} />
      <span>{props.label}</span>
      {props.children !== undefined && <b className="mono">{props.children}</b>}
    </span>
  );
}

/**
 * Life as the Battle HUD draws it, with Armor as a riveted steel plate below: a red bar, with
 * Barrier as the blue layer that takes hits first (its share of the bar is its share of Life plus
 * Barrier).
 */
export function Vitals(props: { life: number; barrier: number; armor: number }) {
  const total = props.life + props.barrier;
  const share = total > 0 ? (props.barrier / total) * 100 : 0;
  const armor = useNoteHover(DEFENSE_NOTES.armor);
  const life = useNoteHover(LIFE_NOTE);
  const barrier = useNoteHover(DEFENSE_NOTES.barrier);
  return (
    <span className="vitals">
      <span className="life-bar">
        <span
          className="life-bar-life"
          style={{ flexBasis: `${100 - share}%` }}
          tabIndex={0}
          {...life}
        >
          <b className="mono">{fmt(props.life)}</b>
        </span>
        {props.barrier > 0 && (
          <span
            className="life-bar-barrier"
            style={{ flexBasis: `${share}%` }}
            tabIndex={0}
            {...barrier}
          >
            <b className="mono">{fmt(props.barrier)}</b>
          </span>
        )}
      </span>
      <span className="vitals-names">
        <span className="vitals-name vitals-life">Life</span>
        {props.barrier > 0 && <span className="vitals-name vitals-barrier">Barrier</span>}
      </span>
      <span className="armor-plate" tabIndex={0} {...armor}>
        <Icon name="armor" size={18} />
        <b className="mono">{fmt(props.armor)}</b>
      </span>
      <span className="vitals-name vitals-armor">Armor</span>
    </span>
  );
}

export function Row(props: {
  icon: IconName;
  label: string;
  value: string;
  note?: NoteHover | undefined;
}) {
  const hover = useNoteHover(props.note);
  return (
    <tr tabIndex={props.note ? 0 : undefined} {...hover}>
      <td className="hero-table-icon">
        <Icon name={props.icon} size={16} />
      </td>
      <th scope="row">{props.label}</th>
      <td className="mono">{props.value}</td>
    </tr>
  );
}

export function Res(props: { element: Element; value: number; note: NoteHover }) {
  const hover = useNoteHover({ ...props.note, name: `${RES_NAMES[props.element]} Resistance` });
  const capped = props.value >= COMBAT.maxResistance;
  return (
    <span
      className={`hero-res-one res-${props.element}${capped ? " capped" : ""}`}
      tabIndex={0}
      {...hover}
    >
      <Icon name={RES_ICON[props.element]} size={24} />
      <b className="mono">{pct(props.value)}</b>
      <span className="hero-res-name">{RES_NAMES[props.element]}</span>
    </span>
  );
}

/** A big number in a framed chip, like a Resistance but in brass. */
export function Medal(props: {
  icon: IconName;
  label: string;
  value: string;
  note?: NoteHover;
  /** Colour of the chip, e.g. "fire" or "bleed" (brass by default). */
  tone?: string;
}) {
  const hover = useNoteHover(props.note);
  return (
    <span
      className={`hero-res-one res-${props.tone ?? "brass"}`}
      tabIndex={props.note ? 0 : undefined}
      {...hover}
    >
      <Icon name={props.icon} size={24} />
      <b className="mono">{props.value}</b>
      <span className="hero-res-name">{props.label}</span>
    </span>
  );
}
