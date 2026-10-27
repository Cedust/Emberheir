import {
  type ActData,
  applyAction,
  CRAFTING,
  type CraftRequest,
  type GameData,
  type GameState,
  getBase,
  hasMet,
  type Item,
  missingRequirements,
  requiredLevel,
  type RunewordDefinition,
  targetSlot,
} from "@emberheir/sim";
import { actProfile, type DamageProfile, gearValue } from "./gear-value";

/**
 * The autopilot at Nyssa (neuausrichtung-v1.md section 10): keeps Normal bases for Runewords,
 * forges a Runeword when it beats the worn item, socketes single Runes into worn Normal items and
 * combines spare Runes. What "beats" means is the same measure as for every other gear choice
 * (`gearValue`: dummy damage times effective Life), so each build takes the Runes it lives on.
 * Reforge, Temper and Kindle stay out on purpose: the numbers stay a little pessimistic.
 */

/** Runes of each kind kept for recipes before the rest is combined into the next rank. */
const RESERVE = 2;
/** A Runeword or Rune must add at least this much value (log scale, ~1 %) to be worth it. */
const MIN_GAIN = 0.01;

/** Choices already measured and turned down, so a Camp visit does not measure them again. */
export type RuneMemo = Set<string>;

const runeRank = (data: GameData, id: string) => data.items.runes.get(id)?.rank ?? 0;

function runeOfRank(data: GameData, rank: number): string | undefined {
  return [...data.items.runes.values()].find((r) => r.rank === rank)?.id;
}

/**
 * Can the pouch pay these Runes, combining lower ranks (three into one) where one is missing?
 * Acorns are left out: the autopilot spends them on nothing else.
 */
export function pouchCovers(
  data: GameData,
  pouch: Readonly<Record<string, number>>,
  needs: readonly string[],
): boolean {
  const left: Record<string, number> = { ...pouch };
  const take = (id: string, depth: number): boolean => {
    if ((left[id] ?? 0) > 0) {
      left[id] = (left[id] ?? 0) - 1;
      return true;
    }
    const lower = runeOfRank(data, runeRank(data, id) - 1);
    if (!lower || depth > 8) return false;
    for (let i = 0; i < CRAFTING.combineRunesCount; i++) if (!take(lower, depth + 1)) return false;
    return true;
  };
  // Highest ranks first: they may eat lower Runes, which the lower needs then miss.
  return [...needs]
    .sort((a, b) => runeRank(data, b) - runeRank(data, a))
    .every((id) => take(id, 0));
}

/** Runewords a Normal item can still become (its Sockets fit, the base takes enough of them). */
function wordsFor(data: GameData, item: Item): RunewordDefinition[] {
  if (item.rarity !== "normal" || item.uniqueId || item.runes?.length) return [];
  const base = getBase(data.items, item.baseId);
  const sockets = item.sockets ?? 0;
  return [...data.items.runewords.values()].filter(
    (w) =>
      w.slots.includes(base.slot) &&
      w.runes.length >= sockets &&
      w.runes.length <= (base.maxSockets ?? 0),
  );
}

/** A recipe the hero can read (all its Runes found once) and pay right now. */
function ready(state: GameState, data: GameData, word: RunewordDefinition): boolean {
  return (
    word.runes.every((r) => state.legacy.runesFound.includes(r)) &&
    pouchCovers(data, state.wallet.runes, word.runes)
  );
}

/** The Runeword bases the autopilot keeps in its inventory: the newest one per slot. */
export function keptBases(state: GameState, data: GameData): Set<string> {
  const best = new Map<string, Item>();
  for (const { item } of state.inventory) {
    if (wordsFor(data, item).length === 0) continue;
    const slot = getBase(data.items, item.baseId).slot;
    const kept = best.get(slot);
    if (!kept || item.itemLevel > kept.itemLevel) best.set(slot, item);
  }
  return new Set([...best.values()].map((i) => i.id));
}

/**
 * Take this Normal card as a Runeword base? Only once Nyssa travels with the caravan, when a
 * recipe for it is ready and the base is newer than the one kept (or worn) for its slot.
 */
export function wantsBase(state: GameState, data: GameData, item: Item): boolean {
  if (!hasMet(state, "nyssa")) return false;
  if (state.hero.level < requiredLevel(item)) return false;
  if (missingRequirements(item, data.items, state.hero.attributes).length) return false;
  if (!wordsFor(data, item).some((w) => ready(state, data, w))) return false;
  const slot = getBase(data.items, item.baseId).slot;
  const kept = keptBases(state, data);
  const sameSlot = [
    ...state.inventory.map((p) => p.item).filter((i) => kept.has(i.id)),
    ...Object.values(state.hero.equipment).filter((i): i is Item => !!i && !!i.runes?.length),
  ].filter((i) => getBase(data.items, i.baseId).slot === slot);
  return sameSlot.every((i) => item.itemLevel > i.itemLevel);
}

/** Thoric in the Camp: salvages the inventory, but keeps the Runeword bases (with Runes on). */
export function campSalvage(state: GameState, data: GameData, runes: boolean): GameState {
  const keep = runes ? keptBases(state, data) : new Set<string>();
  let s = state;
  for (const placed of state.inventory) {
    if (!keep.has(placed.item.id)) {
      s = applyAction(s, data, { type: "salvage", itemId: placed.item.id });
    }
  }
  return s;
}

const craft = (s: GameState, data: GameData, request: CraftRequest) =>
  applyAction(s, data, { type: "craft", request });

/** Makes sure the pouch holds `count` of a Rune, combining lower ranks. Throws if it cannot. */
function ensureRunes(s: GameState, data: GameData, runeId: string, count: number): GameState {
  let next = s;
  for (let guard = 0; (next.wallet.runes[runeId] ?? 0) < count; guard++) {
    const lower = runeOfRank(data, runeRank(data, runeId) - 1);
    if (!lower || guard > 20) throw new Error(`No ${runeId}`);
    next = ensureRunes(next, data, lower, CRAFTING.combineRunesCount);
    next = craft(next, data, { kind: "combineRunes", runeId: lower });
  }
  return next;
}

/** Forges `word` into `item` (Sockets, Runes) and wears it. Throws if anything is missing. */
function forge(s: GameState, data: GameData, item: Item, word: RunewordDefinition): GameState {
  let next = s;
  const counts = new Map<string, number>();
  for (const id of word.runes) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of [...counts].sort((a, b) => runeRank(data, b[0]) - runeRank(data, a[0]))) {
    next = ensureRunes(next, data, id, n);
  }
  // A lower rank may have been eaten by a higher one: check all of them again.
  for (const [id, n] of counts) {
    if ((next.wallet.runes[id] ?? 0) < n) throw new Error(`No ${id}`);
  }
  for (let sockets = item.sockets ?? 0; sockets < word.runes.length; sockets++) {
    next = craft(next, data, { kind: "addSocket", itemId: item.id });
  }
  for (const runeId of word.runes) {
    next = craft(next, data, { kind: "socketRune", itemId: item.id, runeId });
  }
  const worn = Object.values(next.hero.equipment).some((i) => i?.id === item.id);
  return worn ? next : applyAction(next, data, { type: "equip", itemId: item.id });
}

/** Candidates for a Runeword or a Rune: Normal items in the inventory and on the hero. */
function normalItems(state: GameState): Item[] {
  return [
    ...state.inventory.map((p) => p.item),
    ...Object.values(state.hero.equipment).filter((i): i is Item => !!i),
  ].filter((i) => i.rarity === "normal" && !i.uniqueId);
}

/** The memo key of a choice: the item, what it would become and what it competes with. */
function memoKey(state: GameState, data: GameData, item: Item, what: string): string {
  const slot = targetSlot(item, data, state.hero.equipment);
  const worn = slot ? state.hero.equipment[slot]?.id : "";
  return `${item.id}|${what}|${worn}|${state.hero.level}`;
}

/** Runewords first (the best gain, again while one helps), then single Runes, then combining. */
export function autopilotRunes(
  state: GameState,
  data: GameData,
  act: ActData | undefined,
  memo: RuneMemo,
): GameState {
  if (!hasMet(state, "nyssa") || state.run) return state;
  const profile = act ? actProfile(act) : undefined;
  let s = forgeRunewords(state, data, profile, memo);
  s = socketSingleRunes(s, data, profile, memo);
  return combineSpares(s, data);
}

function forgeRunewords(
  state: GameState,
  data: GameData,
  profile: DamageProfile | undefined,
  memo: RuneMemo,
): GameState {
  let s = state;
  for (let round = 0; round < 4; round++) {
    const now = gearValue(s, data, profile);
    let best: GameState | null = null;
    let bestGain = MIN_GAIN;
    for (const item of normalItems(s)) {
      for (const word of wordsFor(data, item)) {
        if (!ready(s, data, word)) continue;
        const key = memoKey(s, data, item, word.id);
        if (memo.has(key)) continue;
        let next: GameState;
        try {
          next = forge(s, data, item, word);
        } catch {
          memo.add(key);
          continue;
        }
        const gain = gearValue(next, data, profile) - now;
        if (gain > bestGain) {
          best = next;
          bestGain = gain;
        } else memo.add(key);
      }
    }
    if (!best) break;
    s = best;
  }
  return s;
}

/** A worn Normal item with free Sockets gets the Rune that helps the build most. */
function socketSingleRunes(
  state: GameState,
  data: GameData,
  profile: DamageProfile | undefined,
  memo: RuneMemo,
): GameState {
  let s = state;
  const worn = Object.values(s.hero.equipment).filter(
    (i): i is Item => !!i && i.rarity === "normal" && !i.uniqueId,
  );
  for (const item of worn) {
    for (let free = (item.sockets ?? 0) - (item.runes?.length ?? 0); free > 0; free--) {
      const now = gearValue(s, data, profile);
      const current = Object.values(s.hero.equipment).find((i) => i?.id === item.id) ?? item;
      let best: GameState | null = null;
      let bestGain = MIN_GAIN;
      for (const runeId of Object.keys(s.wallet.runes)) {
        const key = memoKey(s, data, current, `${current.runes?.join("+") ?? ""}+${runeId}`);
        if (memo.has(key)) continue;
        try {
          const next = craft(s, data, { kind: "socketRune", itemId: item.id, runeId });
          const gain = gearValue(next, data, profile) - now;
          if (gain > bestGain) {
            best = next;
            bestGain = gain;
          } else memo.add(key);
        } catch {
          memo.add(key);
        }
      }
      if (!best) break;
      s = best;
    }
  }
  return s;
}

/** Nyssa: three of a kind into the next rank, keeping a few of each for recipes. */
function combineSpares(state: GameState, data: GameData): GameState {
  let s = state;
  const runes = [...data.items.runes.values()].sort((a, b) => a.rank - b.rank);
  for (const rune of runes) {
    while ((s.wallet.runes[rune.id] ?? 0) >= RESERVE + CRAFTING.combineRunesCount) {
      try {
        s = craft(s, data, { kind: "combineRunes", runeId: rune.id });
      } catch {
        break;
      }
    }
  }
  return s;
}
