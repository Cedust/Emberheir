import { MAX_WEAPON_RANK, WEAPON_GRADES } from "@emberheir/sim";
import type { CSSProperties, ReactNode } from "react";
import { MASTERY_ART } from "../game/camp/masteryArtData";
import { GameIcon, type GameIconId, HEAT_FORM_ICONS } from "./gameIcons";
import { Icon } from "./Icon";
import { GRADE_COLOR, type WeaponTip } from "./weaponTip";

/**
 * The Heirloom weapon's tooltip, in the item tooltip's plate: the painted weapon (its Keystone
 * form) lies across a forge glowing in the grade's colour, the Rank on a brass plaque; below the
 * name the Rank gauge, Damage, Speed and Precision as big numbers, then what the Heirloom made
 * of it: path, Heat Form, Innate, Keystone and Echo.
 */

/** Timo's painted weapons (art/mastery), one per weapon and Keystone form, plus the gem. */
const PAINTINGS = import.meta.glob<string>("../assets/mastery/*.webp", {
  eager: true,
  import: "default",
});

const ELEMENT_GLOW: Readonly<Record<string, string>> = {
  fire: "#ff6a2a",
  cold: "#8ec8f0",
  lightning: "#ffe066",
  void: "#a070e0",
  physical: "#e0b45a",
};

const TYPE_NAMES: Readonly<Record<string, string>> = {
  physical: "Physical",
  fire: "Fire",
  cold: "Cold",
  lightning: "Lightning",
  void: "Void",
};

const AILMENT_NAMES: Readonly<Record<string, string>> = {
  bleed: "Bleed",
  poison: "Poison",
  burn: "Burn",
  chill: "Chill",
  shock: "Shock",
  corruption: "Corruption",
  stun: "Stun",
};

const HEAT_FORM_NAMES = {
  steady: "Steady",
  cooling: "Cooling",
  warming: "Warming",
  smoldering: "Smoldering",
} as const;

const HEAT_FORM_TEXT = {
  steady: "Hits fill Heat. It never cools down.",
  cooling: "Hits fill Heat, and it cools all the time.",
  warming: "Heat fills by itself every second.",
  smoldering: "Heat comes mostly from hits you take.",
} as const;

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
/** Widest painting, and the height its tilted box may take in the banner (stage pixels). */
const PAINTING_W = 318;
const PAINTING_H = 90;
const TILT = (7 * Math.PI) / 180;

/** Width that keeps a tilted painting of this shape inside the banner (Axe, Crossbow are bulky). */
function paintingWidth(weaponId: string, form: string): number {
  const art = MASTERY_ART[weaponId]?.[form] ?? MASTERY_ART[weaponId]?.plain;
  if (!art) return PAINTING_W;
  const height = Math.sin(TILT) + (Math.cos(TILT) * art.h) / art.w;
  return Math.min(PAINTING_W, Math.floor(PAINTING_H / height));
}

const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;
const pct = (v: number) => `${Math.round(v * 100)} %`;

/** The painting of the weapon's form, with the Wand's or Staff's gem lit in its element. */
function WeaponPainting(props: { tip: WeaponTip }) {
  const { tip } = props;
  const form = tip.keystoneId ?? "plain";
  const url =
    PAINTINGS[`../assets/mastery/${tip.weaponId}-${form}.webp`] ??
    PAINTINGS[`../assets/mastery/${tip.weaponId}-plain.webp`];
  const gemForm = PAINTINGS[`../assets/mastery/${tip.weaponId}-${form}-gem.webp`] ? form : "plain";
  const gem = PAINTINGS[`../assets/mastery/${tip.weaponId}-${gemForm}-gem.webp`];
  if (!url) return null;
  const shown = PAINTINGS[`../assets/mastery/${tip.weaponId}-${form}.webp`] ? form : "plain";
  return (
    <span className="wt-painting" style={{ width: paintingWidth(tip.weaponId, shown) }}>
      <img src={url} alt="" draggable={false} />
      {gem && (
        <>
          <img src={gem} alt="" draggable={false} />
          <span
            className="wt-gem"
            style={{ maskImage: `url(${gem})`, WebkitMaskImage: `url(${gem})` }}
          />
        </>
      )}
    </span>
  );
}

/** One thing the Heirloom gives the weapon: an icon, a small label, its name and rule. */
function Feature(props: {
  icon: ReactNode;
  label: string;
  name: string;
  text?: string | undefined;
  tone?: string | undefined;
  className?: string;
}) {
  return (
    <div
      className={`wt-feature ${props.className ?? ""}`}
      style={props.tone ? ({ "--tone": props.tone } as CSSProperties) : undefined}
    >
      <span className="wt-feature-icon">{props.icon}</span>
      <span className="wt-feature-body">
        <span className="wt-feature-head">
          <span className="wt-feature-label">{props.label}</span>
          <b className="wt-feature-name">{props.name}</b>
        </span>
        {props.text && <span className="wt-feature-text">{props.text}</span>}
      </span>
    </div>
  );
}

export function WeaponTooltipCard(props: { tip: WeaponTip; tag?: string }) {
  const { tip } = props;
  const color = GRADE_COLOR[tip.grade] ?? GRADE_COLOR[0];
  const glow = ELEMENT_GLOW[tip.damage.type] ?? "#ff6a2a";
  const typeName = TYPE_NAMES[tip.damage.type] ?? tip.damage.type;
  const foot = [
    tip.nextGrade ? `${tip.nextGrade.name} at Rank ${tip.nextGrade.rank}` : "Highest grade",
    ...(tip.pointsLeft
      ? [`${tip.pointsLeft} Heirloom ${tip.pointsLeft === 1 ? "Point" : "Points"} to spend`]
      : []),
  ];
  return (
    <div
      className={`item-tooltip item-tip weapon-tip grade-${tip.grade}`}
      style={{ "--tip-name": color, "--gem": glow } as CSSProperties}
      data-testid="weapon-tooltip"
    >
      {props.tag && <span className="tip-tag">{props.tag}</span>}
      <div className="wt-banner">
        <span className="wt-forge" />
        <WeaponPainting tip={tip} />
        <span className="wt-rank">
          Rank <b>{tip.rank}</b>
        </span>
      </div>
      <div className="wt-title">
        <span className="ib-name">{tip.name}</span>
        <span className="ib-kind-row">
          <span className="ib-kind">
            Heirloom {tip.baseName} · {tip.melee ? "Melee" : "Ranged"}
          </span>
          <span className="wt-grade">{tip.gradeName}</span>
        </span>
        <span className="wt-gauge" aria-hidden="true">
          {Array.from({ length: MAX_WEAPON_RANK }, (_, i) => {
            const g = WEAPON_GRADES.filter((w) => i + 1 >= w.from).length - 1;
            return (
              <i
                key={i}
                className={i < tip.rank ? "on" : ""}
                style={i < tip.rank ? { background: GRADE_COLOR[g] } : undefined}
              />
            );
          })}
        </span>
      </div>
      <div className="wt-stats">
        <span className="wt-stat">
          <GameIcon id={tip.damage.type as GameIconId} size={28} />
          <b className="ib-big-value">
            {fmt(tip.damage.min)}–{fmt(tip.damage.max)}
          </b>
          <span className="ib-big-label">{typeName} Damage</span>
        </span>
        <span className="wt-stat">
          <GameIcon id="speed" size={28} />
          <b className="ib-big-value">{tip.speed}</b>
          <span className="ib-big-label">Speed</span>
        </span>
        <span className="wt-stat">
          <span className="wt-stat-icon">
            <Icon name="target" size={22} />
          </span>
          <b className="ib-big-value">{pct(tip.precision)}</b>
          <span className="ib-big-label">Precision</span>
        </span>
      </div>
      <span className="wt-range">
        Damage Range {pct(tip.rangeMin)} – {pct(tip.rangeMax)}
      </span>
      <div className="wt-features">
        {tip.path && (
          <Feature
            className="wt-path"
            tone={hex(tip.path.color)}
            icon={
              <span className="wt-path-icons">
                <GameIcon id={tip.path.damageType as GameIconId} size={22} />
                <GameIcon id={tip.path.ailment as GameIconId} size={22} />
              </span>
            }
            label="Path"
            name={tip.path.name}
            text={`${TYPE_NAMES[tip.path.damageType] ?? tip.path.damageType} · ${
              AILMENT_NAMES[tip.path.ailment] ?? tip.path.ailment
            }`}
          />
        )}
        <Feature
          icon={<img src={HEAT_FORM_ICONS[tip.heatForm]} width={30} height={30} alt="" />}
          label="Heat Form"
          name={HEAT_FORM_NAMES[tip.heatForm]}
          text={HEAT_FORM_TEXT[tip.heatForm]}
        />
        {tip.innate && (
          <Feature
            className="wt-innate"
            icon={<GameIcon id="heat" size={28} />}
            label={`Innate · Lv ${tip.innate.level}`}
            name={tip.innate.name}
            text={tip.innate.text}
          />
        )}
        {tip.keystone && (
          <Feature
            className="wt-keystone"
            icon={<span className="wt-keystone-gem" />}
            label="Keystone"
            name={tip.keystone.name}
            text={tip.keystone.text}
          />
        )}
        {tip.echo && (
          <Feature
            className="wt-echo"
            tone={hex(tip.echo.color)}
            icon={<span className="wt-echo-orb" />}
            label={`Echo ${tip.echo.stage}`}
            name={tip.echo.name}
            text={tip.echo.text}
          />
        )}
      </div>
      {tip.lines.length > 0 && (
        <ul className="ib-lines ib-implicit">
          {tip.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {tip.triggers.length > 0 && (
        <ul className="ib-lines ib-triggers">
          {tip.triggers.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      <div className="ib-foot wt-foot">{foot.join(" · ")}</div>
    </div>
  );
}
