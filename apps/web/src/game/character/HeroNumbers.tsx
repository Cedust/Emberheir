import { DEFENSE_NOTES, type DerivedStats, formatPercent } from "@emberheir/sim";
import type { ReactNode } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { type NoteHover, useNoteHover } from "../../ui/ItemTooltip";
import { fmt } from "../../ui/items";

const pct = (v: number) => `${formatPercent(v)} %`;

const DPS_NOTE: NoteHover = {
  name: "Damage per second",
  kind: "Offense · estimate",
  explain: "About how much damage you deal each second, with crits and your Battle Plan.",
};
const LIFE_NOTE: NoteHover = {
  name: "Life",
  kind: "Defense",
  explain: "When it hits zero, the fight is lost. Barrier, if you have it, takes hits first.",
};

/**
 * The four big numbers under the hero (ui-ux-plan-v1.md 4.2): Damage/s, Life, Defense and
 * Resistances. While Attribute Points wait for Confirm, the change shows next to them.
 */
export function HeroNumbers(props: {
  stats: DerivedStats;
  dps: number;
  /** Stats without the pending Attribute Points, when there are any. */
  before?: { stats: DerivedStats; dps: number } | undefined;
  resNote: NoteHover;
}) {
  const { stats, before } = props;
  return (
    <div className="hero-numbers">
      <Card label="Damage/s" note={DPS_NOTE}>
        <b className="hero-big mono">{fmt(props.dps)}</b>
        <Delta now={props.dps} was={before?.dps} />
      </Card>
      <Card label="Life" note={LIFE_NOTE}>
        <b className="hero-big mono">{fmt(stats.maxLife)}</b>
        <Delta now={stats.maxLife} was={before?.stats.maxLife} />
        {stats.barrier > 0 && <Mini icon="shell" text={`Barrier ${fmt(stats.barrier)}`} />}
      </Card>
      <Card label="Defense">
        <Mini icon="armor" text={`Armor ${fmt(stats.armor)}`} note={DEFENSE_NOTES.armor} />
        <Mini icon="boots" text={`Evasion ${pct(stats.evasion)}`} note={DEFENSE_NOTES.evasion} />
        <Mini icon="shield" text={`Block ${pct(stats.blockChance)}`} note={DEFENSE_NOTES.block} />
      </Card>
      <Card label="Resistances" note={props.resNote}>
        <div className="hero-res">
          <Res tone="fire" icon="fire" value={stats.fireResistance} />
          <Res tone="cold" icon="snow" value={stats.coldResistance} />
          <Res tone="lightning" icon="bolt" value={stats.lightningResistance} />
          <Res tone="void" icon="void" value={stats.voidResistance} />
        </div>
      </Card>
    </div>
  );
}

function Card(props: { label: string; note?: NoteHover; children: ReactNode }) {
  const hover = useNoteHover(props.note);
  return (
    <div className="hero-card" tabIndex={props.note ? 0 : undefined} {...hover}>
      <span className="hero-card-label">{props.label}</span>
      {props.children}
    </div>
  );
}

function Mini(props: { icon: IconName; text: string; note?: NoteHover }) {
  const hover = useNoteHover(props.note);
  return (
    <span className="hero-mini" tabIndex={props.note ? 0 : undefined} {...hover}>
      <Icon name={props.icon} size={14} />
      {props.text}
    </span>
  );
}

function Res(props: { tone: string; icon: IconName; value: number }) {
  return (
    <span className={`hero-res-one tone-${props.tone}`}>
      <Icon name={props.icon} size={15} />
      <span className="mono">{formatPercent(props.value)}</span>
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
