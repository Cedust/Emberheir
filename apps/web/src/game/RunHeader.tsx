import type { ActData } from "@emberheir/sim";
import { Icon } from "../ui/Icon";

/** Act progress as a bar (battle-view-v1.md): Camp, 15 stages, Spoils stages and the Boss. */
export function ActProgress(props: { act: ActData; stage: number; cleared: boolean }) {
  const { act, stage } = props;
  const stages = act.monsterLevels.length;
  const width = 760;
  const left0 = 36;
  const span = width - left0 - 20;
  const done = props.cleared ? stage : stage - 1;
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
        const boss = n === stages;
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
            title={boss ? `Stage ${n} · Boss` : spoils ? `Stage ${n} · Spoils` : `Stage ${n}`}
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
  treeUnlocked: boolean;
  skillPoints: number;
  onCharacter: () => void;
  onTree: () => void;
  onMenu: () => void;
}) {
  return (
    <header className="run-header bar-top">
      <div className="run-title">
        <span className="title-font">
          Act {props.act.number} · {props.act.name}
        </span>
        <span className="sub">{props.sub}</span>
      </div>
      <ActProgress act={props.act} stage={props.stage} cleared={props.cleared} />
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
        disabled={!props.treeUnlocked}
        title={
          props.treeUnlocked
            ? "Skill Tree (view only)"
            : "Kaelen teaches the Skill Tree after Gorrak"
        }
      >
        <Icon name="tree" size={18} />
        <span>Skill Tree</span>
        <kbd>T</kbd>
        {props.treeUnlocked && props.skillPoints > 0 && (
          <span className="badge">{props.skillPoints}</span>
        )}
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
