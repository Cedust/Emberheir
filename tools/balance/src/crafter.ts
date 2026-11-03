import {
  type ActData,
  bossLevel,
  type CraftRequest,
  craftBlockReason,
  draughtAcorns,
  type EquipmentSlot,
  type GameData,
  type GameState,
  type ItemSlot,
  getBase,
  hasMet,
  killPrice,
} from "@emberheir/sim";
import { actProfile, type DamageProfile, gearValue, upgradeGain } from "./gear-value";
import { applyAction, noteCraft } from "./ledger";

/**
 * The min-maxer (economy-v2): in the Camp it spends like an eager player who knows the value of
 * every craft, but not its dice. It Upgrades with every Feather, Tempers and Reforges where the
 * expected gain is worth it, and gambles at Marisha with Acorns to spare. It never peeks at a
 * real roll: the expected gain of a random craft is the mean of a few trial rolls on other
 * dice (another nonce). Only the balance tool uses it, to measure how much of the income a
 * player can put to use (`--craft 1`).
 */

/** A random craft is done when its expected gain (log power, about % / 100) is at least this. */
export const MIN_GAIN = 0.003;
/** Trial rolls per expected gain. */
const TRIALS = 3;
/** At most this many crafts of a kind per Camp visit (bounds the tool's run time). */
const CAP = { upgrade: 10, temper: 30, reforge: 10, gamble: 6 } as const;
/** Acorns the min-maxer keeps for the next Draughts and a respec, in kills at boss level. */
const RESERVE_KILLS = 15;

type Equipped = [EquipmentSlot, NonNullable<GameState["hero"]["equipment"][EquipmentSlot]>];

const worn = (s: GameState): Equipped[] =>
  (Object.entries(s.hero.equipment) as [EquipmentSlot, Equipped[1] | undefined][]).filter(
    (e): e is Equipped => !!e[1],
  );

const craft = (s: GameState, data: GameData, request: CraftRequest) =>
  applyAction(s, data, { type: "craft", request });

/** The same state on other dice: the n-th trial roll. */
const trial = (s: GameState, n: number): GameState => ({ ...s, nonce: s.nonce + 7919 * (n + 1) });

/** Picks the best of a Temper offer (or keeps the old value) by gear value. */
function chooseTemper(s: GameState, data: GameData, itemId: string, profile: DamageProfile) {
  const item = worn(s).find(([, i]) => i.id === itemId)?.[1];
  const offer = item?.temperOffer ?? [];
  let best = applyAction(s, data, {
    type: "craft",
    request: { kind: "temperChoose", itemId, option: null },
  });
  let bestValue = gearValue(best, data, profile);
  offer.forEach((_, option) => {
    const next = craft(s, data, { kind: "temperChoose", itemId, option });
    const value = gearValue(next, data, profile);
    if (value > bestValue) {
      best = next;
      bestValue = value;
    }
  });
  return { state: best, value: bestValue };
}

/** Temper of one affix, then the best choice: the resulting state and its value. */
function temperOnce(
  s: GameState,
  data: GameData,
  itemId: string,
  affixIndex: number,
  profile: DamageProfile,
) {
  return chooseTemper(
    craft(s, data, { kind: "temper", itemId, affixIndex }),
    data,
    itemId,
    profile,
  );
}

/** Mean gain of a random craft over trial rolls (never the real roll). */
function expectedGain(s: GameState, base: number, roll: (t: GameState) => number): number {
  let sum = 0;
  for (let n = 0; n < TRIALS; n++) sum += roll(trial(s, n)) - base;
  return sum / TRIALS;
}

function upgrades(s: GameState, data: GameData, profile: DamageProfile): GameState {
  for (let k = 0; k < CAP.upgrade && s.wallet.phoenixFeathers > 0; k++) {
    const base = gearValue(s, data, profile);
    let best: GameState | null = null;
    let bestGain = 1e-4;
    for (const [, item] of worn(s)) {
      const request: CraftRequest = { kind: "upgrade", itemId: item.id };
      if (craftBlockReason(s, data, request)) continue;
      const next = craft(s, data, request);
      const gain = gearValue(next, data, profile) - base;
      if (gain > bestGain) {
        best = next;
        bestGain = gain;
      }
    }
    if (!best) break;
    noteCraft("upgrade", bestGain);
    s = best;
  }
  return s;
}

/** The affix of an item a player would temper: its locked one, else the one worth least. */
function temperTarget(s: GameState, data: GameData, slot: EquipmentSlot, profile: DamageProfile) {
  const item = s.hero.equipment[slot];
  if (!item) return undefined;
  if (item.lockedAffix !== undefined) return item.lockedAffix;
  const base = gearValue(s, data, profile);
  let target: number | undefined;
  let least = Infinity;
  item.affixes.forEach((_, i) => {
    if (craftBlockReason(s, data, { kind: "temper", itemId: item.id, affixIndex: i })) return;
    const without = { ...item, affixes: item.affixes.filter((__, j) => j !== i) };
    const tried = {
      ...s,
      hero: { ...s.hero, equipment: { ...s.hero.equipment, [slot]: without } },
    };
    const worth = base - gearValue(tried, data, profile);
    if (worth < least) {
      least = worth;
      target = i;
    }
  });
  return target;
}

function tempers(s: GameState, data: GameData, profile: DamageProfile, reserve: number): GameState {
  let done = 0;
  for (const [slot] of worn(s)) {
    for (let k = 0; k < 8 && done < CAP.temper; k++) {
      const item = s.hero.equipment[slot];
      if (!item) break;
      const affixIndex = temperTarget(s, data, slot, profile);
      if (affixIndex === undefined) break;
      const request: CraftRequest = { kind: "temper", itemId: item.id, affixIndex };
      if (craftBlockReason(s, data, request)) break;
      const price = killPrice(item.itemLevel, { acorns: 1 }).acorns;
      if (s.wallet.acorns - price < reserve) break;
      const base = gearValue(s, data, profile);
      const gain = expectedGain(
        s,
        base,
        (t) => temperOnce(t, data, item.id, affixIndex, profile).value,
      );
      if (gain < MIN_GAIN) break;
      const real = temperOnce(s, data, item.id, affixIndex, profile);
      noteCraft("temper", real.value - base);
      s = real.state;
      done++;
    }
  }
  return s;
}

function reforges(s: GameState, data: GameData, profile: DamageProfile): GameState {
  let done = 0;
  for (const [slot] of worn(s)) {
    for (let k = 0; k < 4 && done < CAP.reforge && s.wallet.emberCoal > 0; k++) {
      const item = s.hero.equipment[slot];
      if (!item) break;
      const request: CraftRequest = { kind: "reforge", itemId: item.id };
      if (craftBlockReason(s, data, request)) break;
      const base = gearValue(s, data, profile);
      const gain = expectedGain(s, base, (t) => gearValue(craft(t, data, request), data, profile));
      if (gain < MIN_GAIN) break;
      s = craft(s, data, request);
      noteCraft("reforge", gearValue(s, data, profile) - base);
      done++;
    }
  }
  return s;
}

/** Gamble slots: every item slot that can drop (no weapons). */
const GAMBLE_SLOTS: readonly ItemSlot[] = [
  "offHand",
  "helm",
  "body",
  "gloves",
  "boots",
  "belt",
  "amulet",
  "ring",
  "charm",
];

/** What a gamble for `slot` brings: the hero wears the new item if it is better. */
function gambleGain(s: GameState, data: GameData, slot: ItemSlot, profile: DamageProfile): number {
  let next: GameState;
  try {
    next = craft(s, data, { kind: "gamble", slot });
  } catch {
    return -Infinity;
  }
  const fresh = next.inventory.find((p) => !s.inventory.some((q) => q.item.id === p.item.id));
  return fresh ? Math.max(0, upgradeGain(next, data, fresh.item, profile)) : -Infinity;
}

function gambles(s: GameState, data: GameData, profile: DamageProfile, reserve: number): GameState {
  if (!hasMet(s, "marisha")) return s;
  for (let k = 0; k < CAP.gamble; k++) {
    let bestSlot: ItemSlot | undefined;
    let bestGain = MIN_GAIN;
    for (const slot of GAMBLE_SLOTS) {
      if (craftBlockReason(s, data, { kind: "gamble", slot })) continue;
      let sum = 0;
      for (let n = 0; n < 2; n++) sum += Math.max(0, gambleGain(trial(s, n), data, slot, profile));
      if (sum / 2 > bestGain) {
        bestGain = sum / 2;
        bestSlot = slot;
      }
    }
    if (!bestSlot) break;
    const before = s;
    let next: GameState;
    try {
      next = craft(s, data, { kind: "gamble", slot: bestSlot });
    } catch {
      break;
    }
    if (next.wallet.acorns < reserve) return before;
    const valueBefore = gearValue(before, data, profile);
    s = next;
    const fresh = s.inventory.find((p) => !before.inventory.some((q) => q.item.id === p.item.id));
    if (fresh && upgradeGain(s, data, fresh.item, profile) > 0) {
      try {
        s = applyAction(s, data, { type: "equip", itemId: fresh.item.id });
      } catch {
        // Requirements: it stays in the bag and is salvaged later.
      }
    }
    noteCraft("gamble", gearValue(s, data, profile) - valueBefore);
    // Whatever is not worn goes to Thoric right away (Ash back).
    for (const placed of s.inventory) {
      if (before.inventory.some((q) => q.item.id === placed.item.id)) continue;
      if (getBase(data.items, placed.item.baseId).slot === "mainHand") continue;
      try {
        s = applyAction(s, data, { type: "salvage", itemId: placed.item.id });
      } catch {
        // Not salvageable here.
      }
    }
  }
  return s;
}

/** All of the min-maxer's crafting in one Camp visit before setting out into `act`. */
export function craftLikeAPlayer(
  state: GameState,
  data: GameData,
  act: ActData | undefined,
): GameState {
  if (state.run) return state;
  const profile = act ? actProfile(act) : undefined;
  const p = profile ?? actProfile(data.acts[0] as ActData);
  const reserve =
    draughtAcorns(state) * 2 +
    killPrice(bossLevel(state.legacy.prestige), { acorns: RESERVE_KILLS }).acorns;
  let s = upgrades(state, data, p);
  s = reforges(s, data, p);
  s = tempers(s, data, p, reserve);
  s = gambles(s, data, p, reserve * 2);
  return s;
}
