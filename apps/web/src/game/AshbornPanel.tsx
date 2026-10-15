import { GAME_DATA } from "@emberheir/content";
import {
  ASHBORN,
  ASHBORN_BOARDS,
  type AshbornBoard,
  ashbornUnspent,
  ashbornXpToNext,
  type GameState,
  heroAshborn,
} from "@emberheir/sim";
import type { GameApi } from "./useGame";

const BOARD_NAMES: Record<AshbornBoard, string> = {
  onslaught: "Onslaught",
  aegis: "Aegis",
  mending: "Mending",
  ignite: "Ignite",
};

/**
 * Ashborn in the Character Sheet (neuausrichtung-v1.md 7.3): after level 100 XP becomes Ashborn
 * Levels, each a point for one of the four boards (at most 15 per value). Old Nan resets them.
 */
export function AshbornPanel(props: { state: GameState; game: GameApi; inFight: boolean }) {
  const { state, game, inFight } = props;
  const ashborn = heroAshborn(state);
  const left = ashbornUnspent(ashborn);
  const next = ashbornXpToNext(ashborn.level);
  const values = GAME_DATA.ashbornValues ?? [];
  return (
    <div className="ashborn-panel" aria-label="Ashborn">
      <div className="ashborn-head">
        <span className="title-font">Ashborn {ashborn.level}</span>
        <span className="sub small">
          {Number.isFinite(next)
            ? `${Math.floor((ashborn.xp / next) * 100)} % to ${ashborn.level + 1} · max ${ASHBORN.maxLevel}`
            : "All Ashborn Levels"}
        </span>
        <span className={`points ${left > 0 ? "has" : ""}`} data-testid="ashborn-points">
          {left} Ashborn Points
        </span>
      </div>
      <div className="ashborn-boards">
        {ASHBORN_BOARDS.map((board) => (
          <section
            key={board}
            className={`ashborn-board b-${board}`}
            aria-label={BOARD_NAMES[board]}
          >
            <span className="eyebrow">{BOARD_NAMES[board].toUpperCase()}</span>
            {values
              .filter((v) => v.board === board)
              .map((v) => {
                const n = ashborn.points[v.id] ?? 0;
                const full = n >= ASHBORN.maxPerValue;
                return (
                  <div key={v.id} className={`ashborn-value${n > 0 ? " some" : ""}`} title={v.text}>
                    <span className="ashborn-name">{v.name}</span>
                    <span className="mono sub">
                      {n}/{ASHBORN.maxPerValue}
                    </span>
                    {!inFight && (
                      <button
                        type="button"
                        className="ashborn-add"
                        aria-label={`Add ${v.name}`}
                        disabled={left <= 0 || full}
                        onClick={() => game.dispatch({ type: "spendAshborn", valueId: v.id })}
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              })}
          </section>
        ))}
      </div>
      <span className="sub small">
        Old Nan at the Hearthfire gives every point back for Acorns.
      </span>
    </div>
  );
}
