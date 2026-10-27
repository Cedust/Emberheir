import { rollItem } from "../../items/generate";
import { type Item, RARITIES, type Rarity } from "../../items/types";
import { Rng } from "../../rng";
import { type BountyDefinition, type BountyState, rollBountyOffer, trailQuarry } from "../bounties";
import { PROGRESSION } from "../constants";
import { HUNT, huntThresholds, huntTier } from "../hunts";
import { addToGrid } from "../inventory";
import { getAct, isFinaleAct, stageMonsterLevel } from "./acts";
import { requireCamp } from "./guards";
import { salvageValue } from "./item-rules";
import { lootGate, maxRuneRank, rollItemChoices, rollRune } from "./loot";
import { hashId } from "./omens";
import {
  type ActData,
  type BountyCache,
  type BountyDone,
  type Encounter,
  fail,
  type GameData,
  type GameState,
  type MapNode,
  mixSeed,
  nextRng,
  type RunState,
} from "./state";

/** Eldrin's bounties (bounties-v2-plan.md): the offer, and the Cache a done one pays. */

/** The definition of a bounty by id. */
export function getBounty(data: GameData, id: string): BountyDefinition {
  return data.bounties?.find((b) => b.id === id) ?? fail(`Unknown bounty "${id}"`);
}

/**
 * The two bounties Eldrin offers for an act. The offer stays the same until a bounty is turned in
 * or the next Prestige comes, so hopping between acts does not roll new ones. None while a done
 * bounty waits to be turned in, none for the finale.
 */
export function bountyOffer(state: GameState, data: GameData, actId: string): BountyState[] {
  if (!data.bounties?.length || state.bountyDone || isFinaleAct(data, actId)) return [];
  const act = getAct(data, actId);
  const nonce = 104_729 * (state.legacy.prestige + 1) + (state.stats.bounties ?? 0);
  const rng = new Rng(mixSeed(state.seed ^ hashId(`bounty:${actId}`), nonce));
  const huntable = act.enemies
    .map((e) => e.id)
    .filter((id) => !data.huntSignatures || data.huntSignatures[id]?.length);
  const quarry = trailQuarry(
    huntable,
    state.legacy.hunts ?? {},
    (id) => huntThresholds(data.acts, id),
    rng,
  );
  return rollBountyOffer(data.bounties, act.number, quarry, rng);
}

/** The bounty a set-out takes from Eldrin's offer; none without a choice. */
export function takeBounty(
  state: GameState,
  data: GameData,
  actId: string,
  id: string | undefined,
): BountyState | undefined {
  if (!id) return undefined;
  if (state.bountyDone) return fail("Turn in the done Bounty at Eldrin first");
  return (
    bountyOffer(state, data, actId).find((b) => b.id === id) ?? fail("Eldrin offers no such Bounty")
  );
}

/** One rarity higher, at most `max`. */
function raised(rarity: Rarity, max: Rarity): Rarity {
  const i = Math.min(RARITIES.indexOf(rarity) + 1, RARITIES.indexOf(max));
  return RARITIES[Math.max(i, RARITIES.indexOf(rarity))] ?? rarity;
}

/**
 * The act's Home Rune for the Cache. The two top ranks (Volt, Dusk) are the Ber and Jah of
 * Emberheir: those come only now and then, otherwise a Rune rolls like at a Cache node.
 */
function cacheRune(data: GameData, act: ActData, tier: number, rng: Rng): string | undefined {
  const home = act.homeRune ? data.items.runes.get(act.homeRune) : undefined;
  const topRank = Math.max(...[...data.items.runes.values()].map((r) => r.rank));
  const high = home ? home.rank > topRank - PROGRESSION.highRuneRanks : false;
  if (
    home &&
    home.rank <= maxRuneRank(tier) &&
    (!high || rng.chance(PROGRESSION.bounty.highHomeRuneChance))
  ) {
    return home.id;
  }
  return rollRune(data, tier, true, rng, act.homeRune);
}

/**
 * Eldrin's Cache for a done bounty (bounties-v2-plan.md B3): the act's Home Rune and an item pick
 * at Elite quality at the act boss's level, plus the bounty's own bonus.
 */
export function bountyCache(
  state: GameState,
  data: GameData,
  done: BountyDone,
  rng: Rng,
): BountyCache {
  const act = getAct(data, done.actId);
  const def = getBounty(data, done.id);
  const bonus = def.bonus;
  const prestige = state.legacy.prestige;
  const level = stageMonsterLevel(data, act, act.stages, prestige);
  const tier = act.number + prestige;
  const rune = cacheRune(data, act, tier, rng);

  // Trail Hunt: Trail kills on its enemy, and one card carries its Hunt Affix for sure.
  const enemyId = done.enemyId;
  const trailKills = bonus.kind === "trail" && enemyId ? bonus.kills : 0;
  const scale = enemyId ? huntThresholds(data.acts, enemyId) : [];
  const from = enemyId ? (state.legacy.hunts?.[enemyId] ?? 0) : 0;
  const before = huntTier(from, scale);
  const after = huntTier(from + trailKills, scale);
  const paid = after > before ? HUNT.rewards.slice(before, after) : [];
  const signatures = enemyId ? data.huntSignatures?.[enemyId] : undefined;
  const signature =
    trailKills && signatures?.length
      ? {
          affixIds: signatures,
          best: after >= 3,
          trail: Math.max(2, after),
          ...(after >= 4 ? { greater: HUNT.apexRanks } : {}),
        }
      : undefined;

  const encounter: Encounter = {
    enemyId: enemyId ?? act.enemies[0]?.id ?? act.boss.id,
    level,
    boss: false,
    eliteModifiers: [],
    seed: 0,
    // Thief Chase: a hoard like the Ember Thief's (more cards, one at least Rare).
    ...(bonus.kind === "picks" ? { thief: true } : {}),
  };
  let items: Item[] = rollItemChoices(
    data,
    act.id,
    encounter,
    "elite",
    0,
    prestige,
    rng,
    undefined,
    1,
    undefined,
    signature ? { signature } : {},
  );
  // Dry Throat: every card one rarity higher, inside what the run's bosses may drop.
  if (bonus.kind === "rarity") {
    const max = lootGate(prestige).boss.max;
    items = items.map((item) =>
      item.uniqueId || raised(item.rarity, max) === item.rarity
        ? item
        : rollItem(
            data.items,
            { baseId: item.baseId, itemLevel: item.itemLevel, rarity: raised(item.rarity, max) },
            rng,
          ),
    );
  }
  return {
    id: def.id,
    actId: act.id,
    ...(enemyId ? { enemyId } : {}),
    runes: rune ? [rune] : [],
    emberCoal:
      (bonus.kind === "emberCoal" ? rng.int(bonus.min, bonus.max) : 0) +
      paid.reduce((n, r) => n + r.emberCoal, 0),
    ...(paid.some((r) => r.acorns) ? { acorns: paid.reduce((n, r) => n + r.acorns, 0) } : {}),
    ...(trailKills ? { trailKills } : {}),
    items,
    picks: bonus.kind === "picks" ? bonus.picks : 1,
    taken: [],
  };
}

/**
 * Eldrin pays a done bounty: Runes, Ember Coal and Trail kills at once; the item cards wait in
 * his Cache until the hero takes them.
 */
export function turnInBounty(state: GameState, data: GameData): GameState {
  requireCamp(state);
  const done = state.bountyDone ?? fail("No bounty to turn in");
  if (state.bountyCache) return fail("Take the cards of Eldrin's Cache first");
  const [rng, next] = nextRng(state);
  const cache = bountyCache(state, data, done, rng);
  const rest: GameState = { ...next };
  delete (rest as { bountyDone?: BountyDone }).bountyDone;
  const runes = { ...state.wallet.runes };
  for (const id of cache.runes) runes[id] = (runes[id] ?? 0) + 1;
  const hunts = state.legacy.hunts ?? {};
  return {
    ...rest,
    bountyCache: cache,
    wallet: {
      ...state.wallet,
      acorns: state.wallet.acorns + (cache.acorns ?? 0),
      emberCoal: state.wallet.emberCoal + cache.emberCoal,
      runes,
    },
    stats: { ...state.stats, bounties: (state.stats.bounties ?? 0) + 1 },
    legacy:
      cache.trailKills && cache.enemyId
        ? {
            ...state.legacy,
            hunts: { ...hunts, [cache.enemyId]: (hunts[cache.enemyId] ?? 0) + cache.trailKills },
          }
        : state.legacy,
  };
}

/** Takes a card of Eldrin's Cache into the inventory; the last pick salvages the rest. */
export function takeBountyItem(state: GameState, data: GameData, index: number): GameState {
  requireCamp(state);
  const cache = state.bountyCache ?? fail("No Cache to take from");
  if (cache.taken.includes(index)) return fail("Item already taken");
  const item = cache.items[index] ?? fail("No such item");
  const inventory = addToGrid(state.inventory, item, data.items) ?? fail("Inventory full");
  const taken = [...cache.taken, index];
  const next = { ...state, inventory, bountyCache: { ...cache, taken } };
  return taken.length >= cache.picks ? closeBountyCache(next) : next;
}

/** Closes Eldrin's Cache: every card not taken turns to Ash. */
export function closeBountyCache(state: GameState): GameState {
  requireCamp(state);
  const cache = state.bountyCache ?? fail("No Cache to close");
  const ash = cache.items
    .filter((_, i) => !cache.taken.includes(i))
    .reduce((sum, it) => sum + salvageValue(it), 0);
  const rest: GameState = { ...state, wallet: { ...state.wallet, ash: state.wallet.ash + ash } };
  delete (rest as { bountyCache?: BountyCache }).bountyCache;
  return rest;
}

/**
 * Whether a node of the act map counts for the trip's open bounty (bounties-v2-plan.md B4): an
 * Elite node for an Elite Hunt, a fight with the quarry for a Trail Hunt, the Thief's Trail.
 */
export function countsForBounty(
  data: GameData,
  run: Pick<RunState, "bounty">,
  node: MapNode,
): boolean {
  const bounty = run.bounty;
  if (!bounty || bounty.status !== "open") return false;
  switch (getBounty(data, bounty.id).goal.kind) {
    case "elites":
      return node.kind === "elite";
    case "trail":
      return (node.kind === "hunt" ? node.quarry : node.enemy) === bounty.enemyId;
    case "thief":
      return node.kind === "thief";
    case "bossNoFlask":
      return false;
  }
}
