import { describe, expect, it } from "vitest";
import { statAffixValue } from "../items/affixes";
import { rollItem, rollUnique } from "../items/generate";
import type { Item } from "../items/types";
import { Rng } from "../rng";
import { CRAFTING } from "./constants";
import { bossLevel, killPrice } from "./leveling";
import {
  type CraftRequest,
  affixRollRange,
  craftBlockReason,
  craftCost,
  gambleItem,
  gambleRarityWeights,
  gamblePrice,
  merchantItemLevel,
  temperOptionCount,
  upgradedItem,
} from "./crafting";
import { requiredLevel } from "../items/equipment";
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

/** A Normal shield (8 Strength at T1). */
const SHIELD = rollItem(
  data.items,
  { baseId: "test-shield", itemLevel: 1, rarity: "normal" },
  new Rng(1),
);

/** Camp, Liora and Marisha present, a full wallet, the shield worn and the ring in the inventory. */
function camp(overrides: Partial<GameState["wallet"]> = {}): GameState {
  const s = newGame(data, { seed: 4, classId: "test-fighter" });
  return {
    ...s,
    progress: { ...s.progress, met: ["liora", "marisha"] },
    wallet: {
      ...s.wallet,
      acorns: 1000,
      ash: 1000,
      emberCoal: 3,
      phoenixFeathers: 2,
      ...overrides,
    },
    hero: { ...s.hero, equipment: { offHand: SHIELD } },
    inventory: [{ item: RING, x: 0, y: 0 }],
  };
}

const ring = (s: GameState) => s.inventory.find((p) => p.item.id === RING.id)?.item;

describe("crafting", () => {
  it("Upgrade raises the Tier, keeps qualities and costs a Feather plus Acorns", () => {
    const s = act(camp(), { type: "craft", request: { kind: "upgrade", itemId: RING.id } });
    expect(ring(s)).toMatchObject({ tier: 2, affixes: RING.affixes });
    expect(s.wallet.phoenixFeathers).toBe(1);
    const oneTier = killPrice(RING.itemLevel, { acorns: CRAFTING.upgradeKillsPerTier }).acorns;
    expect(s.wallet.acorns).toBe(1000 - oneTier);
    expect(craftCost({ kind: "upgrade", itemId: "x" }, upgradedItem(RING)).acorns).toBe(
      killPrice(RING.itemLevel, { acorns: 2 * CRAFTING.upgradeKillsPerTier }).acorns,
    );
  });

  it("Upgrade needs a Phoenix Feather and keeps equipped items usable", () => {
    expect(
      craftBlockReason(camp({ phoenixFeathers: 0 }), data, { kind: "upgrade", itemId: RING.id }),
    ).toBe("phoenixFeathers");
    // The shield needs 8 Strength at T1 and more at T2; the hero has 6.
    const s = camp();
    const shield = SHIELD.id;
    expect(craftBlockReason(s, data, { kind: "upgrade", itemId: shield })).toBe("requirements");
    const strong = {
      ...s,
      hero: { ...s.hero, level: 10, attributes: { ...s.hero.attributes, strength: 99 } },
    };
    expect(
      act(strong, { type: "craft", request: { kind: "upgrade", itemId: shield } }).hero.equipment
        .offHand?.tier,
    ).toBe(2);
  });

  it("Upgrade raises the Required Level with the Tier, so a worn item needs the level", () => {
    const low: Item = { ...RING, itemLevel: 5, tier: 1 };
    expect(requiredLevel(low)).toBe(1);
    expect(requiredLevel({ ...low, tier: 2 })).toBe(6);
    expect(requiredLevel({ ...low, tier: 10 })).toBe(86);
    // A drop above its Tier start keeps its own Item Level.
    expect(requiredLevel({ ...low, itemLevel: 15, tier: 2 })).toBe(10);
    const s = camp();
    const worn = { ...s, hero: { ...s.hero, equipment: { ring1: low } } };
    expect(craftBlockReason(worn, data, { kind: "upgrade", itemId: RING.id })).toBe("level");
    expect(craftBlockReason(s, data, { kind: "upgrade", itemId: RING.id })).toBeUndefined();
  });

  it("Temper offers a new affix and a new value, locks the affix and waits for a choice", () => {
    let s = act(camp(), {
      type: "craft",
      request: { kind: "temper", itemId: RING.id, affixIndex: 1 },
    });
    const offered = ring(s);
    expect(offered?.lockedAffix).toBe(1);
    expect(offered?.affixes).toEqual(RING.affixes);
    const offer = offered?.temperOffer ?? [];
    expect(offer).toHaveLength(2);
    // A new affix the ring does not carry, then the same affix with a new value.
    expect(["crit", "elemental"]).toContain(offer[0]?.affixId);
    expect(offer[1]?.affixId).toBe("life");
    expect(s.wallet.ash).toBe(1000 - killPrice(RING.itemLevel, CRAFTING.temperKills).ash);
    // Locked: only affix 1 can change now.
    expect(craftBlockReason(s, data, { kind: "temper", itemId: RING.id, affixIndex: 0 })).toBe(
      "locked",
    );
    // Choosing is free and takes the option.
    const wallet = s.wallet;
    s = act(s, { type: "craft", request: { kind: "temperChoose", itemId: RING.id, option: 0 } });
    expect(ring(s)?.affixes[1]).toEqual(offer[0]);
    expect(ring(s)?.temperOffer).toBeUndefined();
    expect(ring(s)?.lockedAffix).toBe(1);
    expect(s.wallet).toEqual(wallet);
    expect(craftBlockReason(s, data, { kind: "temperChoose", itemId: RING.id, option: 0 })).toBe(
      "noOffer",
    );
  });

  it("Temper can be kept, and a new Temper replaces the waiting offer", () => {
    let s = act(camp(), {
      type: "craft",
      request: { kind: "temper", itemId: RING.id, affixIndex: 1 },
    });
    const first = ring(s)?.temperOffer;
    s = act(s, { type: "craft", request: { kind: "temper", itemId: RING.id, affixIndex: 1 } });
    expect(ring(s)?.temperOffer).not.toEqual(first);
    s = act(s, {
      type: "craft",
      request: { kind: "temperChoose", itemId: RING.id, option: null },
    });
    expect(ring(s)?.affixes).toEqual(RING.affixes);
    expect(ring(s)?.temperOffer).toBeUndefined();
  });

  it("an affix with a fixed value gets two new affixes; with nothing left there is no Temper", () => {
    const fixed: Item = {
      ...RING,
      rarity: "rare",
      affixes: [{ affixId: "flat-str", quality: 0 }, ...RING.affixes.slice(1)],
    };
    const fixedData = {
      ...data,
      items: {
        ...data.items,
        affixes: new Map([
          ...data.items.affixes,
          [
            "flat-str",
            {
              kind: "stat" as const,
              id: "flat-str",
              stat: "strength" as const,
              suffix: "of One",
              slots: ["ring" as const],
              weight: 10,
              tags: [],
              value: { min: 1, max: 1 },
              perTier: 0,
            },
          ],
        ]),
      },
    };
    const s = { ...camp(), inventory: [{ item: fixed, x: 0, y: 0 }] };
    const next = applyAction(s, fixedData, {
      type: "craft",
      request: { kind: "temper", itemId: RING.id, affixIndex: 0 },
    });
    const offer = ring(next)?.temperOffer ?? [];
    const ids = offer.map((r) => r.affixId);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(["strength", "crit", "elemental"]).toContain(id);
    // A ring that already carries every ring affix has nothing to offer for a fixed one.
    const full: Item = {
      ...fixed,
      affixes: [
        { affixId: "flat-str", quality: 0 },
        { affixId: "strength", quality: 0 },
        { affixId: "life", quality: 0 },
        { affixId: "crit", quality: 0 },
        { affixId: "elemental", quality: 0 },
      ],
    };
    expect(temperOptionCount(full, 0, fixedData.items)).toBe(0);
    expect(
      craftBlockReason({ ...s, inventory: [{ item: full, x: 0, y: 0 }] }, fixedData, {
        kind: "temper",
        itemId: RING.id,
        affixIndex: 0,
      }),
    ).toBe("noOptions");
  });

  it("Trigger affixes cannot be tempered", () => {
    const s = camp();
    expect(craftBlockReason(s, data, { kind: "temper", itemId: RING.id, affixIndex: 2 })).toBe(
      "trigger",
    );
  });

  it("Reforge rerolls the stat affixes, keeps every trigger and the Greater on a trigger", () => {
    const item: Item = {
      ...RING,
      affixes: [...RING.affixes, { affixId: "second-wind", quality: 0.9, kindled: true }],
      greater: { index: 2, rank: 3 },
      temperOffer: [{ affixId: "crit", quality: 1 }],
      lockedAffix: 1,
    };
    let s: GameState = { ...camp(), inventory: [{ item, x: 0, y: 0 }] };
    for (let n = 0; n < 5; n++) {
      const next = act(s, { type: "craft", request: { kind: "reforge", itemId: RING.id } });
      const reforged = ring(next);
      const stats = (reforged?.affixes ?? []).slice(0, -2);
      expect(reforged?.affixes.slice(-2)).toEqual(item.affixes.slice(2));
      expect(stats.length).toBeGreaterThan(0);
      expect(stats.every((r) => data.items.affixes.get(r.affixId)?.kind === "stat")).toBe(true);
      expect(reforged?.greater).toEqual({ index: stats.length, rank: 3 });
      expect(reforged?.temperOffer).toBeUndefined();
      expect(reforged?.lockedAffix).toBeUndefined();
      s = { ...s, nonce: next.nonce };
    }
  });

  it("Charms carry only triggers, so Thoric does not reforge them", () => {
    const charm: Item = {
      id: "charm-1",
      baseId: "test-charm",
      name: "Test Charm",
      rarity: "magic",
      itemLevel: 5,
      tier: 1,
      affixes: [{ affixId: "searing-crit", quality: 0.5 }],
    };
    const s = { ...camp(), inventory: [{ item: charm, x: 0, y: 0 }] };
    expect(craftBlockReason(s, data, { kind: "reforge", itemId: charm.id })).toBe("charm");
  });

  it("Reforge rerolls all affixes, keeps base, tier and rarity, and clears the lock", () => {
    const locked: Item = { ...RING, tier: 3, lockedAffix: 1 };
    const s = { ...camp(), inventory: [{ item: locked, x: 0, y: 0 }] };
    const next = act(s, { type: "craft", request: { kind: "reforge", itemId: RING.id } });
    const reforged = ring(next);
    expect(reforged).toMatchObject({ id: RING.id, baseId: "test-ring", rarity: "rare", tier: 3 });
    expect(reforged?.lockedAffix).toBeUndefined();
    expect(reforged?.affixes).not.toEqual(RING.affixes);
    expect(next.wallet.emberCoal).toBe(2);
    // Same seed and nonce: same result.
    expect(act(s, { type: "craft", request: { kind: "reforge", itemId: RING.id } })).toEqual(next);
  });

  it("Normal items have no affixes to reroll", () => {
    const s = camp();
    const shield = SHIELD.id;
    expect(craftBlockReason(s, data, { kind: "reforge", itemId: shield })).toBe("noAffixes");
    expect(craftBlockReason(s, data, { kind: "temper", itemId: shield, affixIndex: 0 })).toBe(
      "noAffixes",
    );
  });

  it("Liora's crafts wait for her, Thoric's do not; all crafting is Camp only", () => {
    const early = { ...camp(), progress: { ...camp().progress, met: [] } };
    expect(craftBlockReason(early, data, { kind: "temper", itemId: RING.id, affixIndex: 0 })).toBe(
      "mystic",
    );
    expect(craftBlockReason(early, data, { kind: "upgrade", itemId: RING.id })).toBeUndefined();
    expect(craftBlockReason(early, data, { kind: "reforge", itemId: RING.id })).toBeUndefined();
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
    let s: GameState = { ...camp({ ash: 10_000 }), inventory: [{ item, x: 0, y: 0 }] };
    const index = item.affixes.findIndex((a) => a.affixId === "strength");
    if (index < 0) return;
    for (let i = 0; i < 30; i++) {
      s = act(s, {
        type: "craft",
        request: { kind: "temper", itemId: item.id, affixIndex: index },
      });
      // One option is the same affix with a new value.
      const same = s.inventory[0]?.item.temperOffer?.find((r) => r.affixId === "strength");
      const q = same?.quality ?? -1;
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
  /** Nyssa present, Runes in the pouch, the axe in the inventory. */
  function runeCamp(runes: Record<string, number> = { ash: 4, thorn: 1 }): GameState {
    const s = camp({ runes });
    return {
      ...s,
      progress: { ...s.progress, met: [...s.progress.met, "nyssa"] },
      inventory: [...s.inventory, { item: AXE, x: 2, y: 0 }],
    };
  }
  const axe = (s: GameState) => s.inventory.find((p) => p.item.id === AXE.id)?.item;
  const craftIt = (s: GameState, request: CraftRequest) => act(s, { type: "craft", request });

  it("Add Socket: Normal items up to the base's maximum, only before the first Rune", () => {
    let s = craftIt(runeCamp(), { kind: "addSocket", itemId: AXE.id });
    s = craftIt(s, { kind: "addSocket", itemId: AXE.id });
    expect(axe(s)?.sockets).toBe(2);
    expect(s.wallet.ash).toBe(
      1000 -
        killPrice(AXE.itemLevel, { ash: CRAFTING.addSocketKills.ash }).ash -
        killPrice(AXE.itemLevel, { ash: CRAFTING.addSocketKills.ash * 2 }).ash,
    );
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
      craftBlockReason({ ...s, progress: { ...s.progress, met: [] } }, data, {
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
    expect(s.wallet.acorns).toBe(
      1000 - killPrice(bossLevel(0), { acorns: CRAFTING.combineRunesKillsPerRank }).acorns,
    );
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
    expect(s.wallet.acorns).toBe(1000 - gamblePrice(merchantItemLevel(runeCamp(), data)));
    // Run 1: Marisha rolls like a normal enemy's card, at most Magic (economy-audit-v1.md E3).
    const early = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      early.add(gambleItem(s, data, "ring", new Rng(seed)).rarity);
    }
    expect([...early].sort()).toEqual(["magic", "normal"]);
    expect(gambleRarityWeights(0)).toMatchObject({ epic: 0, legendary: 0 });
    // From run 5 on, some gambles come out Legendary, as often as on an Elite's card.
    const late = { ...s, legacy: { ...s.legacy, prestige: 4 } };
    const rarities = new Set<string>();
    for (let seed = 0; seed < 400; seed++) {
      rarities.add(gambleItem(late, data, "ring", new Rng(seed)).rarity);
    }
    expect(rarities.has("legendary")).toBe(true);
  });

  it("Uniques never change: no Reforge or Temper", () => {
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
