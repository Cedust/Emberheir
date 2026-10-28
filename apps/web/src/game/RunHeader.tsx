import type { ReactNode } from "react";
import { GAME_DATA } from "@emberheir/content";
import {
  type ActData,
  gateStages,
  isWallAct,
  waymarkKey,
  waymarkStages,
  wildfireLevel,
  wildfireName,
} from "@emberheir/sim";
import { Icon } from "../ui/Icon";
import { PointIcon } from "../ui/kit/Points";
import { PaintedFace } from "./camp/art/PersonaArt";
import { actTitle, finaleFoe, inFinale } from "./finale";

/**
 * Act progress as a bar (battle-view-v1.md): Camp, 15 stages, Shrine stages and the Boss. Waymarks
 * (level-v2.md) stand above their stages: lit once reached this run.
 */
export function ActProgress(props: {
  act: ActData;
  stage: number;
  cleared: boolean;
  /** Waymarks reached this run (`progress.waymarks`). */
  waymarks?: readonly string[];
  /** Stages with a Gatekeeper (the newest act's walls). */
  gates?: readonly number[];
}) {
  const { act, stage } = props;
  const stages = act.stages;
  const width = 760;
  // Room after the Camp, so a current Stage 1 never covers it and the rail shows between them.
  const left0 = 68;
  const span = width - left0 - 20;
  const done = props.cleared ? stage : stage - 1;
  // The Last Ember: every stage is a boss, each dot names its echo.
  const finale = inFinale(act);
  const marks = finale || !props.waymarks ? [] : waymarkStages(act);
  return (
    <div
      className="act-progress"
      role="img"
      aria-label={`Stage ${stage} of ${stages}`}
      style={{ width }}
    >
      <div className="act-track" style={{ left: 16, right: 8 }} />
      <div
        className="act-track-fill"
        style={{ left: left0, width: (Math.max(0, done) / (stages - 1)) * span }}
      />
      <div className="act-camp" title="Camp" />
      {Array.from({ length: stages }, (_, i) => {
        const n = i + 1;
        const cur = n === stage;
        const boss = n === stages || finale;
        const shrine = act.shrineStages.includes(n);
        const gate = props.gates?.includes(n) ?? false;
        // Painted markers (sheet 9): their box, the art keeps its own aspect inside.
        const size = cur ? 40 : boss ? 34 : gate ? 30 : shrine ? 22 : 16;
        const cls = [
          "act-dot",
          n <= done || cur ? "done" : "",
          cur ? "current" : "",
          boss ? "boss" : "",
          shrine ? "shrine" : "",
          gate ? "gate" : "",
        ].join(" ");
        return (
          <div
            key={n}
            className={cls}
            title={
              finale
                ? `Stage ${n} · ${finaleFoe(n)}`
                : boss
                  ? `Stage ${n} · Boss`
                  : gate
                    ? `Stage ${n} · Gatekeeper${shrine ? " · Ember Shrine" : ""}`
                    : shrine
                      ? `Stage ${n} · Ember Shrine`
                      : `Stage ${n}`
            }
            style={{
              left: left0 + (i / (stages - 1)) * span - size / 2,
              top: 20 - size / 2,
              width: size,
              height: size,
            }}
          >
            {cur ? n : ""}
          </div>
        );
      })}
      {marks.map((n) => {
        const taken = props.waymarks?.includes(waymarkKey(act.id, n)) ?? false;
        return (
          <span
            key={`waymark-${n}`}
            className={`act-waymark ${taken ? "taken" : ""}`}
            title={taken ? "Waymark reached · +1 Skill Point" : "Waymark · +1 Skill Point"}
            style={{ left: left0 + ((n - 1) / (stages - 1)) * span - 7 }}
          />
        );
      })}
    </div>
  );
}

/** Top bar of the run screens: act and stage, progress, Character (C), Ash Tree (T), Menu. */
export function RunHeader(props: {
  act: ActData;
  stage: number;
  sub: string;
  cleared: boolean;
  attributePoints: number;
  skillPoints: number;
  /** Waymarks reached this run; shows the Waymark stages on the act bar. */
  waymarks?: readonly string[];
  /** Prestige level: the run's newest act shows its Gatekeepers. */
  prestige?: number;
  /** Wildfire tier of the trip: a burning badge, no Waymarks or Gatekeepers. */
  wildfire?: number;
  onCharacter: () => void;
  onTree: () => void;
  onMenu: () => void;
}) {
  return (
    <header className="run-header bar-top">
      <div className="run-title">
        <span className="title-font">{actTitle(props.act)}</span>
        <span className="sub">
          {props.wildfire ? (
            <span
              className="wildfire-badge"
              title={`Monster Level ${wildfireLevel(props.wildfire)}`}
            >
              <Icon name="fire" size={12} />
              {wildfireName(props.wildfire)}
            </span>
          ) : null}
          {props.sub}
        </span>
      </div>
      <ActProgress
        act={props.act}
        stage={props.stage}
        cleared={props.cleared}
        {...(props.waymarks && !props.wildfire ? { waymarks: props.waymarks } : {})}
        {...(props.prestige !== undefined &&
        !props.wildfire &&
        isWallAct(GAME_DATA, props.act, props.prestige)
          ? { gates: gateStages(props.act) }
          : {})}
      />
      <div className="grow" />
      <HudButton name="Character" k="C" onClick={props.onCharacter}>
        <span className="hud-face">
          <PaintedFace id="heir" />
        </span>
        {props.attributePoints > 0 && (
          <span className="badge" aria-label={`${props.attributePoints} unspent points`}>
            {props.attributePoints}
          </span>
        )}
      </HudButton>
      <HudButton name="Ash Tree" tip="Ash Tree and Battle Plan" k="T" onClick={props.onTree}>
        <PointIcon id="skill" size={34} />
        {props.skillPoints > 0 && <span className="badge">{props.skillPoints}</span>}
      </HudButton>
      <HudButton name="Menu" tip="Menu" k="Esc" onClick={props.onMenu}>
        <Icon name="menu" size={22} />
      </HudButton>
    </header>
  );
}

/** A painted square button in the top bar: art only, the name and key on hover (Timo). */
function HudButton(props: {
  name: string;
  tip?: string;
  k: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="hud-icon-btn"
      aria-label={props.name}
      title={`${props.tip ?? props.name} (${props.k})`}
      onClick={props.onClick}
    >
      {props.children}
      <kbd>{props.k}</kbd>
    </button>
  );
}
