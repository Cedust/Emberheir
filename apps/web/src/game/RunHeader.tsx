import { type ActData, waymarkKey, waymarkStages } from "@emberheir/sim";
import { Icon } from "../ui/Icon";
import { actTitle, finaleFoe, inFinale } from "./finale";

/**
 * Act progress as a bar (battle-view-v1.md): Camp, 15 stages, Spoils stages and the Boss. Waymarks
 * (level-v2.md) stand above their stages: lit once reached this run.
 */
export function ActProgress(props: {
  act: ActData;
  stage: number;
  cleared: boolean;
  /** Waymarks reached this run (`progress.waymarks`). */
  waymarks?: readonly string[];
}) {
  const { act, stage } = props;
  const stages = act.stages;
  const width = 760;
  const left0 = 36;
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
      <div className="act-track" style={{ left: left0, right: 20 }} />
      <div
        className="act-track-fill"
        style={{ left: left0, width: (Math.max(0, done) / (stages - 1)) * span }}
      />
      <div className="act-camp" title="Camp">
        <Icon name="camp" size={18} />
      </div>
      {Array.from({ length: stages }, (_, i) => {
        const n = i + 1;
        const cur = n === stage;
        const boss = n === stages || finale;
        const spoils = act.spoilsStages.includes(n);
        const size = cur ? 30 : boss ? 26 : spoils ? 16 : 12;
        const cls = [
          "act-dot",
          n <= done || cur ? "done" : "",
          cur ? "current" : "",
          boss ? "boss" : "",
          spoils ? "spoils" : "",
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
                  : spoils
                    ? `Stage ${n} · Spoils`
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
            style={{ left: left0 + ((n - 1) / (stages - 1)) * span - 5 }}
          />
        );
      })}
    </div>
  );
}

/** Top bar of the run screens: act and stage, progress, Character (C), Skill Tree (T), Menu. */
export function RunHeader(props: {
  act: ActData;
  stage: number;
  sub: string;
  cleared: boolean;
  attributePoints: number;
  skillPoints: number;
  /** Waymarks reached this run; shows the Waymark stages on the act bar. */
  waymarks?: readonly string[];
  onCharacter: () => void;
  onTree: () => void;
  onMenu: () => void;
}) {
  return (
    <header className="run-header bar-top">
      <div className="run-title">
        <span className="title-font">{actTitle(props.act)}</span>
        <span className="sub">{props.sub}</span>
      </div>
      <ActProgress
        act={props.act}
        stage={props.stage}
        cleared={props.cleared}
        {...(props.waymarks ? { waymarks: props.waymarks } : {})}
      />
      <div className="grow" />
      <button type="button" className="hud-button" onClick={props.onCharacter}>
        <Icon name="user" size={18} />
        <span>Character</span>
        <kbd>C</kbd>
        {props.attributePoints > 0 && (
          <span className="badge" aria-label={`${props.attributePoints} unspent points`}>
            {props.attributePoints}
          </span>
        )}
      </button>
      <button
        type="button"
        className="hud-button"
        onClick={props.onTree}
        title="Skill Tree and Battle Plan"
      >
        <Icon name="tree" size={18} />
        <span>Skill Tree</span>
        <kbd>T</kbd>
        {props.skillPoints > 0 && <span className="badge">{props.skillPoints}</span>}
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label="Menu"
        title="Menu (Esc)"
        onClick={props.onMenu}
      >
        <Icon name="menu" size={20} />
      </button>
    </header>
  );
}
