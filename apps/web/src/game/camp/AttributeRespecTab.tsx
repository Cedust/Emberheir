import { GAME_DATA } from "@emberheir/content";
import {
  ATTRIBUTES,
  type Attribute,
  type GameState,
  addAttributes,
  attributeProblem,
  attributeRespecAcorns,
  heroClassOf,
  sumAttributes,
} from "@emberheir/sim";
import { useState } from "react";
import { fmt } from "../../ui/items";
import { AttributeStones, NO_POINTS } from "../AttributeStones";
import type { GameApi } from "../useGame";

/**
 * Attribute respec at Kaelen (entschlackung-v1.md): for Acorns, the same price as a Skill Tree
 * respec, every point above the Class Array comes back and is set anew.
 */
export function AttributeRespecTab(props: { state: GameState; game: GameApi }) {
  const { state, game } = props;
  const [delta, setDelta] = useState<Record<Attribute, number>>(NO_POINTS);
  const [locking, setLocking] = useState(false);
  const own = state.hero.attributes;
  const floor = heroClassOf(state, GAME_DATA).startingAttributes;
  const price = attributeRespecAcorns(state.legacy.prestige);
  const affordable = state.wallet.acorns >= price;
  const points = sumAttributes(own) - sumAttributes(floor) + state.hero.unspentAttributePoints;
  const next = addAttributes(own, delta);
  const left = points - (sumAttributes(next) - sumAttributes(floor));
  const ok = (n: typeof next) => attributeProblem(n, { floor, current: floor, points }) === null;
  const allowed = (a: Attribute, step: number) =>
    affordable && ok(addAttributes(own, { ...delta, [a]: delta[a] + step }));
  const change = (a: Attribute, step: number) => {
    setDelta({ ...delta, [a]: delta[a] + step });
    setLocking(false);
  };
  const changed = ATTRIBUTES.some((a) => delta[a] !== 0);
  const respec = () => {
    if (!locking) {
      setLocking(true);
      return;
    }
    game.dispatch({ type: "respecAttributes", attributes: next });
    setDelta(NO_POINTS);
    setLocking(false);
  };

  return (
    <div className="attr-respec-tab">
      <div className="attr-respec-head">
        <h2 className="title-font">ATTRIBUTES</h2>
        <span className="sub" data-testid="attribute-respec-price">
          Set every point above your Class Array anew · <b className="mono">{fmt(price)}</b> Acorns
        </span>
      </div>
      <div className="panel-card attr-respec-stones">
        <AttributeStones
          base={own}
          delta={delta}
          canAdd={(a) => left > 0 && allowed(a, 1)}
          canRemove={(a) => allowed(a, -1)}
          onAdd={(a) => change(a, 1)}
          onRemove={(a) => change(a, -1)}
        />
      </div>
      <div className="attr-respec-footer">
        <span className="sub small">
          {left} {left === 1 ? "point" : "points"} free
        </span>
        <button
          type="button"
          className="btn"
          disabled={!affordable}
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
          Reset All
        </button>
        <button
          type="button"
          className={`btn big ${locking ? "danger" : "primary"}`}
          disabled={!changed || left < 0 || !ok(next) || !affordable}
          title={affordable ? undefined : "Not enough Acorns"}
          onClick={respec}
        >
          {locking ? "Pay and set them?" : `Respec · ${fmt(price)} Acorns`}
        </button>
      </div>
    </div>
  );
}
