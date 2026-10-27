import { ACTS, GAME_DATA, ITEM_CATALOG } from "@emberheir/content";
import { EnemyPortrait } from "../../ui/EnemyPortrait";
import { huntView, trailTitle } from "../hunts";
import {
  type ActData,
  actUnlocked,
  bossKnown,
  brewedDraught,
  DRAUGHT_FLASK_COST,
  draughtsOpen,
  finaleOpen,
  flaskCapacity,
  type GameState,
  getBase,
  minPeril,
  nextAct,
  omenOffer,
  omenPeril,
  wildfireName,
  wildfireTop,
} from "@emberheir/sim";
import { useState } from "react";
import { Icon } from "../../ui/Icon";
import { ItemArt } from "../../ui/ItemArt";
import { useNoteHover } from "../../ui/ItemTooltip";
import { runeColor, runeName, RuneStone } from "../../ui/RuneArt";
import { TrailMark } from "../../ui/TrailMark";
import { homeRuneNote, homeUniqueNote } from "../actLoot";
import { Button } from "../../ui/kit/Button";
import { Wallet } from "../../ui/kit/Currency";
import { Medallion, Window, WindowHeader, WindowLayer } from "../../ui/kit/Window";
import { type BountyView, bountyOfferViews } from "../bounty";
import { bossName, visibleActs } from "../labels";
import type { GameApi } from "../useGame";
import { PersonaPortrait } from "./art/PersonaArt";
import { eldrinLines } from "./campPersonas";
import {
  BountyCacheView,
  BountyChoice,
  BountyTurnIn,
  DraughtPicker,
  OmenChoice,
  WildfireOmens,
  WildfirePicker,
} from "./CampPickers";

/**
 * The trip ahead (ui-ux-plan-v1.md 4.1): which act, under which Omen, how hot the Wildfire
 * burns. The Camp's road strip and Set Out button and Eldrin's Road window share one plan.
 */
export interface RoadPlan {
  readonly acts: readonly ActData[];
  readonly act: ActData;
  readonly isOpen: (id: string) => boolean;
  readonly pickAct: (id: string) => void;
  readonly tier: number;
  readonly top: number;
  readonly pickTier: (tier: number) => void;
  readonly offer: readonly string[];
  readonly omen: string | null;
  readonly pickOmen: (id: string) => void;
  readonly wildOmens: readonly string[];
  readonly toggleWildOmen: (id: string) => void;
  /** Eldrin's two Bounties for the act (none in the Wildfire) and the one taken. */
  readonly bounties: readonly BountyView[];
  readonly bounty: string | null;
  readonly pickBounty: (id: string | null) => void;
  readonly ready: boolean;
  /** Text of the Set Out button: what the trip is, or what it still needs. */
  readonly label: string;
  readonly setOut: () => void;
}

export function useRoadPlan(state: GameState, game: GameApi): RoadPlan {
  const [road, setRoad] = useState<string | null>(null);
  // Wildfire tier for the next trip (0 = a normal trip); every act is open in the Wildfire.
  const top = wildfireTop(state);
  const [fire, setFire] = useState(0);
  const tier = Math.min(fire, top);
  const isOpen = (id: string) => tier > 0 || actUnlocked(state, GAME_DATA, id);
  // Only the acts this run can reach: later ones are not even named (no spoilers).
  const acts = visibleActs(state);
  // The road the Heir takes: the next act unless a cleared one is picked to farm it again.
  const act = acts.find((a) => a.id === road && isOpen(a.id)) ?? nextAct(state, GAME_DATA);
  // Omens (neuausrichtung-v1.md 5.2, 7.2): one of two for an old act, any for the Wildfire.
  const [omen, setOmen] = useState<string | null>(null);
  const [wildOmens, setWildOmens] = useState<readonly string[]>([]);
  const offer = tier > 0 ? [] : omenOffer(state, GAME_DATA, act.id);
  const runOmen = omen && offer.includes(omen) ? omen : null;
  const peril = omenPeril(
    wildOmens.flatMap((id) => GAME_DATA.omens?.find((o) => o.id === id) ?? []),
  );
  // Eldrin's Bounties (bounties-v2-plan.md B1): one of two, or none.
  const [bountyPick, setBounty] = useState<string | null>(null);
  const bounties = tier > 0 ? [] : bountyOfferViews(state, act.id);
  const bounty = bounties.some((b) => b.def.id === bountyPick) ? bountyPick : null;
  const ready = tier > 0 ? peril >= minPeril(tier) : offer.length === 0 || runOmen !== null;
  const label = !ready
    ? tier > 0
      ? `NEEDS ${minPeril(tier)} PERIL`
      : "CHOOSE AN OMEN"
    : tier > 0
      ? `${wildfireName(tier).toUpperCase()} · ACT ${act.number}`
      : `SET OUT · ACT ${act.number}`;
  return {
    acts,
    act,
    isOpen,
    pickAct: setRoad,
    tier,
    top,
    pickTier: setFire,
    offer,
    omen: runOmen,
    pickOmen: setOmen,
    wildOmens,
    toggleWildOmen: (id) =>
      setWildOmens((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])),
    bounties,
    bounty,
    pickBounty: setBounty,
    ready,
    label,
    setOut: () => {
      if (!ready) return;
      game.dispatch(
        tier > 0
          ? { type: "setOut", actId: act.id, wildfire: tier, omens: wildOmens }
          : {
              type: "setOut",
              actId: act.id,
              ...(runOmen ? { omens: [runOmen] } : {}),
              ...(bounty ? { bounty } : {}),
            },
      );
    },
  };
}

/** One card per act, painted in the act's arena colors. */
export function RoadStrip(props: { state: GameState; plan: RoadPlan; vertical?: boolean }) {
  const { state, plan } = props;
  // More than one act: the cards fold to their number, only the chosen act stays open.
  const compact = !props.vertical && plan.acts.length > 1;
  return (
    <div
      className={`road${compact ? " compact" : ""}${props.vertical ? " vertical" : ""}`}
      role="radiogroup"
      aria-label="Road"
    >
      {plan.acts.map((a) => {
        const open = plan.isOpen(a.id);
        const done = state.progress.actsCleared.includes(a.id);
        const on = a.id === plan.act.id;
        const info = ACTS.find((x) => x.id === a.id);
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`Act ${a.number}, ${a.name}`}
            title={`Act ${a.number} · ${a.name}`}
            disabled={!open}
            className={`road-act ${on ? "on" : ""} ${done ? "done" : ""} ${open ? "" : "locked"}`}
            style={
              {
                "--act-top": info?.arenaGradient[0],
                "--act-bottom": info?.arenaGradient[1],
              } as React.CSSProperties
            }
            onClick={() => plan.pickAct(a.id)}
          >
            <span className="road-num title-font">{a.number}</span>
            <span className="road-text">
              <span className="road-name title-font">{a.name}</span>
              <span className="sub">
                {info?.focus}
                {open && bossKnown(state, GAME_DATA, a.id) ? ` · ${a.boss.name}` : ""}
              </span>
            </span>
            {props.vertical && a.homeRune && (
              <span className="road-home-rune" title={`Home Rune: ${runeName(a.homeRune)}`}>
                <RuneStone runeId={a.homeRune} size={22} />
              </span>
            )}
            {done ? (
              <Icon name="check" size={16} className="road-mark" />
            ) : !open ? (
              <Icon name="lock" size={14} className="road-mark" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** The act's Home Rune and Home Uniques (act-beute-entwurf-v1.md A3): what to farm here. */
function HomeLoot(props: { state: GameState; act: ActData }) {
  const { state, act } = props;
  if (!act.homeRune && !act.homeUniques?.length) return null;
  return (
    <div className="road-home" aria-label="Home loot">
      {act.homeRune && <HomeRuneChip act={act} />}
      {(act.homeUniques ?? []).map((id) => (
        <HomeUniqueChip
          key={id}
          id={id}
          act={act}
          found={state.legacy.trophies.includes(id)}
          prestige={state.legacy.prestige}
        />
      ))}
    </div>
  );
}

/** The act's enemies with their Trails (hunts-entwurf-v1.md): who is worth hunting here. */
function ActHunts(props: { state: GameState; act: ActData }) {
  const { state, act } = props;
  if (!act.enemies.length) return null;
  return (
    <div className="road-hunts" aria-label="Hunts" data-testid="road-hunts">
      {act.enemies.map((e) => {
        const hunt = huntView(state, e.id);
        return (
          <span
            key={e.id}
            className={`road-hunt trail-${hunt.tier}`}
            title={`${hunt.tier ? e.name : "???"} · ${trailTitle(hunt.tier)} · ${hunt.kills}${
              hunt.next !== undefined ? ` / ${hunt.next}` : ""
            } kills · Hunt Affixes: ${hunt.affixes.join(", ")}`}
          >
            <EnemyPortrait enemyId={e.id} size={30} hidden={hunt.tier === 0} />
            <TrailMark tier={hunt.tier} size={22} className="badge" />
          </span>
        );
      })}
    </div>
  );
}

function HomeRuneChip(props: { act: ActData }) {
  const id = props.act.homeRune ?? "";
  const hover = useNoteHover(homeRuneNote(props.act));
  return (
    <span
      className="road-home-chip"
      tabIndex={0}
      data-testid="home-rune"
      style={{ "--rune": runeColor(id) } as React.CSSProperties}
      {...hover}
    >
      <RuneStone runeId={id} size={26} />
      <span className="title-font">{runeName(id)}</span>
    </span>
  );
}

function HomeUniqueChip(props: { id: string; act: ActData; found: boolean; prestige: number }) {
  const unique = ITEM_CATALOG.uniques.get(props.id);
  const hover = useNoteHover(homeUniqueNote(props.id, props.act, props.found, props.prestige));
  if (!unique) return null;
  return (
    <span
      className={`road-home-unique${props.found ? " found" : ""}`}
      tabIndex={0}
      aria-label={unique.name}
      {...hover}
    >
      <ItemArt
        baseId={unique.baseId}
        uniqueId={unique.id}
        slot={getBase(ITEM_CATALOG, unique.baseId).slot}
      />
    </span>
  );
}

/**
 * Eldrin's Road window (ui-ux-plan-v1.md 4.1): everything for the trip in one place, the act
 * on the left; Omen, Wildfire, Bounty and Draught on the right; Set Out at the bottom.
 */
export function RoadWindow(props: {
  state: GameState;
  game: GameApi;
  plan: RoadPlan;
  onClose: () => void;
}) {
  const { state, game, plan } = props;
  const { act } = plan;
  // A new word every visit, and another when the raven is poked.
  const lines = eldrinLines(state);
  const [line, setLine] = useState(() => Math.floor(Math.random() * lines.length));
  const info = ACTS.find((a) => a.id === act.id);
  const capacity = flaskCapacity(state, GAME_DATA);
  const brewed = brewedDraught(state, GAME_DATA);
  return (
    <WindowLayer>
      <Window
        label="Eldrin, The Road"
        className="road-window"
        header={
          <WindowHeader
            title="The Road"
            sub="Eldrin · Scout"
            medallion={
              <Medallion tint="#3b5a2c">
                <PersonaPortrait id="eldrin" />
              </Medallion>
            }
            right={<Wallet state={state} />}
            onClose={props.onClose}
          />
        }
      >
        <div className="road-columns">
          <aside className="road-left">
            <button
              type="button"
              className="persona-bust road-bust"
              style={{ background: "#3b5a2c", borderColor: "#9fbf7a" }}
              aria-label="Eldrin"
              onClick={() => setLine((n) => n + 1)}
            >
              <PersonaPortrait id="eldrin" />
            </button>
            <blockquote
              key={line}
              className="persona-quote road-quote"
              style={{ borderColor: "#9fbf7a" }}
            >
              &ldquo;{lines[line % lines.length]}&rdquo;
            </blockquote>
            <section className="road-acts" aria-label="Acts">
              <RoadStrip state={state} plan={plan} vertical />
            </section>
          </aside>
          <section className="road-trip" aria-label="Trip">
            <div className="road-brief">
              <span className="eyebrow">
                ACT {act.number} · {info?.focus?.toUpperCase()}
              </span>
              <span className="title-font road-brief-name">{act.name}</span>
              <span className="road-brief-boss">
                <Icon name="boss" size={16} /> {bossName(state, act)}
              </span>
              <span className="sub road-brief-text">
                {bossKnown(state, GAME_DATA, act.id)
                  ? act.boss.description
                  : "Nobody came back to tell what waits at its end."}
              </span>
              <HomeLoot state={state} act={act} />
              <ActHunts state={state} act={act} />
            </div>
            {finaleOpen(state, GAME_DATA) && (
              <Button
                icon="fire"
                className="finale-button"
                tip={{
                  name: "The Last Ember",
                  kind: "Finale",
                  explain: state.legacy.finaleWon ? "Walk it again." : "Six echoes, then the Core.",
                }}
                onClick={() => game.dispatch({ type: "enterFinale" })}
              >
                THE LAST EMBER
              </Button>
            )}
            {plan.top > 0 && (
              <WildfirePicker
                tier={plan.tier}
                top={plan.top}
                best={state.legacy.wildfire ?? 0}
                onPick={plan.pickTier}
              />
            )}
            {plan.tier > 0 && (
              <WildfireOmens
                tier={plan.tier}
                chosen={plan.wildOmens}
                onToggle={plan.toggleWildOmen}
              />
            )}
            {plan.offer.length > 0 && (
              <OmenChoice offer={plan.offer} chosen={plan.omen} onPick={plan.pickOmen} />
            )}
            {state.bountyCache && (
              <BountyCacheView
                state={state}
                onTake={(index) => game.dispatch({ type: "takeBountyItem", index })}
                onClose={() => game.dispatch({ type: "closeBountyCache" })}
              />
            )}
            {state.bountyDone ? (
              <BountyTurnIn
                state={state}
                onTurnIn={() => game.dispatch({ type: "turnInBounty" })}
              />
            ) : (
              !state.bountyCache &&
              plan.bounties.length > 0 && (
                <BountyChoice
                  offer={plan.bounties}
                  act={act}
                  chosen={plan.bounty}
                  onPick={plan.pickBounty}
                />
              )
            )}
            <div className="k-grow" />
            <div className="road-go">
              {/* The Flask for the trip, apart from Eldrin's bounties: what the hero carries. */}
              <div className="road-flask">
                {draughtsOpen(state, GAME_DATA) && (
                  <DraughtPicker
                    chosen={state.draught ?? null}
                    onPick={(id) => game.dispatch({ type: "chooseDraught", draughtId: id })}
                  />
                )}
                <span className="sub">
                  {brewed
                    ? `Flask ${capacity - DRAUGHT_FLASK_COST}/${capacity} + ${brewed.name} · wounds healed`
                    : "Flask refilled · wounds healed"}
                </span>
              </div>
              <Button
                variant="primary"
                big
                className={plan.tier > 0 ? "wildfire-go" : ""}
                blocked={plan.ready ? null : plan.tier > 0 ? "Choose more Omens" : "Choose an Omen"}
                onClick={plan.setOut}
              >
                {plan.label}
              </Button>
            </div>
          </section>
        </div>
      </Window>
    </WindowLayer>
  );
}
