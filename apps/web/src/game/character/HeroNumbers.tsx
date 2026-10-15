import {
  COMBAT,
  DEFENSE_NOTES,
  type DerivedStats,
  formatPercent,
  speedValue,
} from "@emberheir/sim";
import type { ReactNode } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { type NoteHover, useNoteHover } from "../../ui/ItemTooltip";
import { fmt } from "../../ui/items";

export const pct = (v: number) => `${formatPercent(v)} %`;

const DPS_NOTE: NoteHover = {
  name: "Damage per second",
  kind: "Offense",
  explain:
    "What you deal each second on average: weapon, Attack Speed, crits and your Battle Plan together. The best single number to compare builds.",
};
const LIFE_NOTE: NoteHover = {
  name: "Life",
  kind: "Defense",
  explain: "When it hits zero, the fight is lost. Barrier, if you have it, takes hits first.",
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

/** What the Attribute Points waiting for Confirm change, next to the Confirm button. */
export interface StatsBefore {
  readonly stats: DerivedStats;
  readonly dps: number;
}

/**
 * The Overview tab (ui-ux-plan-v1.md 4.2): the hero's key numbers with room to grow. Damage per
 * second on top, then Life as a bar, Defense and the four Resistances, one row each.
 */
export function HeroNumbers(props: {
  stats: DerivedStats;
  dps: number;
  weapon: { name: string; min: number; max: number };
  resNote: NoteHover;
}) {
  const { stats, weapon } = props;
  const res: Record<Element, number> = {
    fire: stats.fireResistance,
    cold: stats.coldResistance,
    lightning: stats.lightningResistance,
    void: stats.voidResistance,
  };
  return (
    <div className="hero-numbers">
      <Plaque className="hero-damage" label="Damage" note={DPS_NOTE}>
        <span className="hero-dps">
          <b className="mono">{fmt(props.dps)}</b>
          <span className="hero-unit">per Second</span>
        </span>
        <span className="hero-pills">
          <Pill icon="sword" label={weapon.name}>
            {fmt(weapon.min)}–{fmt(weapon.max)}
          </Pill>
          <Pill icon="cycle" label="Speed">
            {speedValue(stats.attackSpeed)}
          </Pill>
          <Pill icon="target" label="Crit">
            {pct(stats.critChance)}
          </Pill>
        </span>
      </Plaque>
      <Plaque className="hero-life" label="Life" note={LIFE_NOTE}>
        <LifeBar life={stats.maxLife} barrier={stats.barrier} />
      </Plaque>
      <Plaque className="hero-defense" label="Defense">
        <div className="hero-def-grid">
          <table className="hero-table">
            <tbody>
              <Row icon="armor" label="Armor" value={fmt(stats.armor)} note={DEFENSE_NOTES.armor} />
              <Row
                icon="shell"
                label="Barrier"
                value={fmt(stats.barrier)}
                note={DEFENSE_NOTES.barrier}
              />
            </tbody>
          </table>
          <table className="hero-table">
            <tbody>
              <Row
                icon="boots"
                label="Evasion"
                value={pct(stats.evasion)}
                note={DEFENSE_NOTES.evasion}
              />
              <Row
                icon="shield"
                label="Block"
                value={pct(stats.blockChance)}
                note={DEFENSE_NOTES.block}
              />
            </tbody>
          </table>
        </div>
      </Plaque>
      <Plaque className="hero-resist" label="Resistances">
        <div className="hero-res">
          {(Object.keys(res) as Element[]).map((el) => (
            <Res key={el} element={el} value={res[el]} note={props.resNote} />
          ))}
        </div>
      </Plaque>
    </div>
  );
}

/** One line under the Confirm button: what the pending points add. */
export function PendingGain(props: { stats: DerivedStats; dps: number; before: StatsBefore }) {
  const dps = Math.round(props.dps) - Math.round(props.before.dps);
  const life = Math.round(props.stats.maxLife) - Math.round(props.before.stats.maxLife);
  if (dps === 0 && life === 0) return null;
  return (
    <span className="pending-gain">
      {dps !== 0 && <Gain label="Damage/s" value={dps} />}
      {life !== 0 && <Gain label="Life" value={life} />}
    </span>
  );
}

function Gain(props: { label: string; value: number }) {
  return (
    <span className={props.value > 0 ? "up" : "down"}>
      {props.label}{" "}
      <b className="mono">{props.value > 0 ? `+${fmt(props.value)}` : fmt(props.value)}</b>
    </span>
  );
}

export function Plaque(props: {
  label: string;
  className: string;
  note?: NoteHover | undefined;
  /** Shown at the right end of the label line, e.g. the Ember Penalty. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const hover = useNoteHover(props.note);
  return (
    <div
      className={`hero-card ${props.className}`}
      tabIndex={props.note ? 0 : undefined}
      {...hover}
    >
      {props.aside ? (
        <span className="hero-card-top">
          <span className="hero-card-label">{props.label}</span>
          {props.aside}
        </span>
      ) : (
        <span className="hero-card-label">{props.label}</span>
      )}
      {props.children}
    </div>
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
 * Life as the Battle HUD draws it: a red bar, with Barrier as the blue layer in front that takes
 * hits first (its share of the bar is its share of Life plus Barrier).
 */
export function LifeBar(props: { life: number; barrier: number }) {
  const total = props.life + props.barrier;
  const share = total > 0 ? (props.barrier / total) * 100 : 0;
  return (
    <span className="life-meter">
      <span className="life-bar">
        <span className="life-bar-life" style={{ flexBasis: `${100 - share}%` }}>
          <b className="mono">{fmt(props.life)}</b>
        </span>
        {props.barrier > 0 && (
          <span className="life-bar-barrier" style={{ flexBasis: `${share}%` }}>
            <b className="mono">{fmt(props.barrier)}</b>
          </span>
        )}
      </span>
      {props.barrier > 0 && (
        <span className="life-bar-legend">
          <span className="life-bar-name">Life</span>
          <span className="life-bar-name life-bar-name-barrier">Barrier</span>
        </span>
      )}
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
export function Medal(props: { icon: IconName; label: string; value: string; note?: NoteHover }) {
  const hover = useNoteHover(props.note);
  return (
    <span className="hero-res-one res-brass" tabIndex={props.note ? 0 : undefined} {...hover}>
      <Icon name={props.icon} size={24} />
      <b className="mono">{props.value}</b>
      <span className="hero-res-name">{props.label}</span>
    </span>
  );
}
