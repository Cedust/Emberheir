import { ClassEmblem, MasteryEmblem } from "./ClassEmblem";
import { GAME_DATA, SKILL_TREE } from "@emberheir/content";
import {
  type GameState,
  PROGRESSION,
  actsInRun,
  branchTier,
  classTitle,
  emberPenalty,
  getAct,
  heroClassOf,
  heroTitle,
  keystoneLimit,
  levelCap,
  openBranches,
  prestigeBranchNodes,
  prestigeRewards,
} from "@emberheir/sim";
import { useState } from "react";
import actUrl from "../assets/ui/stage-boss.webp";
import attributePointsUrl from "../assets/harvest/attribute-points.webp";
import battlePlanUrl from "../assets/harvest/battle-plan.webp";
import keystonePlaceUrl from "../assets/harvest/keystone-place.webp";
import levelCapUrl from "../assets/harvest/level-cap.webp";
import leafUrl from "../assets/tree/leaves-3.webp";
import { GAME_ICONS } from "../ui/gameIcons";
import { useNoteHover } from "../ui/ItemTooltip";
import { Button } from "../ui/kit/Button";
import { Window, WindowHeader, WindowLayer } from "../ui/kit/Window";
import { draughtIconUrl } from "../ui/Potion";
import { backdropUrl } from "./battle/arenaBackdrop";
import { PersonaPortrait } from "./camp/art/PersonaArt";
import { PaintDefs } from "./camp/art/paint";
import type { GameApi } from "./useGame";

/** The boss's last words when its fall starts the harvest. */
const LAST_WORDS: Record<string, string> = {
  "ashen-fields": "Hrrk... the Harvester... will want... its field back...",
  rotwood: "Rot... returns... The Harvester... always... reaps...",
  "ember-wastes": "The fire... was never... mine...",
  "frost-peaks": "Cold... keeps... nothing... from it...",
  "storm-spires": "The storm... was only... its breath...",
  "void-rift": "Even nothing... gets... harvested...",
  emberfall: "You cannot keep... the ember... Heir... It always... grows back...",
};

const ROMAN = ["", "I", "II", "III", "IV", "V"];

/** Colour of the Ash Tree region a Mastery grows from. */
const BRANCH_COLORS: Record<string, string> = {
  core: "#c9a063",
  steel: "var(--tone-physical)",
  blood: "var(--tone-bleed)",
  venom: "var(--tone-poison)",
  flame: "var(--tone-fire)",
  storm: "var(--tone-lightning)",
  frost: "var(--tone-cold)",
  void: "var(--tone-void)",
  trunk: "#c9a063",
  roots: "#d08a4a",
};

/** Exploding embers for the Victory step (fixed shape). */
const SHARDS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  const r = i % 2 ? 70 : 92;
  const p = (d: number) =>
    `${(110 + Math.cos(a) * d).toFixed(0)} ${(110 + Math.sin(a) * d).toFixed(0)}`;
  return `M${p(28)} L${p(r)}`;
}).join(" ");

interface Gain {
  readonly id: string;
  readonly icon: string;
  readonly name: string;
  readonly value?: string;
  readonly explain: string;
  readonly tone?: "new" | "bad";
}

/** One line of "You gain": painted icon, name, number; the tooltip says what it does. */
function GainRow(props: { gain: Gain }) {
  const g = props.gain;
  const hover = useNoteHover({ name: g.name, kind: "The Harvest", explain: g.explain });
  return (
    <li className={`harvest-gain ${g.tone ?? ""}`} data-gain={g.id} tabIndex={0} {...hover}>
      <img src={g.icon} alt="" draggable={false} />
      <span className="title-font harvest-gain-name">{g.name}</span>
      {g.value && <span className="title-font harvest-gain-value">{g.value}</span>}
    </li>
  );
}

/** Everything the coming generation gets (and the one thing it loses), in the order it matters. */
function harvestGains(state: GameState): Gain[] {
  const prestige = state.legacy.prestige + 1;
  const r = prestigeRewards(GAME_DATA, prestige);
  const final = prestige >= PROGRESSION.finalPrestige;
  const acts = actsInRun(GAME_DATA, prestige);
  const newAct = acts.length > actsInRun(GAME_DATA, prestige - 1).length ? acts.at(-1) : undefined;
  const penalty = emberPenalty({ ...state, legacy: { ...state.legacy, prestige } });
  const vial = draughtIconUrl("vigor-draught");
  return [
    final
      ? {
          id: "act",
          icon: actUrl,
          name: "The Last Ember",
          explain:
            "Six Warden echoes, then the Harvester's Core. The road to it starts in the Camp.",
          tone: "new" as const,
        }
      : {
          id: "act",
          icon: actUrl,
          name: newAct ? `Act ${newAct.number} · ${newAct.name}` : `${acts.length} Acts`,
          value: `Lv ${r.levelBand.start}–${r.levelBand.end}`,
          explain: "The road leads one act further. Monsters of this run have these levels.",
          tone: "new" as const,
        },
    ...(final
      ? []
      : [
          {
            id: "level-cap",
            icon: levelCapUrl,
            name: "Level Cap",
            value: `${levelCap(prestige - 1)} → ${r.levelCap}`,
            explain: "How high you can level in this run.",
          },
        ]),
    {
      id: "skill-points",
      icon: leafUrl,
      name: "Skill Points",
      value: `+${r.skillPoints}`,
      explain: "Spend them in the Ash Tree at Kaelen.",
    },
    {
      id: "attribute-points",
      icon: attributePointsUrl,
      name: "Attribute Points",
      value: `+${r.attributePoints}`,
      explain: "Spend them in the Character Sheet.",
    },
    ...(r.planUpgrade
      ? [
          {
            id: "battle-plan",
            icon: battlePlanUrl,
            name: r.planUpgrade,
            explain: "New in your Battle Plan. Set it up at Kaelen.",
          },
        ]
      : []),
    ...(r.keystones > keystoneLimit(prestige - 1)
      ? [
          {
            id: "keystones",
            icon: keystonePlaceUrl,
            name: "Keystone Place",
            value: `${r.keystones}`,
            explain: "You can learn one more Keystone at once.",
          },
        ]
      : []),
    ...(prestige === 1 && vial
      ? [
          {
            id: "draughts",
            icon: vial,
            name: "Draughts",
            explain:
              "Liora brews Iron, Ward and Vigor: a Flask charge and a few Acorns for a Draught that lasts the whole trip. Beat a foe of an element to learn its brew too.",
          },
        ]
      : []),
    ...(penalty > emberPenalty(state)
      ? [
          {
            id: "ember-penalty",
            icon: GAME_ICONS.elemental,
            name: "Ember Penalty",
            value: `−${Math.round(penalty * 100)} % Res`,
            explain: `Every Resistance is ${Math.round(penalty * 100)} % lower in this run. Gear with Resistance for the next act helps.`,
            tone: "bad" as const,
          },
        ]
      : []),
  ];
}

/**
 * Prestige flow (2 steps): Victory over the act's boss in the burning act, then The Harvest, one
 * window with the Mastery pick and everything the next generation gets. Attribute Points wait in
 * the Character Sheet. Let It Burn wakes the Heir in the Camp.
 */
export function PrestigeView(props: {
  state: GameState;
  game: GameApi;
  /** Let It Burn was pressed with this Mastery: the window burns away over the Camp. */
  onBurn?: (branch: string | undefined) => void;
  /** A still copy of The Harvest for the burn, with the Mastery that was taken. */
  frozen?: { branch: string | undefined };
}) {
  const { state, game, frozen } = props;
  const pending = state.pendingPrestige;
  const [step, setStep] = useState<"victory" | "harvest">(frozen ? "harvest" : "victory");
  // Only the class's own Masteries grow (klassengeruest-v1.md 5), in the class's order.
  const heroClass = heroClassOf(state, GAME_DATA);
  const open = openBranches(state, GAME_DATA);
  const title = heroTitle(state, GAME_DATA);
  const titleWith = (id: string) =>
    classTitle(heroClass, [...state.legacy.branches, id], GAME_DATA.branchEpithets);
  const [branch, setBranch] = useState<string | undefined>(() =>
    frozen ? frozen.branch : open[0]?.id,
  );
  if (!pending) return null;
  const final = state.legacy.prestige + 1 >= PROGRESSION.finalPrestige;
  const act = getAct(GAME_DATA, pending.actId);
  const backdrop = {
    "--prestige-art": `url(${backdropUrl(act.number) ?? ""})`,
  } as React.CSSProperties;
  const finish = () => {
    props.onBurn?.(branch);
    game.dispatchAll([
      { type: "prestige", ...(branch ? { branchId: branch } : {}) },
      { type: "dismissNotice" },
    ]);
  };

  if (step === "victory") {
    return (
      <section className="screen prestige prestige-victory" aria-label="Victory" style={backdrop}>
        <div className="victory-content">
          <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true">
            <circle cx="110" cy="110" r="100" fill="rgb(255 138 58 / 0.12)" />
            <circle cx="110" cy="110" r="64" fill="rgb(255 138 58 / 0.22)" />
            <path d={SHARDS} stroke="#ffb13b" strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="110" cy="110" r="18" fill="#ffb13b" />
          </svg>
          <h2 className="victory-title title-font">
            {(pending.enemyName.split(",")[0] ?? "").toUpperCase()} FALLS
          </h2>
          <p className="victory-quote">
            &ldquo;{LAST_WORDS[pending.actId] ?? "...the Harvester... will come for you..."}&rdquo;
          </p>
          <p className="victory-sub">
            {final
              ? "The Harvester breaks apart. Its ember flees into one last flame, and this time nothing burns."
              : pending.actId === "emberfall"
                ? "The Harvester breaks apart. Its ember scatters, and the world burns."
                : "The sky catches fire: the Ashen Harvester comes to reap what grew."}
          </p>
          <Button big variant="primary" onClick={() => setStep("harvest")}>
            {final ? "Keep Everything" : "Pack the Caravan"}
          </Button>
        </div>
      </section>
    );
  }

  const gains = harvestGains(state);
  return (
    <section className="screen prestige prestige-harvest" aria-label="The Harvest" style={backdrop}>
      <PaintDefs />
      <WindowLayer>
        <Window
          label="Harvest"
          className="harvest-window"
          header={
            <WindowHeader
              title="The Harvest"
              sub={`Generation ${state.legacy.prestige + 2}`}
              medallion={<ClassEmblem classId={heroClass.id} size={44} />}
            />
          }
        >
          <div className="harvest-body">
            {open.length > 0 && (
              <div className="harvest-col" role="group" aria-label="Mastery">
                <span className="eyebrow">
                  {state.legacy.branches.length ? "Grow a Mastery" : "Choose your Mastery"}
                </span>
                <div className="branch-picks harvest-picks">
                  {open.map((b) => (
                    <MasteryPick
                      key={b.id}
                      state={state}
                      branchId={b.id}
                      on={b.id === branch}
                      newTitle={
                        ![title, b.name].includes(titleWith(b.id)) ? titleWith(b.id) : undefined
                      }
                      onPick={() => setBranch(b.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="harvest-col">
              <span className="eyebrow">You gain</span>
              <ul className="harvest-gains" aria-label="You gain">
                {gains.map((g) => (
                  <GainRow key={g.id} gain={g} />
                ))}
              </ul>
            </div>
          </div>
          <footer className="harvest-foot">
            <span className="nan-portrait">
              <PersonaPortrait id="nan" />
            </span>
            <span className="quote">
              {final
                ? "Old Nan: \u201cEverything you own is yours to keep. Now go and put it out.\u201d"
                : "Old Nan: \u201cThe caravan got your things out. Every last one.\u201d"}
            </span>
            <div className="grow" />
            <Button
              big
              variant="primary"
              blocked={open.length > 0 && !branch ? "Choose a Mastery first." : null}
              onClick={frozen ? () => {} : finish}
            >
              {final ? "Keep Everything" : "Let It Burn"}
            </Button>
          </footer>
        </Window>
      </WindowLayer>
    </section>
  );
}

/** A Mastery card of The Harvest: emblem, name and tier, what it does, what this tier brings. */
function MasteryPick(props: {
  state: GameState;
  branchId: string;
  on: boolean;
  newTitle: string | undefined;
  onPick: () => void;
}) {
  const b = SKILL_TREE.prestigeBranches?.find((x) => x.id === props.branchId);
  if (!b) return null;
  const tier = branchTier(props.state.legacy.branches, b.id) + 1;
  const nodes = prestigeBranchNodes(SKILL_TREE, b.id).filter((n) => (n.tier ?? 1) === tier);
  const skill = nodes.find((n) => n.skill)?.skill;
  const keystone = nodes.find((n) => n.kind === "keystone");
  const notable = nodes.find((n) => n.kind === "notable");
  const brings = [skill?.name, tier > 1 ? notable?.name : undefined, keystone?.name].filter(
    (x): x is string => !!x,
  );
  return (
    <button
      type="button"
      className={`branch-pick panel-card ${props.on ? "on" : ""} ${tier > 1 ? `deepen tier-${tier}` : ""}`}
      aria-pressed={props.on}
      style={{ "--branch": BRANCH_COLORS[b.branch] } as React.CSSProperties}
      onClick={props.onPick}
    >
      <MasteryEmblem masteryId={b.id} size={60} />
      <span className="branch-pick-text">
        <span className="title-font branch-pick-name">
          {b.name}
          {tier > 1 ? ` ${ROMAN[tier]}` : ""}
        </span>
        <span className="sub">{b.theme}</span>
        {props.newTitle && <span className="title-change title-font">→ {props.newTitle}</span>}
      </span>
      <span className="branch-pick-brings title-font">
        {brings.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </span>
    </button>
  );
}

/** Drifting sparks along the burning edge: fixed spread, each with its own delay. */
const SPARKS = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  delay: ((i * 53) % 17) / 10,
  size: 3 + ((i * 7) % 4),
}));

/**
 * Let It Burn (Timo): The Harvest burns away from the bottom up over the Camp, a ragged glowing
 * edge with charred paper above it and sparks rising. Looks only; the Prestige is already done.
 */
export function HarvestBurn(props: { children: React.ReactNode; onDone: () => void }) {
  return (
    <div
      className="harvest-burn"
      aria-hidden="true"
      inert
      onAnimationEnd={(e) => e.target === e.currentTarget && props.onDone()}
    >
      <div className="harvest-burn-page">
        {props.children}
        <div className="harvest-burn-char" />
      </div>
      <svg className="harvest-burn-edge" viewBox="0 0 1000 100" preserveAspectRatio="none">
        <defs>
          <filter id="harvest-burn-rag" x="0" y="-50%" width="100%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.009 0.07" numOctaves="3" seed="7" />
            <feDisplacementMap
              in="SourceGraphic"
              scale="110"
              xChannelSelector="R"
              yChannelSelector="G"
            />
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
          <linearGradient id="harvest-burn-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a0e04" stopOpacity="0" />
            <stop offset="0.3" stopColor="#3a1406" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#ff7a1e" />
            <stop offset="0.52" stopColor="#ffe08a" />
            <stop offset="0.6" stopColor="#ff5a10" />
            <stop offset="1" stopColor="#ff5a10" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect
          x="-40"
          y="10"
          width="1080"
          height="80"
          fill="url(#harvest-burn-glow)"
          filter="url(#harvest-burn-rag)"
        />
      </svg>
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="harvest-burn-spark"
          style={
            {
              left: `${s.x}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
