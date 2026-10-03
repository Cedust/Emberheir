import { ACTS, GAME_DATA } from "@emberheir/content";
import {
  type ActData,
  type GameState,
  PROGRESSION,
  actUnlocked,
  actsInOrder,
  nextAct,
} from "@emberheir/sim";
import { useState } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { useStageSize } from "../../ui/Stage";
import { fmt, walletEntries } from "../../ui/items";
import type { GameApi } from "../useGame";
import { CampBackdrop, CampFx, HEARTH_X, SCENE_W, campLights } from "./art/CampScene";
import { CampLight } from "./art/CampLight";
import { FIGURE_H, FIGURE_W, type HeirGear, PORTRAIT, PersonaArt } from "./art/PersonaArt";
import { PaintDefs } from "./art/paint";

export type CampTarget =
  | "legacy"
  | "character"
  | "forge"
  | "altar"
  | "kaelen"
  | "stash"
  | "compendium"
  | "codex"
  | "shop"
  | "runes";

const NAN_LINES = [
  "Sit, child. The fire remembers every one of you, even the clumsy ones.",
  "Heat is a fickle friend. Swords lose it when they rest, wands gather it while they wait.",
  "Gorrak swings slow and hard. When his Heat runs high, be ready.",
  "The Rotwood bleeds you slowly. Tenacity shortens whatever clings to you.",
  "The Mother of Rot feeds whenever she can. Fire spoils her meal.",
  "Dying costs you the road, not your things. Keep walking.",
  "Thoric fixes steel. Liora fixes moods. Neither fixes you.",
];

interface Persona {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly x: number;
  readonly y: number;
  readonly icon: IconName;
  readonly cloak: string;
  readonly quote: string;
  readonly actions: readonly { name: string; later?: boolean }[];
  readonly cta: string;
  readonly target?: CampTarget;
  readonly object?: { w: number; h: number };
  readonly figure?: { fs: number };
  readonly locked?: string;
}

function personas(state: GameState, road: ActData): Persona[] {
  const trainer = state.progress.trainerUnlocked;
  const runesmith = state.progress.runesmithUnlocked;
  const later = "Waits somewhere in the Rotwood.";
  const afterBoss = `Joins the caravan once ${GAME_DATA.acts[0]?.boss.name ?? "the boss"} falls.`;
  const points = state.hero.unspentAttributePoints;
  return [
    {
      id: "hearth",
      name: "Hearthfire",
      role: "Legacy",
      x: 720,
      y: 690,
      icon: "fire",
      cloak: "#a8401a",
      object: { w: 150, h: 200 },
      quote: "Whatever rests near the fire survives the burning.",
      actions: [{ name: "Heirlooms" }, { name: "Save Tokens" }, { name: "Harvester's Ember" }],
      cta: "Open Legacy",
      target: "legacy",
    },
    {
      id: "heir",
      name: "Your Heir",
      role: `Level ${state.hero.level}${points > 0 ? ` · ${points} attribute points` : ""}`,
      x: 900,
      y: 648,
      icon: "user",
      cloak: "#a8401a",
      figure: { fs: 1.25 },
      quote: "Your own gear, stats and attribute points.",
      actions: [
        { name: "Equipment" },
        { name: "Stats" },
        { name: "Attributes" },
        { name: "Inventory" },
      ],
      cta: "Open Character",
      target: "character",
    },
    {
      id: "nan",
      name: "Old Nan",
      role: "Hearthkeeper",
      x: 555,
      y: 640,
      icon: "nan",
      cloak: "#5e4a36",
      figure: { fs: 0.9 },
      quote: "",
      actions: [
        { name: "Talk" },
        { name: "Compendium" },
        { name: "Trigger Codex" },
        { name: "Ember Flask" },
      ],
      cta: "Talk",
    },
    {
      id: "thoric",
      name: "Thoric",
      role: "Blacksmith",
      x: 350,
      y: 596,
      icon: "hammer",
      cloak: "#4a4a4e",
      figure: { fs: 1.1 },
      quote: "“Bring me steel. I’ll bring it back better. Mostly.”",
      actions: [{ name: "Upgrade" }, { name: "Add Socket" }, { name: "Salvage" }],
      cta: "Open Forge",
      target: "forge",
    },
    {
      id: "marisha",
      name: "Marisha",
      role: "Merchant",
      x: 470,
      y: 520,
      icon: "coins",
      cloak: "#7a5a24",
      figure: { fs: 0.95 },
      quote:
        "“Buy now! Everything comes back stronger after the apocalypse. Especially my prices.”",
      actions: [{ name: "Base Items" }, { name: "Gamble" }],
      cta: "Open Shop",
      target: "shop",
    },
    {
      id: "liora",
      name: "Liora",
      role: "Mystic",
      x: 640,
      y: 470,
      icon: "eye",
      cloak: "#2d5bd0",
      figure: { fs: 0.95 },
      quote: trainer ? "“I foresaw you would come. I also foresee you paying.”" : afterBoss,
      actions: [
        { name: "Reforge" },
        { name: "Temper" },
        { name: "Imbue" },
        { name: "Distill" },
        { name: "Kindle" },
      ],
      cta: trainer ? "Open Altar" : "Locked",
      target: "altar",
      ...(trainer ? {} : { locked: "boss" }),
    },
    {
      id: "kaelen",
      name: "Kaelen",
      role: "Trainer",
      x: 810,
      y: 470,
      icon: "sword",
      cloak: "#6a2a20",
      figure: { fs: 1.05 },
      quote: "“Late to one battle. Never late to training.”",
      actions: [{ name: "Skill Tree" }, { name: "Battle Plan" }, { name: "Respec" }],
      cta: "Open Skill Tree",
      target: "kaelen",
    },
    {
      id: "eldrin",
      name: "Eldrin",
      role: "Runesmith",
      x: 950,
      y: 520,
      icon: "rune",
      cloak: "#4f7a3a",
      figure: { fs: 1 },
      quote: runesmith
        ? "“Did you know there are runes older than the Harvester? Nobody asks about those.”"
        : later,
      actions: [{ name: "Socket Runes" }, { name: "Combine Runes" }, { name: "Runeword Codex" }],
      cta: runesmith ? "Open Runes" : "Locked",
      target: "runes",
      ...(runesmith ? {} : { locked: later }),
    },
    {
      id: "nyssa",
      name: "Nyssa",
      role: "Scout",
      x: 1150,
      y: 600,
      icon: "bow",
      cloak: "#3b5a2c",
      figure: { fs: 1 },
      quote: trainer
        ? `“${road.name}. ${ACTS.find((a) => a.id === road.id)?.focus ?? ""}. At its end: ${road.boss.name}. ${road.boss.description}”`
        : afterBoss,
      actions: [{ name: "Act Preview" }, { name: "Revisit Act" }],
      cta: `Set Out · Act ${road.number}`,
      ...(trainer ? {} : { locked: afterBoss }),
    },
    {
      id: "wagon",
      name: "Supply Wagon",
      role: "Stash",
      x: 1085,
      y: 480,
      icon: "box",
      cloak: "#8a5a32",
      object: { w: 200, h: 200 },
      quote: "Everything you carry but don’t wear. Fixed size, burns at every Prestige.",
      actions: [{ name: "Stash" }, { name: "Inventory" }],
      cta: "Open Stash",
      target: "stash",
    },
  ];
}

/** On-screen size of a figure at fs = 1, in stage pixels. */
const FIG_W = 96;
const FIG_H = 168;

function heirGear(state: GameState): HeirGear {
  const { mainHand, offHand } = state.hero.equipment;
  const off = offHand?.baseId === "round-shield" ? "shield" : offHand ? "focus" : undefined;
  return {
    weapon: mainHand?.baseId === "fire-wand" ? "wand" : "sword",
    ...(off ? { offHand: off } : {}),
  };
}

function Figure(props: { p: Persona; on: boolean; gear: HeirGear; delay: number }) {
  const { p } = props;
  const f = p.figure;
  if (!f) return null;
  // Everybody faces the Hearthfire.
  const mirror = p.x > HEARTH_X;
  return (
    <svg
      width={Math.round(FIG_W * f.fs)}
      height={Math.round(FIG_H * f.fs)}
      viewBox={`0 0 ${FIGURE_W} ${FIGURE_H}`}
      className={props.on ? "figure on" : "figure"}
      aria-hidden="true"
    >
      <g filter={p.locked ? "url(#silhouette)" : undefined}>
        <g className="figure-body" style={{ animationDelay: `${-props.delay}s` }}>
          <g transform={mirror ? `translate(${FIGURE_W} 0) scale(-1 1)` : undefined}>
            <PersonaArt id={p.id} gear={props.gear} />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** The persona's head as a round portrait for the persona card. */
function Portrait(props: { p: Persona; gear: HeirGear }) {
  const { p } = props;
  const box = PORTRAIT[p.id];
  if (!p.figure || !box) return <Icon name={p.icon} size={28} color="#f3e6c8" />;
  return (
    <svg viewBox={box} width="100%" height="100%" aria-hidden="true">
      <g filter={p.locked ? "url(#silhouette)" : undefined}>
        <PersonaArt id={p.id} gear={props.gear} />
      </g>
    </svg>
  );
}

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
  const size = useStageSize();
  const ox = (size.w - SCENE_W) / 2;
  const [road, setRoad] = useState<string | null>(null);
  const acts = actsInOrder(GAME_DATA);
  const next = nextAct(state, GAME_DATA);
  // The road the Heir takes: the next act unless a cleared one is picked to farm it again.
  const act = acts.find((a) => a.id === road && actUnlocked(state, GAME_DATA, a.id)) ?? next;
  const list = personas(state, act);
  const gear = heirGear(state);
  const sel = list.find((p) => p.id === picked) ?? list[0];
  if (!sel) return null;
  const cleared = state.progress.actsCleared.includes(act.id);
  const quote = sel.id === "nan" ? `“${NAN_LINES[nanLine % NAN_LINES.length]}”` : sel.quote;
  const cta = () => {
    if (sel.id === "nan") setNanLine((n) => n + 1);
    else if (sel.id === "nyssa" && !sel.locked) game.dispatch({ type: "setOut", actId: act.id });
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
            <b className="mono">
              {state.flaskCharges}/{PROGRESSION.flaskStartCharges}
            </b>
            <span className="sub">Flask</span>
          </span>
        </div>
        <button type="button" className="icon-button" aria-label="Menu" onClick={props.onMenu}>
          <Icon name="menu" size={20} />
        </button>
      </header>

      <div className="camp-stage">
        <PaintDefs />
        <CampBackdrop roadName={act.name} w={size.w} h={size.h - 64} ox={ox} />
        <CampFx w={size.w} h={size.h - 64} ox={ox} />
        {/* Positions are in mock coordinates (1440 × 900), centered; the scene starts below the header. */}
        {list.map((p, i) => {
          const w = p.object ? p.object.w : 130;
          const h = p.object ? p.object.h : Math.round(FIG_H * (p.figure?.fs ?? 1)) + 34;
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
              onClick={() => setPicked(p.id)}
              onDoubleClick={() => {
                if (p.target && !p.locked) props.onOpen(p.target);
              }}
            >
              <Figure p={p} on={on} gear={gear} delay={i * 0.7} />
              <span className="name-plate title-font">
                {p.locked && <Icon name="lock" size={12} />}
                {p.name}
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
                  {a.name === "Ember Flask"
                    ? `Ember Flask ${state.flaskCharges}/${PROGRESSION.flaskStartCharges}`
                    : a.name}
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
              const open = actUnlocked(state, GAME_DATA, a.id);
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
            <span className="hint-light">Flask refilled · wounds healed</span>
            <button
              type="button"
              className="btn big primary glow"
              onClick={() => game.dispatch({ type: "setOut", actId: act.id })}
            >
              SET OUT · ACT {act.number}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
