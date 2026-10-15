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

const pct = (v: number) => `${formatPercent(v)} %`;

const DPS_NOTE: NoteHover = {
  name: "Damage per second",
  kind: "Offense · estimate",
  explain:
    "What you deal each second on average: weapon, Attack Speed, crits and your Battle Plan together. The best single number to compare builds.",
};
const LIFE_NOTE: NoteHover = {
  name: "Life",
  kind: "Defense",
  explain: "When it hits zero, the fight is lost. Barrier, if you have it, takes hits first.",
};
const RES_NAMES = {
  fire: "Fire",
  cold: "Cold",
  lightning: "Lightning",
  void: "Void",
} as const;
type Element = keyof typeof RES_NAMES;
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
 * second on top, Life as an orb next to Defense, the four Resistances in their colours.
 */
export function HeroNumbers(props: {
  stats: DerivedStats;
  dps: number;
  weapon: { name: string; min: number; max: number };
  before?: StatsBefore | undefined;
  resNote: NoteHover;
}) {
  const { stats, before, weapon } = props;
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
          <span className="hero-unit">per second</span>
          <Delta now={props.dps} was={before?.dps} />
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
        <LifeOrb life={stats.maxLife} barrier={stats.barrier} />
        <Delta now={stats.maxLife} was={before?.stats.maxLife} />
      </Plaque>
      <Plaque className="hero-defense" label="Defense">
        <table className="hero-table">
          <tbody>
            <Row icon="armor" label="Armor" value={fmt(stats.armor)} note={DEFENSE_NOTES.armor} />
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
            <Row
              icon="shell"
              label="Barrier"
              value={fmt(stats.barrier)}
              note={DEFENSE_NOTES.barrier}
            />
          </tbody>
        </table>
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

function Plaque(props: {
  label: string;
  className: string;
  note?: NoteHover;
  children: ReactNode;
}) {
  const hover = useNoteHover(props.note);
  return (
    <div
      className={`hero-card ${props.className}`}
      tabIndex={props.note ? 0 : undefined}
      {...hover}
    >
      <span className="hero-card-label">{props.label}</span>
      {props.children}
    </div>
  );
}

function Pill(props: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <span className="hero-pill">
      <Icon name={props.icon} size={14} />
      <span>{props.label}</span>
      <b className="mono">{props.children}</b>
    </span>
  );
}

/** Diablo's life globe: the number in a red orb, Barrier as a blue ring around it. */
function LifeOrb(props: { life: number; barrier: number }) {
  return (
    <span className={`life-orb${props.barrier > 0 ? " has-barrier" : ""}`}>
      <span className="life-orb-glass" aria-hidden="true" />
      <b className="mono">{fmt(props.life)}</b>
    </span>
  );
}

function Row(props: { icon: IconName; label: string; value: string; note: NoteHover }) {
  const hover = useNoteHover(props.note);
  return (
    <tr tabIndex={0} {...hover}>
      <td className="hero-table-icon">
        <Icon name={props.icon} size={16} />
      </td>
      <th scope="row">{props.label}</th>
      <td className="mono">{props.value}</td>
    </tr>
  );
}

function Res(props: { element: Element; value: number; note: NoteHover }) {
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

function Delta(props: { now: number; was: number | undefined }) {
  if (props.was === undefined) return null;
  const d = Math.round(props.now) - Math.round(props.was);
  if (d === 0) return null;
  return (
    <span className={`hero-delta ${d > 0 ? "up" : "down"}`}>{d > 0 ? `+${fmt(d)}` : fmt(d)}</span>
  );
}
