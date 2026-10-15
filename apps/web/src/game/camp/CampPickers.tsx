import { GAME_DATA } from "@emberheir/content";
import {
  type DraughtDefinition,
  type GameState,
  type Item,
  applyAction,
  DRAUGHT_FLASK_COST,
  minPeril,
  type OmenDefinition,
  omenPeril,
  perilReward,
  wildfireLevel,
  wildfireName,
} from "@emberheir/sim";
import { Icon } from "../../ui/Icon";
import { fmt, rarityClass } from "../../ui/items";
import { useItemHover, useNoteHover } from "../../ui/ItemTooltip";
import { type BountyView, bountyView } from "../bounty";

/** The Camp's choices before setting out: the Draught, the Wildfire tier, the Scout's bounty. */

/**
 * Draughts (balance-grundlagen-v1.md F): one vial per Draught; the chosen one is brewed from a
 * Flask charge at every set-out. Clicking it again pours it back (no Draught).
 */
export function DraughtPicker(props: {
  chosen: string | null;
  onPick: (id: string | null) => void;
}) {
  return (
    <div className="draught-picker" role="group" aria-label="Draught">
      <span className="draught-label sub">Draught</span>
      {(GAME_DATA.draughts ?? []).map((d) => (
        <DraughtVial
          key={d.id}
          draught={d}
          on={props.chosen === d.id}
          onPick={() => props.onPick(props.chosen === d.id ? null : d.id)}
        />
      ))}
    </div>
  );
}

function DraughtVial(props: { draught: DraughtDefinition; on: boolean; onPick: () => void }) {
  const d = props.draught;
  const hover = useNoteHover({
    name: d.name,
    kind: `Draught · ${DRAUGHT_FLASK_COST} Flask charge · until the Camp`,
    explain: `${d.description}. ${d.explain}`,
    status: props.on ? "Brewed at every set-out · click to pour it back" : "Click to brew it",
  });
  const color = `#${d.color.toString(16).padStart(6, "0")}`;
  return (
    <button
      type="button"
      aria-pressed={props.on}
      aria-label={d.name}
      className={`draught-vial${props.on ? " on" : ""}`}
      style={{ "--vial": color } as React.CSSProperties}
      onClick={props.onPick}
      {...hover}
    >
      <svg viewBox="0 0 20 28" width="18" height="26" aria-hidden="true">
        <path d="M7 1h6v6l5 8v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-9l5-8z" className="vial-glass" />
        <path d="M3.5 16h13v8a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z" className="vial-brew" />
      </svg>
    </button>
  );
}

const WILDFIRE_HINT =
  "Wildfire: any act burns again, harder each tier. Monster Level 92 at I up to 110 at X (above V the foes outlevel you), only T10 items, more Legendaries and higher Runes. Choose Omens for Peril: VI asks for 2, up to 10 at X, and every point pays more XP and Legendaries. Clear an act boss to open the next tier.";

/** Wildfire tier for the next trip (spielzeit-v1.md, C): Off, then I up to one above the best. */
export function WildfirePicker(props: {
  tier: number;
  top: number;
  best: number;
  onPick: (tier: number) => void;
}) {
  const { tier, top, best } = props;
  return (
    <div className="wildfire-picker" aria-label="Wildfire" title={WILDFIRE_HINT}>
      <button
        type="button"
        className="btn ghost wildfire-step"
        aria-label="Lower Wildfire"
        disabled={tier <= 0}
        onClick={() => props.onPick(tier - 1)}
      >
        <Icon name="prev" size={16} />
      </button>
      <span className={`wildfire-tier title-font${tier > 0 ? " on" : ""}`}>
        <Icon name="fire" size={16} />
        {tier > 0 ? wildfireName(tier) : "Wildfire off"}
        <span className="sub small">
          {tier > 0 ? `Monster Level ${wildfireLevel(tier)}` : ""}
          {best > 0 ? `${tier > 0 ? " · " : ""}best ${wildfireName(best).slice(9)}` : ""}
        </span>
      </span>
      <button
        type="button"
        className="btn ghost wildfire-step"
        aria-label="Raise Wildfire"
        disabled={tier >= top}
        onClick={() => props.onPick(tier + 1)}
      >
        <Icon name="next" size={16} />
      </button>
    </div>
  );
}

/** Eldrin's Bounty for the chosen road: the task and what it pays. */
export function BountyNote(props: { bounty: BountyView }) {
  return (
    <div className="bounty-note" aria-label="Bounty">
      <span className="eyebrow">BOUNTY · {props.bounty.def.name.toUpperCase()}</span>
      <span>{props.bounty.text}</span>
      <span className="sub small">Pays Acorns, Ember Coal and a Rare item or better.</span>
    </div>
  );
}

export interface TurnInReward {
  readonly acorns: number;
  readonly emberCoal: number;
  readonly item: Item;
}

/** What Eldrin pays for the done bounty right now; `null` if he can't (e.g. inventory full). */
export function turnInPreview(state: GameState): TurnInReward | null {
  try {
    const after = applyAction(state, GAME_DATA, { type: "turnInBounty" });
    const item = after.inventory.find(
      (p) => !state.inventory.some((q) => q.item.id === p.item.id),
    )?.item;
    if (!item) return null;
    return {
      acorns: after.wallet.acorns - state.wallet.acorns,
      emberCoal: after.wallet.emberCoal - state.wallet.emberCoal,
      item,
    };
  } catch {
    return null;
  }
}

/** A done bounty at Eldrin: turn it in, then what he paid. */
export function BountyTurnIn(props: {
  state: GameState;
  paid: TurnInReward | null;
  onTurnIn: () => void;
}) {
  const { state, paid } = props;
  const { active, ...hover } = useItemHover(paid?.item);
  if (paid && !state.bountyDone) {
    return (
      <div className="bounty-note paid" aria-label="Bounty" role="status">
        <span className="eyebrow">BOUNTY PAID</span>
        <span>
          +{fmt(paid.acorns)} Acorns · +{paid.emberCoal} Ember Coal
        </span>
        <span className={`bounty-item ${rarityClass(paid.item)}`} {...(active ? hover : {})}>
          <span className="rarity-text">{paid.item.name}</span>
          <span className="sub small"> · in your inventory</span>
        </span>
      </div>
    );
  }
  const done = state.bountyDone;
  if (!done) return null;
  const view = bountyView({
    id: done.id,
    ...(done.enemyId ? { enemyId: done.enemyId } : {}),
    progress: 0,
    status: "done",
  });
  const ready = turnInPreview(state) !== null;
  return (
    <div className="bounty-note done" aria-label="Bounty">
      <span className="eyebrow">BOUNTY DONE · {view.def.name.toUpperCase()}</span>
      <span>{view.text}</span>
      <span className="sub small">
        {ready
          ? "Pays Acorns, Ember Coal and a Rare item or better."
          : "Make room in your inventory first."}
      </span>
      <button
        type="button"
        className="btn primary bounty-turn-in"
        disabled={!ready}
        onClick={props.onTurnIn}
      >
        <Icon name="target" size={14} /> Turn In
      </button>
    </div>
  );
}

const omenOf = (id: string): OmenDefinition | undefined =>
  GAME_DATA.omens?.find((o) => o.id === id);

/**
 * Run Omens (neuausrichtung-v1.md 5.2): an old act burns under one of two Omens. Eldrin shows
 * both with their price, their reward and the Scout's question to the build; the hero picks one.
 */
export function OmenChoice(props: {
  offer: readonly string[];
  chosen: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <div className="omen-choice" role="radiogroup" aria-label="Omen">
      <span className="eyebrow">OMEN · CHOOSE ONE</span>
      <div className="omen-cards">
        {props.offer.map((id) => {
          const o = omenOf(id);
          if (!o) return null;
          const on = props.chosen === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={o.name}
              className={`omen-card${on ? " on" : ""}`}
              onClick={() => props.onPick(id)}
            >
              <span className="omen-name title-font">{o.name}</span>
              <span className="omen-price">{o.price}</span>
              {o.reward && <span className="omen-reward">{o.reward}</span>}
              <span className="omen-question sub small">{o.question}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Wildfire Omens (neuausrichtung-v1.md 7.2): any number, each adds its Peril. Tiers above V ask
 * for a minimum; every point pays more XP and Legendaries, every four a Rune rank.
 */
export function WildfireOmens(props: {
  tier: number;
  chosen: readonly string[];
  onToggle: (id: string) => void;
}) {
  const pool = (GAME_DATA.omens ?? []).filter((o) => o.kind === "wildfire");
  const peril = omenPeril(props.chosen.flatMap((id) => omenOf(id) ?? []));
  const need = minPeril(props.tier);
  const pay = perilReward(peril);
  return (
    <div className="wildfire-omens" role="group" aria-label="Wildfire Omens">
      <div className="omen-peril">
        <span className="eyebrow">OMENS</span>
        <b className={`mono${peril < need ? " short" : ""}`}>
          Peril {peril}
          {need > 0 ? ` / ${need}` : ""}
        </b>
        <span className="sub small">
          {peril > 0
            ? `+${Math.round(pay.xp * 100)} % XP · +${Math.round(pay.legendary * 100)} % Legendary${pay.runeTiers ? ` · Runes +${pay.runeTiers} rank` : ""}`
            : need > 0
              ? `${wildfireName(props.tier)} asks for ${need} Peril`
              : "Optional: more Peril, more loot"}
        </span>
      </div>
      <div className="omen-grid">
        {pool.map((o) => (
          <OmenToggle
            key={o.id}
            omen={o}
            on={props.chosen.includes(o.id)}
            onToggle={() => props.onToggle(o.id)}
          />
        ))}
      </div>
    </div>
  );
}

function OmenToggle(props: { omen: OmenDefinition; on: boolean; onToggle: () => void }) {
  const o = props.omen;
  const hover = useNoteHover({
    name: o.name,
    kind: `Wildfire Omen · Peril ${o.peril ?? 0}`,
    explain: `${o.price} ${o.question}`,
    status: props.on ? "Burns on this trip · click to drop it" : "Click to take it",
  });
  return (
    <button
      type="button"
      aria-pressed={props.on}
      aria-label={o.name}
      className={`omen-toggle${props.on ? " on" : ""}`}
      onClick={props.onToggle}
      {...hover}
    >
      <span className="omen-name">{o.name}</span>
      <span className="omen-pips" aria-hidden="true">
        {"◆".repeat(o.peril ?? 0)}
      </span>
    </button>
  );
}
