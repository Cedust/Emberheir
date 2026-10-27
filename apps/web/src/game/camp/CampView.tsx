import { GAME_DATA } from "@emberheir/content";
import {
  finaleOpen,
  flaskCapacity,
  type GameState,
  LINEAGE_STEPS,
  masteryPointsLeft,
  nextAct,
  hasMet,
} from "@emberheir/sim";
import { Icon } from "../../ui/Icon";
import { KeyHint } from "../../ui/kit/Button";
import { Wallet } from "../../ui/kit/Currency";
import { HOTKEYS } from "../../ui/kit/hotkeys";
import { Marker } from "../../ui/kit/Marker";
import { Presence } from "../../ui/kit/juice";
import { useStageSize } from "../../ui/Stage";
import { completedCollections } from "../collections";
import { bossName } from "../labels";
import type { GameApi } from "../useGame";
import { CampLight } from "./art/CampLight";
import { CampBackdrop, CampFx, campLights, SCENE_W } from "./art/CampScene";
import { PaintDefs } from "./art/paint";
import { FIG_H, Figure, heirGear, markerSpot, tipSpot } from "./CampFigures";
import { type CampTarget, type Persona, personas } from "./campPersonas";
import { NanWindow } from "./NanWindow";
import { RoadStrip, RoadWindow, useRoadPlan } from "./RoadWindow";

/** Persona buttons that a key also opens (ui-ux-plan-v1.md 3.5). */
const CTA_KEY: Partial<Record<CampTarget, string>> = {
  character: HOTKEYS.character,
  kaelen: HOTKEYS.tree,
  legacy: HOTKEYS.legacy,
};

/** Where a click on a persona leads: Old Nan and Eldrin have their own small windows. */
function targetOf(p: Persona): CampTarget | undefined {
  if (p.id === "nan") return "nan";
  if (p.id === "eldrin") return "road";
  return p.target;
}

/**
 * The Camp (ui-ux-plan-v1.md 4.1): a painted scene where one click on a persona opens its
 * window. Markers over the heads say where points or a bounty wait; only the road and Set Out
 * stay at the bottom, the rest of the trip is planned at Eldrin.
 */
export function CampView(props: {
  state: GameState;
  game: GameApi;
  /** Old Nan's or Eldrin's window, when open. */
  panel?: "nan" | "road" | null;
  onOpen: (target: CampTarget) => void;
  onClosePanel: () => void;
  onMenu: () => void;
  /** The persona whose window is open: the camera leans in on them. */
  focus?: string | null;
  /** Camera moves allowed (the Screen shake setting). */
  zoom?: boolean;
}) {
  const { state, game } = props;
  const size = useStageSize();
  const ox = (size.w - SCENE_W) / 2;
  const plan = useRoadPlan(state, game);
  const { act } = plan;
  const next = nextAct(state, GAME_DATA);
  // The caravan camps in the next act's land; once the last flame is in reach, in the cold crater.
  const campAct = finaleOpen(state, GAME_DATA) ? 8 : next.number;
  // Personas who have not joined the caravan yet are not in the Camp at all.
  const list = personas(state, act).filter((p) => !p.locked);
  const hearthY = list.find((p) => p.id === "hearth")?.y ?? 0;
  const gear = heirGear(state);
  const cleared = state.progress.actsCleared.includes(act.id);
  const flask = `${state.flaskCharges}/${flaskCapacity(state, GAME_DATA)}`;
  const focused = props.zoom !== false ? list.find((p) => p.id === props.focus) : undefined;
  const sceneH = size.h - 64;
  // Lean in on the focused persona: zoom around them, but never past the scene's edges.
  const camera = focused
    ? {
        transformOrigin: `${Math.round(ox + focused.x)}px ${Math.round(Math.min(sceneH, Math.max(0, focused.y - 64 - FIG_H / 2)))}px`,
      }
    : undefined;
  const markers: Partial<Record<string, number | "!">> = {
    heir: state.hero.unspentAttributePoints,
    kaelen: state.hero.unspentSkillPoints + masteryPointsLeft(state, GAME_DATA),
    eldrin: state.bountyDone ? "!" : 0,
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
              : `Act ${act.number} · Boss: ${bossName(state, act)}`}
            {state.progress.deathsInAct > 0 ? ` · Pity ${state.progress.deathsInAct}` : ""}
          </span>
        </div>
        <div className="grow" />
        <Wallet state={state} className="camp-wallet" extra={[{ id: "flask", amount: flask }]} />
        <button type="button" className="icon-button" aria-label="Menu" onClick={props.onMenu}>
          <Icon name="menu" size={20} />
        </button>
      </header>

      <div className="camp-stage">
        <div className={`camp-camera${focused ? " focus" : ""}`} style={camera}>
          <PaintDefs />
          <CampBackdrop
            w={size.w}
            h={size.h - 64}
            ox={ox}
            banners={completedCollections(state)}
            ancestor={(state.lineage?.length ?? 0) >= LINEAGE_STEPS}
            act={campAct}
          />
          <CampFx w={size.w} h={size.h - 64} ox={ox} part="back" act={campAct} />
          <CampFx w={size.w} h={size.h - 64} ox={ox} part="hearth" />
          {/* Positions are in mock coordinates (1440 × 900), centered; the scene starts below the header. */}
          {list.map((p, i) => {
            const w = p.object ? p.object.w : 130;
            const h = p.object ? p.object.h : Math.round(FIG_H * (p.figure?.fs ?? 1));
            const target = targetOf(p);
            const key = target ? CTA_KEY[target] : undefined;
            const marker = markers[p.id] ?? 0;
            return (
              <button
                key={p.id}
                type="button"
                className="camp-target"
                style={{
                  left: ox + p.x - w / 2,
                  top: p.y - h - 64,
                  width: w,
                  height: h,
                  // The Hearthfire (z-index 1) stands in front of whoever is behind it.
                  ...(p.object?.front ? { zIndex: 1 } : p.y > hearthY ? { zIndex: 2 } : {}),
                }}
                aria-label={`${p.name}, ${p.role}`}
                onClick={() => {
                  if (target) props.onOpen(target);
                }}
              >
                <Figure
                  p={p}
                  on={false}
                  gear={gear}
                  delay={i * 0.7}
                  {...(p.id === "eldrin" ? { sign: act.name } : {})}
                />
                {marker !== 0 && (
                  <span
                    className={`camp-marker${marker === "!" ? " quest" : ""}`}
                    style={markerSpot(p, w, h)}
                    aria-label={p.id === "eldrin" ? "Bounty done" : `${marker} points waiting`}
                  >
                    <Marker value={marker} />
                  </span>
                )}
                <span className="camp-tip" role="tooltip" style={tipSpot(p, w, h)}>
                  <span className="title-font">
                    {p.name}
                    {key && <KeyHint k={key} />}
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
            lights={campLights({ orb: hasMet(state, "liora") })}
          />
        </div>

        <div className="set-out">
          <RoadStrip state={state} plan={plan} />
          <button
            type="button"
            className={`btn big primary glow set-out-button${plan.tier > 0 ? " wildfire-go" : ""}`}
            onClick={() => (plan.ready ? plan.setOut() : props.onOpen("road"))}
          >
            {plan.label}
          </button>
        </div>
      </div>
      <Presence>
        {props.panel === "road" && (
          <RoadWindow state={state} game={game} plan={plan} onClose={props.onClosePanel} />
        )}
      </Presence>
      <Presence>
        {props.panel === "nan" && (
          <NanWindow
            state={state}
            game={game}
            onCompendium={() => props.onOpen("compendium")}
            onClose={props.onClosePanel}
          />
        )}
      </Presence>
    </section>
  );
}
