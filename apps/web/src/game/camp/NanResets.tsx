import { GAME_DATA } from "@emberheir/content";
import {
  ASHBORN,
  ashbornSpent,
  attributeRespecAcorns,
  type GameState,
  heroAshborn,
  heroClassOf,
  sumAttributes,
} from "@emberheir/sim";
import { useState } from "react";
import { fmt } from "../../ui/items";
import type { GameApi } from "../useGame";

/**
 * Old Nan wakes the Heir from the ashes (neuausrichtung-v1.md 7.3): for Acorns every Attribute
 * Point above the Class Array, or every Ashborn Point, comes back. They are spent anew in the
 * Character Sheet.
 */
export function NanResets(props: { state: GameState; game: GameApi }) {
  const { state, game } = props;
  const [sure, setSure] = useState<"attributes" | "ashborn" | null>(null);
  const floor = heroClassOf(state, GAME_DATA).startingAttributes;
  const above = sumAttributes(state.hero.attributes) - sumAttributes(floor);
  const price = attributeRespecAcorns(state.legacy.prestige);
  const ashborn = ashbornSpent(heroAshborn(state));
  const rows = [
    {
      id: "attributes" as const,
      name: "Reset Attributes",
      points: above,
      price,
      act: () => game.dispatch({ type: "respecAttributes", attributes: floor }),
    },
    ...(ashborn > 0 || state.hero.ashborn
      ? [
          {
            id: "ashborn" as const,
            name: "Reset Ashborn",
            points: ashborn,
            price: ASHBORN.resetAcorns,
            act: () => game.dispatch({ type: "resetAshborn" }),
          },
        ]
      : []),
  ];
  return (
    <div className="nan-resets" aria-label="Reset">
      {rows.map((r) => {
        const can = r.points > 0 && state.wallet.acorns >= r.price;
        return (
          <button
            key={r.id}
            type="button"
            className={`btn small ${sure === r.id ? "danger" : ""}`}
            disabled={!can}
            title={
              r.points === 0
                ? "No points spent"
                : `${r.points} points come back · spend them anew in the Character Sheet`
            }
            onClick={() => {
              if (sure !== r.id) {
                setSure(r.id);
                return;
              }
              r.act();
              setSure(null);
            }}
          >
            {sure === r.id ? `${r.points} points back?` : r.name} ·{" "}
            <b className="mono">{fmt(r.price)}</b> Acorns
          </button>
        );
      })}
    </div>
  );
}
