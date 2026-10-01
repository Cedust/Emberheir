import { POC_GAME_DATA } from "@emberheir/content";
import {
  type Encounter,
  Fight,
  type FightSnapshot,
  type GameState,
  type RunState,
  currentFight,
  eliteModifiersOf,
  getAct,
} from "@emberheir/sim";
import { useCallback, useEffect, useRef, useState } from "react";
import { CombatLog } from "../combat/CombatLog";
import { FighterPanel } from "../combat/FighterPanel";
import { type LogLine, formatEvent, formatTime } from "../combat/format";
import { ActBar } from "./ActBar";
import type { GameApi } from "./useGame";

const SPEEDS = [1, 2, 4, 8] as const;

function enemyTags(encounter: Encounter): string[] {
  if (encounter.boss) return ["Boss"];
  const mods = eliteModifiersOf(encounter, POC_GAME_DATA).map((m) => m.name);
  return mods.length ? ["Elite", ...mods] : [];
}

/**
 * Plays the current fight in real time. The sim resolves the same fight (same setups and seed)
 * when the player continues, so what you see is what counts.
 */
export function FightView(props: { state: GameState; run: RunState; game: GameApi }) {
  const { state, run, game } = props;
  const encounter = run.encounter;
  // GameApp remounts this view for every encounter (key = fight seed).
  const [fight] = useState(() => {
    const setups = currentFight(state, POC_GAME_DATA);
    return new Fight(setups.hero, setups.enemy, setups.seed);
  });
  const [snapshot, setSnapshot] = useState<FightSnapshot>(() => fight.snapshot());
  const [lines, setLines] = useState<LogLine[]>([]);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const sync = useCallback(
    (from: number) => {
      const snap = fight.snapshot();
      const names = { hero: snap.hero.name, enemy: snap.enemy.name };
      const fresh = fight.events.slice(from).map((e) => formatEvent(e, names));
      if (fresh.length) setLines((prev) => [...prev, ...fresh]);
      setSnapshot(snap);
    },
    [fight],
  );

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      // Cap the frame step so a background tab does not jump through half the fight.
      const dt = Math.min(0.25, (now - last) / 1000) * speedRef.current;
      last = now;
      const before = fight.events.length;
      fight.advance(dt);
      sync(before);
      if (!fight.over) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [fight, sync]);

  const skip = () => {
    const before = fight.events.length;
    fight.runToEnd();
    sync(before);
  };

  if (!encounter) return null;
  const act = getAct(POC_GAME_DATA, run.actId);
  const result = snapshot.over
    ? snapshot.winner === "hero"
      ? "Victory"
      : snapshot.winner === "enemy"
        ? "Defeat"
        : "Draw"
    : null;

  return (
    <section className="fight-view" aria-label="Fight">
      <ActBar act={act} stage={run.stage} />
      <div className="arena act-arena">
        <FighterPanel fighter={snapshot.hero} />
        <div className="vs">
          <span className="clock">{formatTime(snapshot.time)}</span>
          {result && (
            <strong className={`result result-${result.toLowerCase()}`} data-testid="fight-result">
              {result}
            </strong>
          )}
        </div>
        <FighterPanel fighter={snapshot.enemy} tags={enemyTags(encounter)} />
      </div>
      <div className="fight-actions">
        {!result ? (
          <>
            <label>
              Speed
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value) as (typeof SPEEDS)[number])}
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={skip}>
              Skip to end
            </button>
            <button type="button" onClick={() => game.dispatch({ type: "retreat" })}>
              Retreat
            </button>
          </>
        ) : (
          <button
            type="button"
            className="primary big"
            onClick={() => game.dispatch({ type: "resolveFight" })}
          >
            {result === "Victory" ? "Claim Rewards" : "Return to Camp"}
          </button>
        )}
      </div>
      <CombatLog lines={lines} />
    </section>
  );
}
