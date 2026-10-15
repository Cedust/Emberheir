import { ACTS, GAME_DATA } from "@emberheir/content";
import {
  actsInOrder,
  actUnlocked,
  brewedDraught,
  DRAUGHT_FLASK_COST,
  draughtsOpen,
  finaleOpen,
  flaskCapacity,
  type GameState,
  LINEAGE_STEPS,
  minPeril,
  nextAct,
  omenOffer,
  omenPeril,
  wildfireName,
  wildfireTop,
} from "@emberheir/sim";
import { useState } from "react";
import { Icon } from "../../ui/Icon";
import { fmt, walletEntries } from "../../ui/items";
import { useStageSize } from "../../ui/Stage";
import { bountyPreview } from "../bounty";
import { completedCollections } from "../collections";
import type { GameApi } from "../useGame";
import { CampLight } from "./art/CampLight";
import { CampBackdrop, CampFx, campLights, SCENE_W } from "./art/CampScene";
import { PaintDefs } from "./art/paint";
import { FIG_H, Figure, heirGear, Portrait } from "./CampFigures";
import { type CampTarget, NAN_LINES, personas } from "./campPersonas";
import {
  BountyNote,
  BountyTurnIn,
  DraughtPicker,
  turnInPreview,
  OmenChoice,
  type TurnInReward,
  WildfireOmens,
  WildfirePicker,
} from "./CampPickers";

/** The Camp (Camp hub mock): a painted scene with clickable personas and Set Out. */
export function CampView(props: {
  state: GameState;
  game: GameApi;
  onOpen: (target: CampTarget) => void;
  onMenu: () => void;
}) {
  const { state, game } = props;
  const [picked, setPicked] = useState("heir");
  const [nanLine, setNanLine] = useState(0);
  // What Eldrin just paid for a turned-in bounty (shown on his card until another persona is picked).
  const [paid, setPaid] = useState<TurnInReward | null>(null);
  const size = useStageSize();
  const ox = (size.w - SCENE_W) / 2;
  const [road, setRoad] = useState<string | null>(null);
  // Wildfire tier for the next trip (0 = a normal trip); every act is open in the Wildfire.
  const top = wildfireTop(state);
  const [fire, setFire] = useState(0);
  const tier = Math.min(fire, top);
  const roadOpen = (id: string) => tier > 0 || actUnlocked(state, GAME_DATA, id);
  const acts = actsInOrder(GAME_DATA);
  const next = nextAct(state, GAME_DATA);
  // The road the Heir takes: the next act unless a cleared one is picked to farm it again.
  const act = acts.find((a) => a.id === road && roadOpen(a.id)) ?? next;
  // Omens (neuausrichtung-v1.md 5.2, 7.2): one of two for an old act, any for the Wildfire.
  const [omen, setOmen] = useState<string | null>(null);
  const [wildOmens, setWildOmens] = useState<readonly string[]>([]);
  const offer = tier > 0 ? [] : omenOffer(state, GAME_DATA, act.id);
  const runOmen = omen && offer.includes(omen) ? omen : null;
  const peril = omenPeril(
    wildOmens.flatMap((id) => GAME_DATA.omens?.find((o) => o.id === id) ?? []),
  );
  const ready = tier > 0 ? peril >= minPeril(tier) : offer.length === 0 || runOmen !== null;
  const toggleOmen = (id: string) =>
    setWildOmens((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const setOut = () => {
    if (!ready) return;
    game.dispatch(
      tier > 0
        ? { type: "setOut", actId: act.id, wildfire: tier, omens: wildOmens }
        : { type: "setOut", actId: act.id, ...(runOmen ? { omens: [runOmen] } : {}) },
    );
  };
  const list = personas(state, act);
  const gear = heirGear(state);
  const sel = list.find((p) => p.id === picked) ?? list[0];
  if (!sel) return null;
  const cleared = state.progress.actsCleared.includes(act.id);
  const bounty = bountyPreview(state, act.id);
  const flask = `${state.flaskCharges}/${flaskCapacity(state, GAME_DATA)}`;
  const turnIn = () => {
    const reward = turnInPreview(state);
    if (!reward) return;
    setPaid(reward);
    game.dispatch({ type: "turnInBounty" });
  };
  const quote = sel.id === "nan" ? `“${NAN_LINES[nanLine % NAN_LINES.length]}”` : sel.quote;
  const cta = () => {
    if (sel.id === "nan") setNanLine((n) => n + 1);
    else if (sel.id === "eldrin" && !sel.locked) setOut();
    else if (sel.target && !sel.locked) props.onOpen(sel.target);
  };
  return (
    <section className="screen camp" aria-label="Camp">
      <header className="camp-header bar-top">
        <div className="logo title-font">
          <span className="diamond" />
          EMBERHEIR
          <span className="diamond" />
        </div>
        <div className="divider" />
        <div className="run-title">
          <span className="title-font">Camp at the {next.name}</span>
          <span className="sub">
            {state.legacy.prestige > 0 ? `Generation ${state.legacy.prestige + 1} · ` : ""}
            {cleared
              ? `Act ${act.number} cleared · farm it again`
              : `Act ${act.number} · Boss: ${act.boss.name}`}
            {state.progress.deathsInAct > 0 ? ` · Pity ${state.progress.deathsInAct}` : ""}
          </span>
        </div>
        <div className="grow" />
        <div className="wallet-row camp-wallet" aria-label="Wallet">
          {walletEntries(state).map((w) => (
            <span key={w.key} className={`wallet-chip w-${w.key}`} title={w.name}>
              <span className="dot" />
              <b className="mono">{fmt(w.value)}</b>
              <span className="sub">{w.name}</span>
            </span>
          ))}
          <span className="wallet-chip w-flask" title="Ember Flask">
            <span className="dot" />
            <b className="mono">{flask}</b>
            <span className="sub">Flask</span>
          </span>
        </div>
        <button type="button" className="icon-button" aria-label="Menu" onClick={props.onMenu}>
          <Icon name="menu" size={20} />
        </button>
      </header>

      <div className="camp-stage">
        <PaintDefs />
        <CampBackdrop
          roadName={act.name}
          w={size.w}
          h={size.h - 64}
          ox={ox}
          banners={completedCollections(state)}
          ancestor={(state.lineage ?? 0) >= LINEAGE_STEPS}
        />
        <CampFx w={size.w} h={size.h - 64} ox={ox} />
        {/* Positions are in mock coordinates (1440 × 900), centered; the scene starts below the header. */}
        {list.map((p, i) => {
          const w = p.object ? p.object.w : 130;
          const h = p.object ? p.object.h : Math.round(FIG_H * (p.figure?.fs ?? 1));
          const on = picked === p.id;
          const hardLocked = p.locked === "later";
          return (
            <button
              key={p.id}
              type="button"
              className={`camp-target ${on ? "on" : ""} ${p.locked ? "locked" : ""}`}
              style={{ left: ox + p.x - w / 2, top: p.y - h - 64, width: w, height: h }}
              aria-label={`${p.name}, ${p.role}`}
              disabled={hardLocked}
              onClick={() => {
                setPicked(p.id);
                setPaid(null);
              }}
              onDoubleClick={() => {
                if (p.target && !p.locked) props.onOpen(p.target);
              }}
            >
              <Figure p={p} on={on} gear={gear} delay={i * 0.7} />
              {p.id === "eldrin" && state.bountyDone && (
                <span className="bounty-mark" aria-label="Bounty done" title="Bounty done">
                  <Icon name="target" size={16} />
                </span>
              )}
              <span className="camp-tip" role="tooltip">
                <span className="title-font">
                  {p.locked && <Icon name="lock" size={12} />}
                  {p.name}
                </span>
                <span className="sub">{p.role}</span>
              </span>
            </button>
          );
        })}

        <CampLight
          w={size.w}
          h={size.h - 64}
          ox={ox}
          lights={campLights({ orb: state.progress.trainerUnlocked })}
        />

        <section className="persona-card panel-card" aria-label={sel.name}>
          <div className="persona-head">
            <div className="persona-portrait" style={{ background: sel.cloak }}>
              <Portrait p={sel} gear={gear} />
            </div>
            <div className="plaque-names">
              <span className="title-font big">{sel.name}</span>
              <span className="sub">{sel.role}</span>
            </div>
          </div>
          <p className="quote">{quote}</p>
          {sel.id === "eldrin" &&
            (state.bountyDone || paid ? (
              <BountyTurnIn state={state} paid={paid} onTurnIn={turnIn} />
            ) : (
              bounty && <BountyNote bounty={bounty} />
            ))}
          <div className="chip-row">
            {sel.actions.map((a) =>
              sel.id === "nan" && (a.name === "Compendium" || a.name === "Trigger Codex") ? (
                <button
                  key={a.name}
                  type="button"
                  className="action-chip link"
                  onClick={() => props.onOpen(a.name === "Compendium" ? "compendium" : "codex")}
                >
                  {a.name}
                </button>
              ) : (
                <span
                  key={a.name}
                  className={`action-chip ${a.later ? "later" : ""}`}
                  title={a.later ? "Not in this version" : undefined}
                >
                  {a.name === "Ember Flask" ? `Ember Flask ${flask}` : a.name}
                </span>
              ),
            )}
          </div>
          <button type="button" className="btn primary" disabled={!!sel.locked} onClick={cta}>
            {sel.cta}
          </button>
        </section>

        <div className="set-out">
          <div
            className={`road ${acts.length > 4 ? "compact" : ""}`}
            role="radiogroup"
            aria-label="Road"
          >
            {acts.map((a) => {
              const open = roadOpen(a.id);
              const done = state.progress.actsCleared.includes(a.id);
              const on = a.id === act.id;
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
                  onClick={() => setRoad(a.id)}
                >
                  <span className="road-num title-font">{a.number}</span>
                  <span className="road-text">
                    <span className="road-name title-font">{a.name}</span>
                    <span className="sub">
                      {info?.focus}
                      {open ? ` · ${a.boss.name}` : ""}
                    </span>
                  </span>
                  {done ? (
                    <Icon name="check" size={16} className="road-mark" />
                  ) : !open ? (
                    <Icon name="lock" size={14} className="road-mark" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="set-out-go">
            {finaleOpen(state, GAME_DATA) && (
              <button
                type="button"
                className="btn big finale-button"
                title={state.legacy.finaleWon ? "Walk it again" : "Six echoes, then the Core"}
                onClick={() => game.dispatch({ type: "enterFinale" })}
              >
                <Icon name="fire" size={18} />
                THE LAST EMBER
              </button>
            )}
            {tier > 0 && <WildfireOmens tier={tier} chosen={wildOmens} onToggle={toggleOmen} />}
            {offer.length > 0 && <OmenChoice offer={offer} chosen={runOmen} onPick={setOmen} />}
            {top > 0 && (
              <WildfirePicker
                tier={tier}
                top={top}
                best={state.legacy.wildfire ?? 0}
                onPick={setFire}
              />
            )}
            {state.bountyDone ? (
              <span className="hint-light bounty-hint">
                <Icon name="target" size={14} /> Bounty done · turn it in at Eldrin
              </span>
            ) : (
              bounty && (
                <span className="hint-light bounty-hint" title={bounty.def.name}>
                  <Icon name="target" size={14} /> Bounty: {bounty.text}
                </span>
              )
            )}
            {draughtsOpen(state, GAME_DATA) && (
              <DraughtPicker
                chosen={state.draught ?? null}
                onPick={(id) => game.dispatch({ type: "chooseDraught", draughtId: id })}
              />
            )}
            <span className="hint-light">
              {brewedDraught(state, GAME_DATA)
                ? `Flask ${flaskCapacity(state, GAME_DATA) - DRAUGHT_FLASK_COST}/${flaskCapacity(state, GAME_DATA)} + ${brewedDraught(state, GAME_DATA)?.name} · wounds healed`
                : "Flask refilled · wounds healed"}
            </span>
            <button
              type="button"
              className={`btn big primary glow${tier > 0 ? " wildfire-go" : ""}`}
              disabled={!ready}
              onClick={setOut}
            >
              {!ready
                ? tier > 0
                  ? `NEEDS ${minPeril(tier)} PERIL`
                  : "CHOOSE AN OMEN"
                : tier > 0
                  ? `${wildfireName(tier).toUpperCase()} · ACT ${act.number}`
                  : `SET OUT · ACT ${act.number}`}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
