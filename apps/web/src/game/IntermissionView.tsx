import { POC_GAME_DATA } from "@emberheir/content";
import { type GameState, type RunState, PROGRESSION, getAct } from "@emberheir/sim";
import { ActBar } from "./ActBar";
import type { GameApi } from "./useGame";

export function IntermissionView(props: {
  state: GameState;
  run: RunState;
  maxLife: number;
  game: GameApi;
  onCharacter: () => void;
}) {
  const { state, run, game } = props;
  const act = getAct(POC_GAME_DATA, run.actId);
  const life = Math.round(run.lifeFraction * props.maxLife);
  const boss = run.stage === act.monsterLevels.length;
  return (
    <section className="intermission panel" aria-label="Intermission">
      <ActBar act={act} stage={run.stage} />
      <h2>
        {boss
          ? `Stage ${run.stage}: ${act.boss.name}`
          : `Stage ${run.stage} of ${act.monsterLevels.length}`}
      </h2>
      {boss && <p className="warning">The boss waits. It announces its Slam before it strikes.</p>}
      <div
        className="bar bar-life"
        role="meter"
        aria-label="Life"
        aria-valuenow={life}
        aria-valuemin={0}
        aria-valuemax={props.maxLife}
      >
        <div className="bar-fill" style={{ width: `${run.lifeFraction * 100}%` }} />
        <span className="bar-text">
          Life {life} / {props.maxLife}
        </span>
      </div>
      <div className="intermission-actions">
        <button
          type="button"
          onClick={() => game.dispatch({ type: "useFlask" })}
          disabled={state.flaskCharges <= 0 || run.lifeFraction >= 1}
        >
          Drink Ember Flask (+{PROGRESSION.flaskHeal * 100} % Life, {state.flaskCharges} left)
        </button>
        <button type="button" onClick={props.onCharacter}>
          Character
          {state.hero.unspentAttributePoints > 0
            ? ` (${state.hero.unspentAttributePoints} points)`
            : ""}
        </button>
        <button type="button" onClick={() => game.dispatch({ type: "retreat" })}>
          Retreat
        </button>
        <button
          type="button"
          className="primary big"
          onClick={() => game.dispatch({ type: "startStage" })}
        >
          {boss ? "Face the Boss" : "Next Fight"}
        </button>
      </div>
    </section>
  );
}
