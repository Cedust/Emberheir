import { COMBAT, DEFENSE_NOTES, type DerivedStats, formatPercent } from "@emberheir/sim";
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
  fire: "Fire Resistance",
  cold: "Cold Resistance",
  lightning: "Lightning Resistance",
  void: "Void Resistance",
} as const;

/**
 * The four big numbers under the hero (ui-ux-plan-v1.md 4.2): Damage/s, Life as an orb,
 * Defense and Resistances. While Attribute Points wait for Confirm, the change shows in green.
 */
export function HeroNumbers(props: {
  stats: DerivedStats;
  dps: number;
  weapon: { name: string; min: number; max: number };
  /** Stats without the pending Attribute Points, when there are any. */
  before?: { stats: DerivedStats; dps: number } | undefined;
  resNote: NoteHover;
}) {
  const { stats, before, weapon } = props;
  const res = {
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
        </span>
        <Delta now={props.dps} was={before?.dps} />
        <span className="hero-hit">
          <Icon name="sword" size={13} />
          {weapon.name} {Math.round(weapon.min)}–{Math.round(weapon.max)}
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
          </tbody>
        </table>
      </Plaque>
      <Plaque className="hero-resist" label="Resistances">
        <div className="hero-res">
          {(Object.keys(res) as (keyof typeof res)[]).map((el) => (
            <Res key={el} element={el} value={res[el]} note={props.resNote} />
          ))}
        </div>
      </Plaque>
    </div>
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

/** Diablo's life globe: the number in a red orb, Barrier as a blue ring around it. */
function LifeOrb(props: { life: number; barrier: number }) {
  return (
    <span className={`life-orb${props.barrier > 0 ? " has-barrier" : ""}`}>
      <span className="life-orb-glass" aria-hidden="true" />
      <b className="mono">{fmt(props.life)}</b>
      {props.barrier > 0 && <span className="life-orb-barrier mono">+{fmt(props.barrier)}</span>}
    </span>
  );
}

function Row(props: { icon: IconName; label: string; value: string; note: NoteHover }) {
  const hover = useNoteHover(props.note);
  return (
    <tr tabIndex={0} {...hover}>
      <td className="hero-table-icon">
        <Icon name={props.icon} size={15} />
      </td>
      <th scope="row">{props.label}</th>
      <td className="mono">{props.value}</td>
    </tr>
  );
}

const RES_ICON: Record<keyof typeof RES_NAMES, IconName> = {
  fire: "fire",
  cold: "snow",
  lightning: "bolt",
  void: "void",
};

function Res(props: { element: keyof typeof RES_NAMES; value: number; note: NoteHover }) {
  const hover = useNoteHover({ ...props.note, name: RES_NAMES[props.element] });
  const capped = props.value >= COMBAT.maxResistance;
  return (
    <span
      className={`hero-res-one res-${props.element}${capped ? " capped" : ""}`}
      tabIndex={0}
      {...hover}
    >
      <Icon name={RES_ICON[props.element]} size={17} />
      <span className="mono">{pct(props.value)}</span>
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
