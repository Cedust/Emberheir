import {
  type ActiveBoon,
  type BoonPick,
  type BoonSlot,
  type GameState,
  type RunState,
  BOONS,
  BOON_GRADES,
  EXCLUSIVE_BOON_SLOTS,
  boonScale,
  boonText,
  heroBoons,
} from "@emberheir/sim";
import { GAME_DATA } from "@emberheir/content";
import { useEffect } from "react";
import { Icon, type IconName } from "../ui/Icon";
import { playSound } from "../ui/sound";
import type { GameApi } from "./useGame";

/** Stolen Fire Boons (Spielspaß Teil 1): the Ember Shrine pick and the Boon bar. */

const SLOT_ICON: Record<BoonSlot, IconName> = {
  strike: "strike",
  skill: "flurry",
  reaction: "shell",
  heat: "flame",
  trigger: "bolt",
  passive: "shield",
};

const SLOT_NAME: Record<BoonSlot, string> = {
  strike: "Strike",
  skill: "Skill",
  reaction: "Reaction",
  heat: "Heat",
  trigger: "Trigger",
  passive: "Passive",
};

const ROMAN = ["", "I", "II", "III"];

const boonDef = (id: string) => GAME_DATA.boons?.find((b) => b.id === id);
const familyOf = (id: string | undefined) => GAME_DATA.boonFamilies?.find((f) => f.id === id);

function Pips(props: { rank: number; old: number }) {
  return (
    <span className="boon-pips" aria-label={`Rank ${ROMAN[props.rank]}`}>
      {Array.from({ length: BOONS.maxRank }, (_, i) => (
        <span key={i} className={i < props.old ? "on" : i < props.rank ? "on new" : ""} />
      ))}
    </span>
  );
}

function ShrineCard(props: { pick: BoonPick; active: readonly ActiveBoon[]; onPick: () => void }) {
  const def = boonDef(props.pick.id);
  if (!def) return null;
  const family = familyOf(def.family);
  const owned = props.active.find((b) => b.def.id === def.id);
  const rank = Math.min(BOONS.maxRank, (owned?.rank ?? 0) + 1);
  const replaces = owned
    ? undefined
    : props.active.find((b) => b.def.slot === def.slot && EXCLUSIVE_BOON_SLOTS.includes(def.slot));
  const grade =
    owned && BOON_GRADES.indexOf(owned.grade) > BOON_GRADES.indexOf(props.pick.grade)
      ? owned.grade
      : props.pick.grade;
  const fusion = def.fusion?.map((f) => familyOf(f)?.color ?? "#999");
  return (
    <button
      type="button"
      className={`boon-card panel-card grade-${props.pick.grade}${def.fusion ? " fusion" : ""}`}
      style={
        {
          "--boon": family?.color ?? "#c9a063",
          "--boon2": fusion?.[1] ?? family?.color ?? "#c9a063",
        } as React.CSSProperties
      }
      data-testid={`boon-${def.id}`}
      onClick={props.onPick}
    >
      <span className="boon-family sub">
        {def.fusion ? "Fusion" : family?.name}
        {props.pick.grade !== "spark" && <em> · {props.pick.grade}</em>}
      </span>
      <span className="boon-sigil">
        <Icon name={SLOT_ICON[def.slot]} size={34} color="#fff6e4" />
      </span>
      <strong className="title-font">{def.name}</strong>
      <span className="boon-text">{boonText(def, boonScale(rank, grade))}</span>
      <span className="boon-foot sub">
        <span>{SLOT_NAME[def.slot]}</span>
        <Pips rank={rank} old={owned?.rank ?? 0} />
      </span>
      {replaces && <span className="boon-replaces sub">replaces {replaces.def.name}</span>}
    </button>
  );
}

export function ShrineCards(props: { state: GameState; run: RunState; game: GameApi }) {
  const offer = props.run.rewards?.boonOffer ?? [];
  const active = heroBoons(props.state, GAME_DATA);
  const best = offer.some((p) => p.grade === "blaze")
    ? "blaze"
    : offer.some((p) => p.grade === "flame")
      ? "flame"
      : "spark";
  useEffect(() => {
    if (best === "blaze") playSound("legendary");
    else if (best === "flame") playSound("rare");
    else playSound("flip");
  }, [best]);
  return (
    <div className={`boon-cards${best === "blaze" ? " blaze" : ""}`} data-testid="shrine">
      {offer.map((pick, i) => (
        <ShrineCard
          key={pick.id}
          pick={pick}
          active={active}
          onPick={() => props.game.dispatch({ type: "pickBoon", index: i })}
        />
      ))}
    </div>
  );
}

/** The hero's Boons as small sigils; a Boon flashes when it fires (`flash` = Boon names). */
export function BoonBar(props: {
  state: GameState;
  flash?: ReadonlySet<string>;
  className?: string;
}) {
  const active = heroBoons(props.state, GAME_DATA);
  if (!active.length) return null;
  const fresh = new Set(props.state.boons.fresh.map((p) => p.id));
  const kept = new Set(props.state.boons.kept.map((p) => p.id));
  return (
    <div className={`boon-bar ${props.className ?? ""}`} data-testid="boon-bar">
      {active.map((b) => (
        <span
          key={b.def.id}
          className="boon-chip"
          title={`${b.def.name} ${ROMAN[b.rank]} · ${boonText(b.def, b.scale)}`}
          style={{ "--boon": familyOf(b.def.family)?.color ?? "#c9a063" } as React.CSSProperties}
        >
          <span
            className={`boon-sigil small${props.flash?.has(b.def.name) ? " flash" : ""}${fresh.has(b.def.id) && !kept.has(b.def.id) ? " fresh" : ""}`}
          >
            <Icon name={SLOT_ICON[b.def.slot]} size={14} color="#fff6e4" />
          </span>
          {b.rank > 1 && <i>{ROMAN[b.rank]}</i>}
        </span>
      ))}
    </div>
  );
}
