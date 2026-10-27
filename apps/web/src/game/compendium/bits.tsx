import type { Attribute } from "@emberheir/sim";
import type { ReactNode } from "react";
import { useNoteHover } from "../../ui/ItemTooltip";
import { CURRENCIES, type CurrencyId, CurrencyIcon } from "../../ui/kit/Currency";
import {
  ENEMY_TYPE_ICONS,
  type EnemyTypeIcon,
  GAME_ICONS,
  type GameIconId,
} from "../../ui/gameIcons";
import { RuneStone, runeName } from "../../ui/RuneArt";
import { ATTRIBUTE_ICONS, ATTRIBUTE_INFO } from "../AttributeStones";

/**
 * Small pieces the Compendium pages are written with: painted icons inside the text, and rows of
 * "icon, name, a line about it".
 */

const NAMES: Partial<Record<GameIconId, string>> = {
  "ailment-effect": "Ailment Effect",
  "heat-gain": "Heat Gain",
  "heat-per-hit": "Heat per Hit",
  "heat-from-hits": "Heat from Hits Taken",
  trigger: "Trigger Chance",
  speed: "Attack Speed",
  crit: "Crit Chance",
  elemental: "Elemental Damage",
  flask: "Ember Flask",
};

const nameOf = (id: GameIconId) => NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1);

/** An icon in a line of text, then its word. */
function Inline(props: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="cp-term">
      {props.icon}
      <b>{props.children}</b>
    </span>
  );
}

const img = (src: string, size = 22) => (
  <img className="cp-ico" src={src} width={size} height={size} alt="" draggable={false} />
);

/** A stat, element, ailment or Heat word with its painted icon. */
export function S(props: { id: GameIconId; children?: ReactNode }) {
  return <Inline icon={img(GAME_ICONS[props.id])}>{props.children ?? nameOf(props.id)}</Inline>;
}

/** A currency with its painted icon; the hover says what it buys. */
export function C(props: { id: CurrencyId; children?: ReactNode }) {
  const def = CURRENCIES[props.id];
  const hover = useNoteHover({ name: def.name, kind: def.kind, explain: def.explain });
  return (
    <span className="cp-term" {...hover}>
      <CurrencyIcon id={props.id} size={22} />
      <b>{props.children ?? def.name}</b>
    </span>
  );
}

/** An attribute with its painted stone. */
export function A(props: { id: Attribute }) {
  return <Inline icon={img(ATTRIBUTE_ICONS[props.id])}>{ATTRIBUTE_INFO[props.id].name}</Inline>;
}

/** A Rune with its painted stone. */
export function R(props: { id: string }) {
  return <Inline icon={<RuneStone runeId={props.id} size={22} />}>{runeName(props.id)}</Inline>;
}

/** A game word in bold, without an icon. */
export function B(props: { children: ReactNode }) {
  return <b className="cp-word">{props.children}</b>;
}

export interface Fact {
  readonly icon: ReactNode;
  readonly name: ReactNode;
  readonly text: ReactNode;
}

/** A list of things side by side: big painted icon, name, one or two lines. */
export function Facts(props: { rows: readonly Fact[]; wide?: boolean }) {
  return (
    <ul className={`cp-facts${props.wide ? " wide" : ""}`}>
      {props.rows.map((r, i) => (
        <li key={i}>
          <span className="cp-fact-icon">{r.icon}</span>
          <span className="cp-fact-text">
            <b className="cp-fact-name">{r.name}</b>
            <span>{r.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Painted icon sized for a Facts row. */
export const big = (src: string | undefined) =>
  src ? <img src={src} width={44} height={44} alt="" draggable={false} /> : null;

export const statIcon = (id: GameIconId) => big(GAME_ICONS[id]);
export const currencyIcon = (id: CurrencyId) => <CurrencyIcon id={id} size={44} />;
export const attributeIcon = (id: Attribute) => big(ATTRIBUTE_ICONS[id]);
export const enemyIcon = (id: EnemyTypeIcon) => big(ENEMY_TYPE_ICONS[id]);

/** Old Nan's word at the end of a page. */
export function Nan(props: { children: ReactNode }) {
  return <p className="cp-nan">“{props.children}”</p>;
}
