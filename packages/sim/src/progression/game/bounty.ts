import { rollItem, rollRarity } from "../../items/generate";
import { RARITIES, type Rarity } from "../../items/types";
import { Rng } from "../../rng";
import { type BountyDefinition } from "../bounties";
import { PROGRESSION } from "../constants";
import { addToGrid } from "../inventory";
import { autoRewards } from "../leveling";
import { getAct, stageMonsterLevel } from "./acts";
import { requireCamp } from "./guards";
import { roadStages } from "./loot";
import { lootGate } from "./loot";
import {
  fail,
  nextRng,
  type ActData,
  type BountyDone,
  type BountyReward,
  type GameData,
  type GameState,
} from "./state";

/** The Scout's bounties: definitions, rewards, turning one in at the Camp. */

/** The definition of a bounty by id. */
export function getBounty(data: GameData, id: string): BountyDefinition {
  return data.bounties?.find((b) => b.id === id) ?? fail(`Unknown bounty "${id}"`);
}

/**
 * What a done bounty pays: Acorns worth `bounty.acornKills` normal kills at the act boss's level,
 * Ember Coal and one item of at least Rare (inside the run's Elite window).
 */
export function bountyReward(
  state: GameState,
  data: GameData,
  act: ActData,
  rng: Rng,
): BountyReward {
  const level = stageMonsterLevel(data, act, act.stages, state.legacy.prestige);
  const window = lootGate(state.legacy.prestige).elite;
  const top = RARITIES.indexOf(window.max);
  const weights = { ...PROGRESSION.rarityWeights } as Record<Rarity, number>;
  for (const r of RARITIES) {
    const i = RARITIES.indexOf(r);
    if (i < RARITIES.indexOf("rare") || i > Math.max(top, RARITIES.indexOf("rare"))) weights[r] = 0;
  }
  if (RARITIES.every((r) => weights[r] === 0)) weights.rare = 1;
  const baseId = data.lootBases[rng.int(0, data.lootBases.length - 1)] ?? fail("No loot bases");
  const item = rollItem(
    data.items,
    {
      baseId,
      itemLevel: level,
      rarity: rollRarity(rng, weights),
      stages: roadStages(state, data, act),
    },
    rng,
  );
  return {
    acorns: autoRewards(level, "normal").acorns * PROGRESSION.bounty.acornKills,
    emberCoal: PROGRESSION.bounty.emberCoal,
    item,
  };
}

/** The Scout pays a done bounty: Acorns and Ember Coal, the item goes into the inventory. */
export function turnInBounty(state: GameState, data: GameData): GameState {
  requireCamp(state);
  const done = state.bountyDone ?? fail("No bounty to turn in");
  const [rng, next] = nextRng(state);
  const reward = bountyReward(state, data, getAct(data, done.actId), rng);
  const inventory = addToGrid(state.inventory, reward.item, data.items) ?? fail("Inventory full");
  const rest: GameState = { ...next };
  delete (rest as { bountyDone?: BountyDone }).bountyDone;
  return {
    ...rest,
    inventory,
    wallet: {
      ...state.wallet,
      acorns: state.wallet.acorns + reward.acorns,
      emberCoal: state.wallet.emberCoal + reward.emberCoal,
    },
  };
}
