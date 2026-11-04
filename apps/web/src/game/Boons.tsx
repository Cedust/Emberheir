import {
  type ActiveBoon,
  type BoonDefinition,
  type BoonPick,
  type BoonPickOutcome,
  type BoonSlot,
  type GameState,
  type RunState,
  BOONS,
  BOON_GRADES,
  EXCLUSIVE_BOON_SLOTS,
  battlePlanUnlocks,
  boonPickOutcome,
  boonRankUpText,
  boonScale,
  boonText,
  heroBoons,
} from "@emberheir/sim";
import { GAME_DATA } from "@emberheir/content";
import { useEffect, useSyncExternalStore } from "react";
import { Icon, type IconName } from "../ui/Icon";
import { useNoteHover } from "../ui/ItemTooltip";
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
const exclusive = (slot: BoonSlot) => EXCLUSIVE_BOON_SLOTS.includes(slot);
/** The board's fixed slots, left to right. */
const SOCKETS: readonly BoonSlot[] = ["strike", "skill", "heat", "reaction"];

/**
 * The Shrine card under the pointer, so the Boons panel can light up what it would change
 * (boon-auswahl-v1.md 3.2). A tiny store: the cards and the panel sit in different columns.
 */
interface BoonFocus {
  readonly slot: BoonSlot;
  readonly outcome: BoonPickOutcome["kind"];
  /** The held Boon the pick ranks up or replaces. */
  readonly owned?: string;
}

let focus: BoonFocus | null = null;
const listeners = new Set<() => void>();
function setFocus(next: BoonFocus | null) {
  focus = next;
  for (const l of listeners) l();
}
function useBoonFocus(): BoonFocus | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => focus,
  );
}

function Pips(props: { rank: number; old: number; max: number }) {
  return (
    <span className="boon-pips" aria-label={`Rank ${ROMAN[props.rank]}`}>
      {Array.from({ length: props.max }, (_, i) => (
        <span key={i} className={i < props.old ? "on" : i < props.rank ? "on new" : ""} />
      ))}
    </span>
  );
}

/** What the pick does, on top of the card: new, a rank up, or which Boon it replaces. */
function OutcomeBand(props: { def: BoonDefinition; outcome: BoonPickOutcome; rank: number }) {
  const { def, outcome } = props;
  const slot = SLOT_NAME[def.slot];
  const hover = useNoteHover(
    outcome.kind === "rankUp"
      ? {
          name: `Rank ${ROMAN[props.rank]}`,
          kind: "Boon you hold",
          explain: "Taking it again makes it stronger.",
        }
      : outcome.kind === "replaces"
        ? {
            name: `${slot} slot`,
            kind: "Holds one Boon",
            explain: `You hold one ${slot} Boon. This one takes the place of ${outcome.owned.def.name}.`,
          }
        : exclusive(def.slot)
          ? {
              name: `${slot} slot`,
              kind: "Holds one Boon",
              explain: `Your ${slot} slot is free. A later ${slot} Boon would take its place.`,
            }
          : { name: "Stacks", kind: "Boon", explain: "Adds to all your other Boons." },
  );
  const owned = outcome.kind === "new" ? undefined : outcome.owned;
  const ownedFamily = familyOf(owned?.def.family);
  return (
    <span className={`boon-band ${outcome.kind}`} data-testid="boon-band" {...hover}>
      {outcome.kind === "rankUp" && (
        <>
          Rank {ROMAN[props.rank - 1]} → {ROMAN[props.rank]}
        </>
      )}
      {outcome.kind === "replaces" && owned && (
        <>
          <span
            className="boon-sigil mini"
            style={{ "--boon": ownedFamily?.color ?? "#c9a063" } as React.CSSProperties}
          >
            <Icon name={SLOT_ICON[owned.def.slot]} size={10} color="#fff6e4" />
          </span>
          Replaces {owned.def.name}
        </>
      )}
      {outcome.kind === "new" && (exclusive(def.slot) ? "New" : "New · Stacks")}
    </span>
  );
}

function ShrineCard(props: { pick: BoonPick; active: readonly ActiveBoon[]; onPick: () => void }) {
  const def = boonDef(props.pick.id);
  // The panel stops glowing when the cards go away.
  useEffect(() => () => setFocus(null), []);
  if (!def) return null;
  const family = familyOf(def.family);
  const outcome = boonPickOutcome(def, props.active);
  const owned = outcome.kind === "rankUp" ? outcome.owned : undefined;
  const maxRank = def.maxRank ?? BOONS.maxRank;
  const rank = Math.min(maxRank, (owned?.rank ?? 0) + 1);
  const grade =
    owned && BOON_GRADES.indexOf(owned.grade) > BOON_GRADES.indexOf(props.pick.grade)
      ? owned.grade
      : props.pick.grade;
  const scale = boonScale(rank, grade);
  const text = owned ? boonRankUpText(def, owned, { scale, rank }) : boonText(def, scale, rank);
  const fusion = def.fusion?.map((f) => familyOf(f)?.color ?? "#999");
  const replaced = outcome.kind === "replaces" ? outcome.owned : undefined;
  const lit = () =>
    setFocus({
      slot: def.slot,
      outcome: outcome.kind,
      ...(outcome.kind !== "new" ? { owned: outcome.owned.def.id } : {}),
    });
  return (
    <button
      type="button"
      className={`boon-card panel-card grade-${props.pick.grade}${def.fusion ? " fusion" : ""} ${outcome.kind}`}
      style={
        {
          "--boon": family?.color ?? "#c9a063",
          "--boon2": fusion?.[1] ?? family?.color ?? "#c9a063",
        } as React.CSSProperties
      }
      data-testid={`boon-${def.id}`}
      onClick={props.onPick}
      onPointerEnter={lit}
      onFocus={lit}
      onPointerLeave={() => setFocus(null)}
      onBlur={() => setFocus(null)}
    >
      <OutcomeBand def={def} outcome={outcome} rank={rank} />
      <span className="boon-family sub">
        {def.fusion ? "Fusion" : family?.name}
        {props.pick.grade !== "spark" && <em> · {props.pick.grade}</em>}
      </span>
      <span className="boon-sigil">
        <Icon name={SLOT_ICON[def.slot]} size={34} color="#fff6e4" />
      </span>
      <strong className="title-font">{def.name}</strong>
      <span className="boon-text">{text}</span>
      {replaced && (
        <span className="boon-lost sub" data-testid="boon-lost">
          {replaced.def.name}: {boonText(replaced.def, replaced.scale, replaced.rank)}
        </span>
      )}
      <span className="boon-foot sub">
        <span>{exclusive(def.slot) ? SLOT_NAME[def.slot] : "Stacks"}</span>
        <Pips rank={rank} old={owned?.rank ?? 0} max={maxRank} />
      </span>
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
        <BoonChip
          key={b.def.id}
          boon={b}
          flash={props.flash?.has(b.def.name) ?? false}
          fresh={fresh.has(b.def.id) && !kept.has(b.def.id)}
        />
      ))}
    </div>
  );
}

/** One Boon in the battle HUD: its sigil and rank, the effect in the game tooltip. */
function BoonChip(props: { boon: ActiveBoon; flash: boolean; fresh: boolean }) {
  const { boon: b } = props;
  const family = familyOf(b.def.family);
  const hover = useNoteHover({
    name: `${b.def.name} ${ROMAN[b.rank]}`,
    kind: `${family?.name ?? SLOT_NAME[b.def.slot]} Boon`,
    explain: boonText(b.def, b.scale, b.rank),
    ...(props.fresh ? { status: "Stolen in this act" } : {}),
  });
  return (
    <span
      className="boon-chip"
      style={{ "--boon": family?.color ?? "#c9a063" } as React.CSSProperties}
      tabIndex={0}
      aria-label={`${b.def.name} ${ROMAN[b.rank]}`}
      {...hover}
    >
      <span
        className={`boon-sigil small${props.flash ? " flash" : ""}${props.fresh ? " fresh" : ""}`}
      >
        <Icon name={SLOT_ICON[b.def.slot]} size={14} color="#fff6e4" />
      </span>
      {b.rank > 1 && <i>{ROMAN[b.rank]}</i>}
    </span>
  );
}

/** One Boon of the panel: its sigil, its rank, the effect in the game tooltip. */
function BoonTile(props: {
  boon: ActiveBoon;
  fresh: boolean;
  lit?: "rankUp" | "replaces" | undefined;
}) {
  const { boon: b, fresh } = props;
  const family = familyOf(b.def.family);
  const hover = useNoteHover({
    name: `${b.def.name} ${ROMAN[b.rank]}`,
    kind: `${family?.name ?? SLOT_NAME[b.def.slot]} Boon`,
    explain: boonText(b.def, b.scale, b.rank),
    ...(fresh ? { status: "Stolen in this act" } : {}),
  });
  return (
    <span
      className={`boon-tile${fresh ? " fresh" : ""}${props.lit ? ` lit-${props.lit}` : ""}`}
      style={{ "--boon": family?.color ?? "#c9a063" } as React.CSSProperties}
      tabIndex={0}
      aria-label={`${b.def.name} ${ROMAN[b.rank]}`}
      data-testid={`boon-tile-${b.def.id}`}
      {...hover}
    >
      <span className="boon-sigil tile">
        <Icon name={SLOT_ICON[b.def.slot]} size={18} color="#fff6e4" />
      </span>
      <i>{ROMAN[b.rank]}</i>
    </span>
  );
}

/** A fixed slot of the board with nothing in it (or not open yet). */
function EmptySocket(props: { slot: BoonSlot; locked: boolean; lit: boolean }) {
  const name = SLOT_NAME[props.slot];
  const hover = useNoteHover(
    props.locked
      ? {
          name: `${name} slot`,
          kind: "Locked",
          explain: "Opens with the Reaction slot of your Battle Plan.",
        }
      : { name: `${name} slot`, kind: "Empty", explain: `Holds one ${name} Boon.` },
  );
  return (
    <span
      className={`boon-socket-empty${props.locked ? " locked" : ""}${props.lit ? " lit-new" : ""}`}
      tabIndex={0}
      aria-label={`${name} slot ${props.locked ? "locked" : "empty"}`}
      {...hover}
    >
      <Icon name={props.locked ? "lock" : SLOT_ICON[props.slot]} size={14} />
    </span>
  );
}

/**
 * The Boons of this trip as a small board in the Intermission (boon-auswahl-v1.md 3.3): the four
 * slots that hold one Boon each (empty ones too), then every Boon that stacks.
 */
export function BoonPanel(props: { state: GameState }) {
  const active = heroBoons(props.state, GAME_DATA);
  const lit = useBoonFocus();
  const offer = props.state.run?.rewards?.boonOffer;
  if (!active.length && !offer?.length) return null;
  const fresh = new Set(props.state.boons.fresh.map((p) => p.id));
  const kept = new Set(props.state.boons.kept.map((p) => p.id));
  const reactionOpen = battlePlanUnlocks(props.state.legacy.prestige).reactionSlots > 0;
  const litOf = (b: ActiveBoon) =>
    lit?.owned === b.def.id && lit.outcome !== "new" ? lit.outcome : undefined;
  const tile = (b: ActiveBoon) => (
    <BoonTile
      key={b.def.id}
      boon={b}
      fresh={fresh.has(b.def.id) && !kept.has(b.def.id)}
      lit={litOf(b)}
    />
  );
  const stacking = active.filter((b) => !exclusive(b.def.slot));
  return (
    <section className="panel-card boon-panel" aria-label="Boons" data-testid="boon-bar">
      <span className="eyebrow">Boons</span>
      <div className="boon-sockets">
        {SOCKETS.map((slot) => {
          const held = active.find((b) => b.def.slot === slot);
          return (
            <span key={slot} className="boon-socket" data-testid={`boon-socket-${slot}`}>
              {held ? (
                tile(held)
              ) : (
                <EmptySocket
                  slot={slot}
                  locked={slot === "reaction" && !reactionOpen}
                  lit={lit?.slot === slot && lit.outcome === "new"}
                />
              )}
              <small>{SLOT_NAME[slot]}</small>
            </span>
          );
        })}
      </div>
      {stacking.length > 0 && <div className="boon-tiles">{stacking.map(tile)}</div>}
    </section>
  );
}
