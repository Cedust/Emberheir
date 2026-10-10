import { GAME_DATA } from "@emberheir/content";
import {
  type BountyDefinition,
  type BountyState,
  type GameState,
  applyAction,
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
    text: bountyText(def, enemyName(state.enemyId)),
    target: bountyTarget(def.goal),
  };
}

/**
 * The bounty the Scout hands out when the hero sets out for `actId` now. The sim is
 * deterministic, so this is exactly the bounty the trip will carry.
 */
export function bountyPreview(state: GameState, actId: string): BountyView | undefined {
  try {
    const bounty = applyAction(state, GAME_DATA, { type: "setOut", actId }).run?.bounty;
    return bounty ? bountyView(bounty) : undefined;
  } catch {
    return undefined;
  }
}
