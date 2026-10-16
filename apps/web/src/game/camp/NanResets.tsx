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
import type { GameApi } from "../useGame";
import { Price } from "../../ui/kit/Currency";

/**
 * Old Nan wakes the Heir from the ashes (neuausrichtung-v1.md 7.3): for Acorns every Attribute
 * Point above the Class Array, or every Ashborn Point, comes back. They are spent anew in the
 * Character Sheet.
 * As dialog choices: a first click asks, the second one resets.
 */
export function useNanResets(state: GameState, game: GameApi) {
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
  return rows.map((r) => ({
    label: sure === r.id ? `${r.points} points back?` : r.name,
    note: <Price id="acorns" amount={r.price} />,
    warn: sure === r.id,
    blocked:
      r.points === 0
        ? "No points spent"
        : state.wallet.acorns < r.price
          ? "Not enough Acorns"
          : undefined,
    onPick: () => {
      if (sure !== r.id) {
        setSure(r.id);
        return;
      }
      r.act();
      setSure(null);
    },
  }));
}
