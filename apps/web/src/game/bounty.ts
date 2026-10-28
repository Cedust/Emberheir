import { GAME_DATA } from "@emberheir/content";
import {
  type BountyDefinition,
  type BountyState,
  type GameState,
  bountyOffer,
  bountyTarget,
  bountyText,
  getBounty,
} from "@emberheir/sim";

export interface BountyView {
  readonly def: BountyDefinition;
  readonly state: BountyState;
  /** The bounty's line with its numbers and enemy filled in. */
  readonly text: string;
  readonly target: number;
}

function enemyName(id: string | undefined): string | undefined {
  if (!id) return undefined;
  for (const act of GAME_DATA.acts) {
    const enemy = act.enemies.find((e) => e.id === id);
    if (enemy) return enemy.name;
  }
  return id;
}

/** How a bounty reads in the UI. */
export function bountyView(state: BountyState): BountyView {
  const def = getBounty(GAME_DATA, state.id);
  return {
    def,
    state,
    text: bountyText(def, enemyName(state.enemyId), state),
    target: bountyTarget(def.goal, state),
  };
}

/** The two bounties Eldrin offers for a trip to `actId` (none while one waits to be turned in). */
export function bountyOfferViews(state: GameState, actId: string): BountyView[] {
  try {
    return bountyOffer(state, GAME_DATA, actId).map(bountyView);
  } catch {
    return [];
  }
}
