import type { ActData } from "@emberheir/sim";

/** Act progress as a bar: Camp at the start, the boss at the end. */
export function ActBar(props: { act: ActData; stage: number }) {
  const stages = props.act.monsterLevels.length;
  return (
    <nav className="act-bar" aria-label={`${props.act.name}, stage ${props.stage} of ${stages}`}>
      <span className="act-node camp" title="Camp">
        Camp
      </span>
      {Array.from({ length: stages }, (_, i) => {
        const n = i + 1;
        const boss = n === stages;
        const state = n < props.stage ? "done" : n === props.stage ? "current" : "todo";
        return (
          <span
            key={n}
            className={`act-node ${state}${boss ? " boss" : ""}`}
            title={boss ? `Stage ${n}: ${props.act.boss.name}` : `Stage ${n}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            {boss ? "Boss" : n}
          </span>
        );
      })}
    </nav>
  );
}
