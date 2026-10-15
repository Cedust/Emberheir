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

/**
 * The Overview tab (ui-ux-plan-v1.md 4.2): the hero's key numbers with room to grow, one row each:
 * Damage per Second, Defense (Armor, Life, Barrier) and the four Resistances.
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
      <Plaque className="hero-vitals" label="Defense">
        <Vitals life={stats.maxLife} barrier={stats.barrier} armor={stats.armor} />
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
 * Armor as a riveted steel plate in front of Life as the Battle HUD draws it: a red bar, with
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
      <span className="armor-plate" tabIndex={0} {...armor}>
        <Icon name="armor" size={18} />
        <b className="mono">{fmt(props.armor)}</b>
      </span>
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
      <span className="vitals-name vitals-armor">Armor</span>
      <span className="vitals-names">
        <span className="vitals-name vitals-life">Life</span>
        {props.barrier > 0 && <span className="vitals-name vitals-barrier">Barrier</span>}
      </span>
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
