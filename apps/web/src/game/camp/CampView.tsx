import { POC_GAME_DATA } from "@emberheir/content";
import { type GameState, PROGRESSION } from "@emberheir/sim";
import { useState } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { useStageSize } from "../../ui/Stage";
import { fmt, walletEntries } from "../../ui/items";
import type { GameApi } from "../useGame";

export type CampTarget =
  "legacy" | "character" | "forge" | "altar" | "kaelen" | "stash" | "compendium";

const HOOD = "M22 50 C22 22 58 22 58 50 C54 36 26 36 22 50 Z";
const CAP = "M24 40 L56 40 L52 30 L28 30 Z";
const HAT = "M20 40 L60 40 L48 34 L40 10 L32 34 Z";
const HELM = "M23 46 C23 26 57 26 57 46 L57 50 L23 50 Z";
const BAND = "M24 40 C30 34 50 34 56 40 L56 44 C50 38 30 38 24 44 Z";

const NAN_LINES = [
  "Sit, child. The fire remembers every one of you, even the clumsy ones.",
  "Heat is a fickle friend. Swords lose it when they rest, wands gather it while they wait.",
  "Gorrak swings slow and hard. When his Heat runs high, be ready.",
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
  readonly figure?: { fs: number; trim: string; skin: string; hat: string };
  readonly locked?: string;
}

function personas(state: GameState): Persona[] {
  const trainer = state.progress.trainerUnlocked;
  const later = "Joins the caravan after Act 2.";
  const afterBoss = `Joins the caravan once ${POC_GAME_DATA.acts[0]?.boss.name ?? "the boss"} falls.`;
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
      figure: { fs: 1.25, trim: "#e8c07a", skin: "#f0c9a0", hat: BAND },
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
      figure: { fs: 0.9, trim: "#c9a063", skin: "#e3b894", hat: HOOD },
      quote: "",
      actions: [{ name: "Talk" }, { name: "Compendium" }, { name: "Ember Flask" }],
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
      figure: { fs: 1.1, trim: "#8a5a32", skin: "#d9a07a", hat: CAP },
      quote: "“Bring me steel. I’ll bring it back better. Mostly.”",
      actions: [{ name: "Upgrade" }, { name: "Add Socket", later: true }, { name: "Salvage" }],
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
      figure: { fs: 0.95, trim: "#ffd84a", skin: "#e8b890", hat: BAND },
      quote: "Joins the caravan later.",
      actions: [{ name: "Base Items" }, { name: "Gamble" }],
      cta: "Locked",
      locked: "later",
    },
    {
      id: "liora",
      name: "Liora",
      role: "Mystic",
      x: 640,
      y: 470,
      icon: "eye",
      cloak: "#2d5bd0",
      figure: { fs: 0.95, trim: "#6fd3ff", skin: "#f0d0b0", hat: HOOD },
      quote: trainer ? "“I foresaw you would come. I also foresee you paying.”" : afterBoss,
      actions: [{ name: "Reforge" }, { name: "Temper" }, { name: "Imbue" }, { name: "Distill" }],
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
      figure: { fs: 1.05, trim: "#c9c2b8", skin: "#d9a784", hat: HELM },
      quote: trainer ? "“Late to one battle. Never late to training.”" : afterBoss,
      actions: [{ name: "Skill Tree" }, { name: "Battle Plan" }, { name: "Respec" }],
      cta: trainer ? "Open Skill Tree" : "Locked",
      target: "kaelen",
      ...(trainer ? {} : { locked: "boss" }),
    },
    {
      id: "eldrin",
      name: "Eldrin",
      role: "Runesmith",
      x: 950,
      y: 520,
      icon: "rune",
      cloak: "#4f7a3a",
      figure: { fs: 1, trim: "#c9a063", skin: "#e0b894", hat: HAT },
      quote: later,
      actions: [{ name: "Socket Runes" }, { name: "Combine Runes" }, { name: "Runeword Codex" }],
      cta: "Locked",
      locked: "later",
    },
    {
      id: "nyssa",
      name: "Nyssa",
      role: "Scout",
      x: 1150,
      y: 600,
      icon: "bow",
      cloak: "#3b5a2c",
      figure: { fs: 1, trim: "#b5d82c", skin: "#d9a784", hat: HOOD },
      quote: later,
      actions: [{ name: "Act Preview" }, { name: "Revisit Act" }],
      cta: "Locked",
      locked: "later",
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

function Figure(props: { p: Persona; on: boolean }) {
  const { p } = props;
  const f = p.figure;
  if (!f) return null;
  const locked = !!p.locked;
  const stroke = locked ? "#1c1a18" : "#2a1f17";
  const dash = locked ? "5 4" : undefined;
  const cloak = locked ? "#5a5550" : p.cloak;
  const trim = locked ? "#7a7570" : f.trim;
  const skin = locked ? "#8a8580" : f.skin;
  return (
    <svg
      width={Math.round(80 * f.fs)}
      height={Math.round(140 * f.fs)}
      viewBox="0 0 80 140"
      className={props.on ? "figure on" : "figure"}
      aria-hidden="true"
    >
      <ellipse cx="40" cy="136" rx="30" ry="6" fill="#1c1a18" opacity="0.35" />
      <path
        d="M16 136 C16 92 24 66 40 66 C56 66 64 92 64 136 Z"
        fill={cloak}
        stroke={stroke}
        strokeWidth="2.5"
        strokeDasharray={dash}
        strokeLinejoin="round"
      />
      <path
        d="M28 136 L32 96 L48 96 L52 136"
        fill={trim}
        stroke={stroke}
        strokeWidth="2"
        strokeDasharray={dash}
        opacity="0.9"
      />
      <circle
        cx="40"
        cy="48"
        r="17"
        fill={skin}
        stroke={stroke}
        strokeWidth="2.5"
        strokeDasharray={dash}
      />
      <path
        d={f.hat}
        fill={trim}
        stroke={stroke}
        strokeWidth="2.5"
        strokeDasharray={dash}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Width of the drawn camp; wider screens see more sky, hills and ground at the sides. */
const SCENE_W = 1440;
const BLEED = 1200;

function Scene(props: { roadName: string; w: number; h: number; ox: number }) {
  const { w, h, ox } = props;
  return (
    <svg
      className="camp-scene"
      width={w}
      height={h}
      viewBox={`${-ox} 0 ${w} ${h}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="camp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#27313d" />
          <stop offset="0.55" stopColor="#6b5a57" />
          <stop offset="1" stopColor="#d58a4e" />
        </linearGradient>
        <linearGradient id="camp-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3f2c" />
          <stop offset="1" stopColor="#241d16" />
        </linearGradient>
        <radialGradient id="camp-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffb13b" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#ff7a2a" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="camp-clearing" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#9a7446" />
          <stop offset="0.7" stopColor="#6c5433" />
          <stop offset="1" stopColor="#4a3f2c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={-BLEED} y="0" width={SCENE_W + 2 * BLEED} height="320" fill="url(#camp-sky)" />
      <circle cx="1180" cy="120" r="28" fill="#f6dca8" opacity="0.8" />
      <path
        d="M-1200 280 Q-900 230 -600 285 T-240 260 T0 300 Q120 230 240 280 T480 270 T760 250 T1040 275 T1300 245 T1440 270 T1700 250 T2000 280 T2300 255 T2640 270 L2640 330 L-1200 330 Z"
        fill="#4a3e33"
      />
      <path
        d="M-300 305 L-240 215 L-180 305 Z M-120 300 L-80 240 L-40 300 Z M0 300 L40 220 L80 300 Z M60 310 L110 200 L160 310 Z M1260 310 L1310 190 L1360 310 Z M1340 305 L1390 230 L1440 305 Z M1500 300 L1550 210 L1600 300 Z M1640 310 L1680 250 L1720 310 Z"
        fill="#2f2822"
        stroke="#141210"
        strokeWidth="2"
      />
      <rect
        x={-BLEED}
        y="310"
        width={SCENE_W + 2 * BLEED}
        height={Math.max(526, h - 310)}
        fill="url(#camp-ground)"
      />
      <ellipse cx="720" cy="560" rx="620" ry="250" fill="url(#camp-clearing)" />
      <path
        d="M2640 400 L1440 470 C1330 500 1260 560 1250 620 C1240 700 1300 780 1320 836 L1360 1400 L2640 1400 Z"
        fill="#8b6c45"
        opacity="0.8"
      />
      <path
        d="M2640 400 L1440 470 C1330 500 1260 560 1250 620 C1240 700 1300 780 1320 836 L1360 1400"
        fill="none"
        stroke="#2a1f17"
        strokeWidth="2.5"
        opacity="0.6"
      />
      <g stroke="#2a1f17" strokeWidth="2.5" strokeLinejoin="round">
        <path d="M470 300 L540 225 L610 300 Z" fill="#c9a979" />
        <path d="M540 225 L540 300" fill="none" />
        <path d="M800 296 L875 215 L950 296 Z" fill="#b89768" />
        <path d="M875 215 L875 296" fill="none" />
        <path d="M660 290 L720 238 L780 290 Z" fill="#a8401a" opacity="0.9" />
      </g>
      <g stroke="#2a1f17" strokeWidth="2.5" strokeLinejoin="round">
        <path d="M1010 330 Q1085 250 1160 330 Z" fill="#e6d6b4" />
        <rect x="1000" y="326" width="170" height="54" rx="4" fill="#8a5a32" />
        <path d="M1010 346 L1160 346" fill="none" opacity="0.5" />
        <circle cx="1030" cy="386" r="22" fill="#5e4a36" />
        <circle cx="1030" cy="386" r="6" fill="#2a1f17" />
        <circle cx="1140" cy="386" r="22" fill="#5e4a36" />
        <circle cx="1140" cy="386" r="6" fill="#2a1f17" />
        <rect x="1060" y="300" width="36" height="28" fill="#a88d62" />
        <rect x="1100" y="306" width="28" height="22" fill="#7a5a24" />
      </g>
      <g stroke="#2a1f17" strokeWidth="2.5" strokeLinejoin="round">
        <path d="M110 390 Q190 310 270 390 Z" fill="#d9c6a0" />
        <rect x="100" y="386" width="180" height="56" rx="4" fill="#7a4a28" />
        <circle cx="126" cy="448" r="22" fill="#5e4a36" />
        <circle cx="126" cy="448" r="6" fill="#2a1f17" />
        <circle cx="254" cy="448" r="22" fill="#5e4a36" />
        <circle cx="254" cy="448" r="6" fill="#2a1f17" />
        <path
          d="M300 470 L360 470 L352 482 L340 482 L340 506 L360 514 L300 514 L320 506 L320 482 L296 478 Z"
          fill="#4a4a4e"
        />
      </g>
      <g stroke="#2a1f17" strokeWidth="2.5" strokeLinejoin="round">
        <rect x="360" y="398" width="110" height="40" fill="#8a5a32" />
        <path d="M350 398 L480 398 L466 368 L364 368 Z" fill="#a8401a" />
        <circle cx="385" cy="392" r="6" fill="#ffd84a" />
        <rect x="408" y="384" width="16" height="14" fill="#5b8cff" />
        <circle cx="448" cy="391" r="7" fill="#b36bff" />
      </g>
      <ellipse className="hearth-glow" cx="720" cy="560" rx="260" ry="150" fill="url(#camp-glow)" />
      <g stroke="#2a1f17" strokeWidth="2.5" strokeLinejoin="round">
        <ellipse cx="720" cy="612" rx="70" ry="14" fill="#1c1a18" opacity="0.35" stroke="none" />
        <path
          d="M684 610 L700 560 M756 610 L740 560 M720 614 L720 566"
          fill="none"
          strokeWidth="5"
        />
        <path d="M660 546 Q720 600 780 546 Z" fill="#4a4a4e" />
        <path d="M660 546 L780 546" fill="none" />
        <path
          className="flame"
          d="M676 546 C672 510 700 500 694 470 C716 488 712 460 724 440 C732 470 752 470 748 500 C762 490 766 520 764 546 Z"
          fill="#ff6a2b"
        />
        <path
          d="M694 546 C692 522 708 516 706 496 C718 506 718 490 726 478 C732 500 744 506 742 546 Z"
          fill="#ffb13b"
          strokeWidth="2"
        />
        <path
          d="M708 546 C708 532 716 526 716 516 C724 524 730 532 728 546 Z"
          fill="#fff0c0"
          stroke="none"
        />
      </g>
      <g fill="#ffb13b" stroke="none" className="sparks">
        <circle cx="700" cy="430" r="2.5" />
        <circle cx="742" cy="412" r="2" />
        <circle cx="724" cy="392" r="1.8" />
        <circle cx="760" cy="440" r="2" />
      </g>
      <g stroke="#2a1f17" strokeWidth="2.5" strokeLinejoin="round">
        <rect x="1300" y="560" width="10" height="110" fill="#7a5a24" />
        <path d="M1220 574 L1370 574 L1392 596 L1370 618 L1220 618 Z" fill="#e6d6b4" />
        <text
          x="1300"
          y="602"
          textAnchor="middle"
          stroke="none"
          fill="#2a1f17"
          className="title-font"
          style={{ fontSize: 16, fontWeight: 700 }}
        >
          {props.roadName}
        </text>
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
  const act = POC_GAME_DATA.acts[0];
  const list = personas(state);
  const sel = list.find((p) => p.id === picked) ?? list[0];
  if (!act || !sel) return null;
  const cleared = state.progress.actsCleared.includes(act.id);
  const quote = sel.id === "nan" ? `“${NAN_LINES[nanLine % NAN_LINES.length]}”` : sel.quote;
  const cta = () => {
    if (sel.id === "nan") setNanLine((n) => n + 1);
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
          <span className="title-font">Camp at the {act.name}</span>
          <span className="sub">
            {state.legacy.prestige > 0 ? `Generation ${state.legacy.prestige + 1} · ` : ""}
            {cleared
              ? `Act ${act.number} cleared · farm it again or prepare for the next Act`
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
        <Scene roadName={act.name} w={size.w} h={size.h - 64} ox={ox} />
        {/* Positions are in mock coordinates (1440 × 900), centered; the scene starts below the header. */}
        {list.map((p) => {
          const w = p.object ? p.object.w : 130;
          const h = p.object ? p.object.h : Math.round(140 * (p.figure?.fs ?? 1)) + 34;
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
              <Figure p={p} on={on} />
              <span className="name-plate title-font">
                {p.locked && <Icon name="lock" size={12} />}
                {p.name}
              </span>
            </button>
          );
        })}

        <section className="persona-card panel-card" aria-label={sel.name}>
          <div className="persona-head">
            <div className="persona-portrait" style={{ background: sel.cloak }}>
              <Icon name={sel.icon} size={28} color="#f3e6c8" />
            </div>
            <div className="plaque-names">
              <span className="title-font big">{sel.name}</span>
              <span className="sub">{sel.role}</span>
            </div>
          </div>
          <p className="quote">{quote}</p>
          <div className="chip-row">
            {sel.actions.map((a) =>
              sel.id === "nan" && a.name === "Compendium" ? (
                <button
                  key={a.name}
                  type="button"
                  className="action-chip link"
                  onClick={() => props.onOpen("compendium")}
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
    </section>
  );
}
