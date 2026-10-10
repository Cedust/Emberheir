import { GAME_DATA } from "@emberheir/content";
import {
  ATTRIBUTES,
  ATTRIBUTE_RULES,
  type Attribute,
  type GameState,
  addAttributes,
  attributeProblem,
  heroClassOf,
  sumAttributes,
} from "@emberheir/sim";
import { useState } from "react";
import { AttributeStones, NO_POINTS } from "../AttributeStones";
import type { GameApi } from "../useGame";

/**
 * Ashen Rebirth (attribute-v1.md section 7): for one Phoenix Ash every point above the Class
 * Array comes back and is set anew.
 */
export function RebirthTab(props: { state: GameState; game: GameApi }) {
  const { state, game } = props;
  const [delta, setDelta] = useState<Record<Attribute, number>>(NO_POINTS);
  const [locking, setLocking] = useState(false);
  const own = state.hero.attributes;
  const floor = heroClassOf(state, GAME_DATA).startingAttributes;
  const ash = state.wallet.phoenixAsh ?? 0;
  const points = sumAttributes(own) - sumAttributes(floor) + state.hero.unspentAttributePoints;
  const next = addAttributes(own, delta);
  const left = points - (sumAttributes(next) - sumAttributes(floor));
  const ok = (n: typeof next) => attributeProblem(n, { floor, current: floor, points }) === null;
  const allowed = (a: Attribute, step: number) =>
    ash >= ATTRIBUTE_RULES.rebirthCost &&
    ok(addAttributes(own, { ...delta, [a]: delta[a] + step }));
  const change = (a: Attribute, step: number) => {
    setDelta({ ...delta, [a]: delta[a] + step });
    setLocking(false);
  };
  const changed = ATTRIBUTES.some((a) => delta[a] !== 0);
  const rebirth = () => {
    if (!locking) {
      setLocking(true);
      return;
    }
    game.dispatch({ type: "rebirth", attributes: next });
    setDelta(NO_POINTS);
    setLocking(false);
  };

  return (
    <div className="rebirth-tab">
      <div className="rebirth-head">
        <h2 className="title-font">ASHEN REBIRTH</h2>
        <span className="sub" data-testid="phoenix-ash">
          <b className="mono">{ash}</b> Phoenix Ash
        </span>
      </div>
      <div className="panel-card rebirth-stones">
        <AttributeStones
          base={own}
          delta={delta}
          canAdd={(a) => left > 0 && allowed(a, 1)}
          canRemove={(a) => allowed(a, -1)}
          onAdd={(a) => change(a, 1)}
          onRemove={(a) => change(a, -1)}
        />
      </div>
      <div className="rebirth-footer">
        <span className="sub small">
          {left} {left === 1 ? "point" : "points"} free
        </span>
        <button
          type="button"
          className="btn"
          disabled={ash < ATTRIBUTE_RULES.rebirthCost}
          onClick={() => {
            setDelta(
              Object.fromEntries(ATTRIBUTES.map((a) => [a, floor[a] - own[a]])) as Record<
                Attribute,
                number
              >,
            );
            setLocking(false);
          }}
        >
          Burn All
        </button>
        <button
          type="button"
          className={`btn big ${locking ? "danger" : "primary"}`}
          disabled={!changed || left < 0 || !ok(next)}
          onClick={rebirth}
        >
          {locking ? "Rise from the Ash?" : `Rebirth · ${ATTRIBUTE_RULES.rebirthCost} Phoenix Ash`}
        </button>
      </div>
    </div>
  );
}
