import { describe, expect, it } from "vitest";
import { kindledAffix, kindledAffixId, rollTier } from "../items/codex";
import { itemModifiers } from "../items/equipment";
import { rollItem } from "../items/generate";
import { TEST_CATALOG, TEST_CONDITIONS, TEST_EFFECTS } from "../items/test-fixtures";
import type { Item } from "../items/types";
import { Rng } from "../rng";
import {
  EMPTY_CODEX,
  codexAffixFactor,
  codexMastery,
  isHome,
  kindleTier,
  learnFromItem,
  quarryFound,
} from "./codex";
import { CODEX } from "./constants";
import { craftBlockReason, craftCost, kindleTargets } from "./crafting";
import { type GameAction, type GameState, applyAction, deserializeGame, newGame } from "./game";
import { TEST_GAME_DATA } from "./test-fixtures";

const data = TEST_GAME_DATA;
const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);

/** A T3 Rare ring with life and Searing Crit (On Crit → Burn). */
const RING: Item = {
  id: "ring-1",
  baseId: "test-ring",
  name: "Ash Bite",
  rarity: "rare",
  itemLevel: 25,
  tier: 3,
  affixes: [
    { affixId: "life", quality: 0.5 },
    { affixId: "searing-crit", quality: 0.5 },
  ],
};

/** A T2 Magic ring with only a stat affix: a free trigger place. */
const PLAIN: Item = {
  ...RING,
  id: "ring-2",
  rarity: "magic",
  itemLevel: 15,
  tier: 2,
  affixes: [{ affixId: "life", quality: 0.5 }],
};

const [LOW_LIFE, ON_CRIT] = TEST_CONDITIONS as [
  (typeof TEST_CONDITIONS)[0],
  (typeof TEST_CONDITIONS)[0],
];
const [HEAL, BURN] = TEST_EFFECTS as [(typeof TEST_EFFECTS)[0], (typeof TEST_EFFECTS)[0]];

function camp(items: Item[], kindling = 2): GameState {
  const s = newGame(data, { seed: 4, classId: "test-fighter" });
  return {
    ...s,
    progress: { ...s.progress, trainerUnlocked: true },
    wallet: { ...s.wallet, dust: 1000, kindling },
    inventory: items.map((item, i) => ({ item, x: i * 2, y: 0 })),
  };
}

const find = (s: GameState, id: string) => s.inventory.find((p) => p.item.id === id)?.item;

describe("Trigger Codex parts", () => {
  it("every Condition × Effect is an affix that never drops", () => {
    const affix = TEST_CATALOG.affixes.get(kindledAffixId("life-below", "burn"));
    expect(affix).toMatchObject({ kind: "trigger", weight: 0, slots: [] });
    expect(affix && affix.kind === "trigger" && affix.parts).toEqual({
      condition: "life-below",
      effect: "burn",
    });
  });

  it("a kindled trigger takes the condition's timing and the effect's values", () => {
    // On Crit fires often: chance effects scale with its chance, magnitude effects use it.
    expect(kindledAffix(ON_CRIT, BURN)).toMatchObject({
      condition: { kind: "onCrit" },
      rolls: "chance",
      value: { min: 0.1, max: 0.2 },
      cooldown: 1,
    });
    expect(kindledAffix(ON_CRIT, HEAL)).toMatchObject({ chance: 0.5, cooldown: 10 });
    expect(kindledAffix(LOW_LIFE, HEAL)).toMatchObject({ oncePerFight: true, cooldown: 10 });
  });

  it("a kindled roll counts at its own tier, never above the item's", () => {
    expect(rollTier(RING, { affixId: "x", quality: 0, tier: 2 })).toBe(2);
    expect(rollTier(RING, { affixId: "x", quality: 0, tier: 5 })).toBe(3);
    expect(rollTier(RING, { affixId: "x", quality: 0 })).toBe(3);
  });
});

describe("learning", () => {
  it("salvage teaches Condition and Effect at the item's tier and keeps the highest", () => {
    const { codex, learned } = learnFromItem(EMPTY_CODEX, RING, TEST_CATALOG);
    expect(codex).toEqual({ conditions: { "on-crit": 3 }, effects: { burn: 3 } });
    expect(learned.map((l) => [l.id, l.mastery, l.isNew])).toEqual([
      ["on-crit", 3, true],
      ["burn", 3, true],
    ]);
    const lower = learnFromItem(codex, { ...RING, tier: 1 }, TEST_CATALOG);
    expect(lower.learned).toEqual([]);
    expect(lower.codex).toBe(codex);
    expect(learnFromItem(EMPTY_CODEX, PLAIN, TEST_CATALOG).learned).toEqual([]);
  });

  it("the salvage action fills the Codex, which survives the save", () => {
    let s = act(camp([RING]), { type: "salvage", itemId: RING.id });
    expect(codexMastery(s.legacy.codex, "effect", "burn")).toBe(3);
    s = deserializeGame(JSON.stringify(s));
    expect(codexMastery(s.legacy.codex, "condition", "on-crit")).toBe(3);
  });
});

describe("homes and Quarry", () => {
  const skirmisher = { archetype: "skirmisher", actId: "other", boss: false };

  it("a part is at home with its archetype, its act or the bosses", () => {
    expect(isHome(ON_CRIT.home, skirmisher)).toBe(true);
    expect(isHome(BURN.home, { ...skirmisher, actId: "test-act" })).toBe(true);
    expect(isHome(HEAL.home, { archetype: "boss", actId: "other", boss: true })).toBe(true);
    expect(isHome(LOW_LIFE.home, skirmisher)).toBe(false);
  });

  it("home triggers weigh more, the Quarry even more, stat affixes stay", () => {
    const searing = TEST_CATALOG.affixes.get("searing-crit");
    const wind = TEST_CATALOG.affixes.get("second-wind");
    const life = TEST_CATALOG.affixes.get("life");
    if (!searing || !wind || !life) throw new Error("fixture");
    const plain = codexAffixFactor(TEST_CATALOG, skirmisher, null);
    expect(plain(searing)).toBe(CODEX.homeWeight);
    expect(plain(wind)).toBe(1);
    expect(plain(life)).toBe(1);
    const hunted = codexAffixFactor(TEST_CATALOG, skirmisher, {
      kind: "effect",
      id: "heal",
      misses: 0,
    });
    expect(hunted(wind)).toBe(CODEX.quarryWeight);
  });

  it("Quarry Pity puts the part on a card", () => {
    const item = rollItem(
      TEST_CATALOG,
      { baseId: "test-ring", itemLevel: 5, rarity: "rare", forceTrigger: ["second-wind"] },
      new Rng(3),
    );
    expect(item.affixes.map((a) => a.affixId)).toContain("second-wind");
    expect(quarryFound([item], TEST_CATALOG, { kind: "effect", id: "heal", misses: 0 })).toBe(true);
  });

  it("Old Nan marks only known parts, and the mark counts Elite picks without it", () => {
    const s = camp([RING]);
    expect(() => act(s, { type: "setQuarry", part: { kind: "effect", id: "heal" } })).toThrow(
      /known/,
    );
    const learned = act(s, { type: "salvage", itemId: RING.id });
    const marked = act(learned, { type: "setQuarry", part: { kind: "effect", id: "burn" } });
    expect(marked.legacy.quarry).toEqual({ kind: "effect", id: "burn", misses: 0 });
    expect(act(marked, { type: "setQuarry", part: null }).legacy.quarry).toBeNull();
  });
});

describe("Kindle", () => {
  const learned = (items: Item[], kindling?: number) =>
    act(camp([RING, ...items], kindling), { type: "salvage", itemId: RING.id });
  const kindle = (itemId: string, affixIndex?: number) =>
    ({
      kind: "kindle",
      itemId,
      conditionId: "on-crit",
      effectId: "burn",
      ...(affixIndex !== undefined ? { affixIndex } : {}),
    }) as const;

  it("fills a free trigger place at the lower Mastery, capped by the item, up to 70 %", () => {
    const s = learned([PLAIN]);
    expect(kindleTargets(PLAIN, TEST_CATALOG)).toEqual([undefined]);
    expect(kindleTier(s.legacy.codex, "on-crit", "burn", PLAIN)).toBe(2);
    expect(craftCost(kindle(PLAIN.id), PLAIN, data, s)).toMatchObject({
      dust: CODEX.kindleDustPerTier * 2,
      kindling: 1,
    });
    const next = act(s, { type: "craft", request: kindle(PLAIN.id) });
    const item = find(next, PLAIN.id);
    const roll = item?.affixes[1];
    expect(roll).toMatchObject({ affixId: kindledAffixId("on-crit", "burn"), kindled: true });
    expect(roll?.tier).toBe(2);
    expect(roll?.quality).toBeLessThanOrEqual(CODEX.kindleMaxQuality);
    expect(item?.lockedAffix).toBe(1);
    expect(next.wallet.kindling).toBe(1);
    if (!item) throw new Error("no item");
    expect(itemModifiers(item, TEST_CATALOG).triggers[0]).toMatchObject({
      condition: { kind: "onCrit" },
      effect: { kind: "ailment", ailment: "burn" },
    });
  });

  it("replaces a trigger, one kindled trigger per item, and counts for the Affix Lock", () => {
    const other: Item = { ...RING, id: "ring-3" };
    let s = learned([other]);
    expect(kindleTargets(other, TEST_CATALOG)).toEqual([1]);
    expect(craftBlockReason(s, data, kindle(other.id))).toBe("notTrigger");
    expect(craftBlockReason(s, data, kindle(other.id, 0))).toBe("notTrigger");
    s = act(s, { type: "craft", request: kindle(other.id, 1) });
    const item = find(s, other.id);
    expect(item?.affixes[1]?.kindled).toBe(true);
    // Rekindling the same trigger works; Temper elsewhere is locked out.
    expect(craftBlockReason(s, data, kindle(other.id, 1))).toBeUndefined();
    expect(craftBlockReason(s, data, { kind: "temper", itemId: other.id, affixIndex: 0 })).toBe(
      "locked",
    );
  });

  it("needs learned parts, Kindling and a trigger place", () => {
    const fresh = camp([PLAIN]);
    expect(craftBlockReason(fresh, data, kindle(PLAIN.id))).toBe("unknownPart");
    expect(craftBlockReason(learned([PLAIN], 0), data, kindle(PLAIN.id))).toBe("kindling");
    const normal: Item = { ...PLAIN, id: "n", rarity: "normal", affixes: [] };
    expect(craftBlockReason(learned([normal]), data, kindle(normal.id))).toBe("noTriggerPlace");
  });
});
