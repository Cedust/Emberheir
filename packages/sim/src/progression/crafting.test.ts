import { describe, expect, it } from "vitest";
import { statAffixValue } from "../items/affixes";
import { rollItem, rollUnique } from "../items/generate";
import type { Item } from "../items/types";
import { Rng } from "../rng";
import { CRAFTING } from "./constants";
import {
  type CraftRequest,
  affixRollRange,
  craftBlockReason,
  craftCost,
  gambleItem,
  gambleRarityWeights,
  gamblePrice,
  merchantItemLevel,
  upgradedItem,
} from "./crafting";
import { type GameAction, type GameState, applyAction, newGame } from "./game";
import { TEST_GAME_DATA } from "./test-fixtures";

const data = TEST_GAME_DATA;
const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);

/** A Rare ring with strength, life and crit (in that order). */
const RING: Item = {
  id: "ring-1",
  baseId: "test-ring",
  name: "Ash Bite",
  rarity: "rare",
  itemLevel: 5,
  tier: 1,
  affixes: [
    { affixId: "strength", quality: 0.2 },
    { affixId: "life", quality: 0.5 },
    { affixId: "searing-crit", quality: 0.5 },
  ],
};

/** Camp, Liora present, a full wallet and the ring in the inventory. */
function camp(overrides: Partial<GameState["wallet"]> = {}): GameState {
  const s = newGame(data, { seed: 4, starterWeapon: "test-sword" });
  return {
    ...s,
    progress: { ...s.progress, trainerUnlocked: true },
    wallet: {
      ...s.wallet,
      gold: 1000,
      dust: 1000,
      reforgeStones: 3,
      ascensionShards: 2,
      essences: { "test-essence": 2 },
      ...overrides,
    },
    inventory: [{ item: RING, x: 0, y: 0 }],
  };
}

const ring = (s: GameState) => s.inventory.find((p) => p.item.id === RING.id)?.item;

describe("crafting", () => {
  it("Upgrade raises the Tier, keeps qualities and costs a Shard plus Gold", () => {
    const s = act(camp(), { type: "craft", request: { kind: "upgrade", itemId: RING.id } });
    expect(ring(s)).toMatchObject({ tier: 2, affixes: RING.affixes });
    expect(s.wallet.ascensionShards).toBe(1);
    expect(s.wallet.gold).toBe(1000 - CRAFTING.upgradeGoldPerTier);
    expect(craftCost({ kind: "upgrade", itemId: "x" }, upgradedItem(RING)).gold).toBe(
      2 * CRAFTING.upgradeGoldPerTier,
    );
  });

  it("Upgrade needs an Ascension Shard and keeps equipped items usable", () => {
    expect(
      craftBlockReason(camp({ ascensionShards: 0 }), data, { kind: "upgrade", itemId: RING.id }),
    ).toBe("ascensionShards");
    // The starter sword needs 5 Strength at T1 and more at T2; the hero has 6.
    const s = camp();
    const sword = s.hero.equipment.mainHand?.id ?? "";
    expect(craftBlockReason(s, data, { kind: "upgrade", itemId: sword })).toBe("requirements");
    const strong = {
      ...s,
      hero: { ...s.hero, attributes: { ...s.hero.attributes, strength: 99 } },
    };
    expect(
      act(strong, { type: "craft", request: { kind: "upgrade", itemId: sword } }).hero.equipment
        .mainHand?.tier,
    ).toBe(2);
  });

  it("Temper rerolls one stat affix and locks it in", () => {
    let s = act(camp(), {
      type: "craft",
      request: { kind: "temper", itemId: RING.id, affixIndex: 1 },
    });
    const tempered = ring(s);
    expect(tempered?.lockedAffix).toBe(1);
    expect(tempered?.affixes[0]).toEqual(RING.affixes[0]);
    expect(tempered?.affixes[1]?.affixId).toBe("life");
    expect(s.wallet.dust).toBe(1000 - CRAFTING.temperDust);
    // Locked: only affix 1 can change now.
    expect(craftBlockReason(s, data, { kind: "temper", itemId: RING.id, affixIndex: 0 })).toBe(
      "locked",
    );
    s = act(s, { type: "craft", request: { kind: "temper", itemId: RING.id, affixIndex: 1 } });
    expect(ring(s)?.lockedAffix).toBe(1);
  });

  it("Trigger affixes cannot be tempered or imbued", () => {
    const s = camp();
    expect(craftBlockReason(s, data, { kind: "temper", itemId: RING.id, affixIndex: 2 })).toBe(
      "trigger",
    );
    expect(
      craftBlockReason(s, data, {
        kind: "imbue",
        itemId: RING.id,
        affixIndex: 2,
        essenceId: "test-essence",
      }),
    ).toBe("trigger");
  });

  it("Imbue replaces one affix with the Essence's affix and locks it", () => {
    // Test Essence imbues Life; the ring already has Life at index 1.
    const s = camp();
    expect(
      craftBlockReason(s, data, {
        kind: "imbue",
        itemId: RING.id,
        affixIndex: 0,
        essenceId: "test-essence",
      }),
    ).toBe("duplicateAffix");
    const next = act(s, {
      type: "craft",
      request: { kind: "imbue", itemId: RING.id, affixIndex: 1, essenceId: "test-essence" },
    });
    expect(ring(next)).toMatchObject({ lockedAffix: 1 });
    expect(next.wallet.essences["test-essence"]).toBe(1);
    // Life does not roll on Main Hands.
    const sword = s.hero.equipment.mainHand;
    const magicSword: Item = { ...(sword as Item), affixes: [{ affixId: "crit", quality: 0.5 }] };
    const withSword = { ...s, hero: { ...s.hero, equipment: { mainHand: magicSword } } };
    expect(
      craftBlockReason(withSword, data, {
        kind: "imbue",
        itemId: magicSword.id,
        affixIndex: 0,
        essenceId: "test-essence",
      }),
    ).toBe("affixDoesNotFit");
  });

  it("Reforge rerolls all affixes, keeps base, tier and rarity, and clears the lock", () => {
    const locked: Item = { ...RING, tier: 3, lockedAffix: 1 };
    const s = { ...camp(), inventory: [{ item: locked, x: 0, y: 0 }] };
    const next = act(s, { type: "craft", request: { kind: "reforge", itemId: RING.id } });
    const reforged = ring(next);
    expect(reforged).toMatchObject({ id: RING.id, baseId: "test-ring", rarity: "rare", tier: 3 });
    expect(reforged?.lockedAffix).toBeUndefined();
    expect(reforged?.affixes).not.toEqual(RING.affixes);
    expect(next.wallet.reforgeStones).toBe(2);
    // Same seed and nonce: same result.
    expect(act(s, { type: "craft", request: { kind: "reforge", itemId: RING.id } })).toEqual(next);
  });

  it("Normal items have no affixes to reroll", () => {
    const s = camp();
    const sword = s.hero.equipment.mainHand?.id ?? "";
    expect(craftBlockReason(s, data, { kind: "reforge", itemId: sword })).toBe("noAffixes");
    expect(craftBlockReason(s, data, { kind: "temper", itemId: sword, affixIndex: 0 })).toBe(
      "noAffixes",
    );
  });

  it("Distill turns Salvage Dust into a Reforge Stone", () => {
    const s = act(camp(), { type: "craft", request: { kind: "distill" } });
    expect(s.wallet.reforgeStones).toBe(4);
    expect(s.wallet.dust).toBe(1000 - CRAFTING.distillDust);
    expect(craftBlockReason(camp({ dust: 0 }), data, { kind: "distill" })).toBe("dust");
  });

  it("Liora's crafts wait for her; all crafting is Camp only", () => {
    const early = { ...camp(), progress: { ...camp().progress, trainerUnlocked: false } };
    expect(craftBlockReason(early, data, { kind: "distill" })).toBe("mystic");
    expect(craftBlockReason(early, data, { kind: "upgrade", itemId: RING.id })).toBeUndefined();
    const inRun = act(camp(), { type: "setOut", actId: "test-act" });
    expect(craftBlockReason(inRun, data, { kind: "upgrade", itemId: RING.id })).toBe("camp");
    expect(() =>
      act(inRun, { type: "craft", request: { kind: "upgrade", itemId: RING.id } }),
    ).toThrow();
  });

  it("the roll range covers every value Temper can roll", () => {
    const item = rollItem(
      data.items,
      { baseId: "test-ring", itemLevel: 7, rarity: "rare" },
      new Rng(1),
    );
    const range = affixRollRange(item, "strength", data.items);
    const affix = data.items.affixes.get("strength");
    if (!range || affix?.kind !== "stat") throw new Error("missing");
    let s: GameState = { ...camp(), inventory: [{ item, x: 0, y: 0 }] };
    const index = item.affixes.findIndex((a) => a.affixId === "strength");
    if (index < 0) return;
    for (let i = 0; i < 30; i++) {
      s = act(s, {
        type: "craft",
        request: { kind: "temper", itemId: item.id, affixIndex: index },
      });
      const q = s.inventory[0]?.item.affixes[index]?.quality ?? -1;
      const value = statAffixValue(affix, item.tier, q);
      expect(value).toBeGreaterThanOrEqual(range.min);
      expect(value).toBeLessThanOrEqual(range.max);
    }
  });
});

describe("Sockets, Runes and Marisha", () => {
  const AXE: Item = {
    id: "axe-1",
    baseId: "test-axe",
    name: "Test Axe",
    rarity: "normal",
    itemLevel: 5,
    tier: 1,
    affixes: [],
  };
  /** Eldrin present, Runes in the pouch, the axe in the inventory. */
  function runeCamp(runes: Record<string, number> = { ash: 4, thorn: 1 }): GameState {
    const s = camp({ runes });
    return {
      ...s,
      progress: { ...s.progress, runesmithUnlocked: true },
      inventory: [...s.inventory, { item: AXE, x: 2, y: 0 }],
    };
  }
  const axe = (s: GameState) => s.inventory.find((p) => p.item.id === AXE.id)?.item;
  const craftIt = (s: GameState, request: CraftRequest) => act(s, { type: "craft", request });

  it("Add Socket: Normal items up to the base's maximum, only before the first Rune", () => {
    let s = craftIt(runeCamp(), { kind: "addSocket", itemId: AXE.id });
    s = craftIt(s, { kind: "addSocket", itemId: AXE.id });
    expect(axe(s)?.sockets).toBe(2);
    expect(s.wallet.dust).toBe(1000 - CRAFTING.addSocketDust * 3);
    expect(craftBlockReason(s, data, { kind: "addSocket", itemId: AXE.id })).toBe("maxSockets");
    expect(craftBlockReason(s, data, { kind: "addSocket", itemId: RING.id })).toBe("notNormal");
  });

  it("Socket Rune fills Sockets in order and forges a Runeword into the Codex", () => {
    let s = runeCamp();
    s = {
      ...s,
      inventory: s.inventory.map((p) =>
        p.item.id === AXE.id ? { ...p, item: { ...AXE, sockets: 2 } } : p,
      ),
    };
    expect(
      craftBlockReason({ ...s, progress: { ...s.progress, runesmithUnlocked: false } }, data, {
        kind: "socketRune",
        itemId: AXE.id,
        runeId: "ash",
      }),
    ).toBe("runesmith");
    s = craftIt(s, { kind: "socketRune", itemId: AXE.id, runeId: "ash" });
    expect(axe(s)?.runes).toEqual(["ash"]);
    expect(s.wallet.runes).toEqual({ ash: 3, thorn: 1 });
    s = craftIt(s, { kind: "socketRune", itemId: AXE.id, runeId: "thorn" });
    expect(axe(s)?.name).toBe("Splinter");
    expect(s.wallet.runes).toEqual({ ash: 3 });
    expect(s.legacy.runewords).toEqual(["splinter"]);
    expect(craftBlockReason(s, data, { kind: "socketRune", itemId: AXE.id, runeId: "ash" })).toBe(
      "noSocket",
    );
    // A Reforge keeps Sockets, Runes and the Runeword name.
    expect(craftBlockReason(s, data, { kind: "reforge", itemId: AXE.id })).toBe("noAffixes");
  });

  it("Combine Runes: three of a kind make one of the next rank", () => {
    const s = craftIt(runeCamp(), { kind: "combineRunes", runeId: "ash" });
    expect(s.wallet.runes).toEqual({ ash: 1, thorn: 1, moss: 1 });
    expect(s.legacy.runesFound).toContain("moss");
    expect(s.wallet.gold).toBe(1000 - CRAFTING.combineRunesGoldPerRank);
    expect(craftBlockReason(s, data, { kind: "combineRunes", runeId: "ash" })).toBe("runes");
    expect(
      craftBlockReason(runeCamp({ thorn: 3 }), data, { kind: "combineRunes", runeId: "thorn" }),
    ).toBe("maxRank");
  });

  it("Gamble: a random item for the chosen slot into the inventory", () => {
    const s = craftIt(runeCamp(), { kind: "gamble", slot: "ring" });
    expect(s.inventory).toHaveLength(3);
    const item = s.inventory[2]?.item;
    expect(item?.baseId).toBe("test-ring");
    expect(item?.rarity).not.toBe("normal");
    expect(s.wallet.gold).toBe(1000 - gamblePrice(merchantItemLevel(runeCamp(), data)));
    // Run 1: Marisha gives at most Rare, one step above what its enemies drop.
    const early = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      early.add(gambleItem(s, data, "ring", new Rng(seed)).rarity);
    }
    expect([...early].sort()).toEqual(["magic", "rare"]);
    expect(gambleRarityWeights(0)).toMatchObject({ epic: 0, legendary: 0 });
    // From run 5 on, some gambles come out Legendary.
    const late = { ...s, legacy: { ...s.legacy, prestige: 4 } };
    const rarities = new Set<string>();
    for (let seed = 0; seed < 400; seed++) {
      rarities.add(gambleItem(late, data, "ring", new Rng(seed)).rarity);
    }
    expect(rarities.has("legendary")).toBe(true);
  });

  it("Uniques never change: no Reforge, Temper or Imbue", () => {
    const unique = rollUnique(data.items, "band", 5, new Rng(1));
    const s = { ...camp(), inventory: [{ item: unique, x: 0, y: 0 }] };
    expect(craftBlockReason(s, data, { kind: "reforge", itemId: unique.id })).toBe("fixed");
    expect(craftBlockReason(s, data, { kind: "temper", itemId: unique.id, affixIndex: 0 })).toBe(
      "fixed",
    );
  });

  it("Reforge keeps the Legendary Power", () => {
    const legendary = rollItem(
      data.items,
      { baseId: "test-ring", itemLevel: 5, rarity: "legendary" },
      new Rng(2),
    );
    const s = craftIt(
      { ...camp(), inventory: [{ item: legendary, x: 0, y: 0 }] },
      { kind: "reforge", itemId: legendary.id },
    );
    expect(s.inventory[0]?.item.powerId).toBe("echo");
  });
});
