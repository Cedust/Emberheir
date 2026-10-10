import { describe, expect, it } from "vitest";
import { bossTrophies, rollItem, uniquesFor } from "../items/generate";
import { ATTRIBUTE_RULES } from "./attributes";
import { CODEX, PROGRESSION } from "./constants";
import {
  type GameAction,
  type GameData,
  type GameState,
  GameActionError,
  actUnlocked,
  applyAction,
  isHarvestAct,
  levelBand,
  stageMonsterLevel,
  stagePressure,
  enemySetup,
  nextAct,
  currentFight,
  deserializeGame,
  equipBlockReason,
  heroRotation,
  heroSetup,
  itemPickWeights,
  lootGate,
  moveBlockReason,
  prestigeRewards,
  newGame,
  SAVE_VERSION,
  spentInTree,
  rewardsDone,
  serializeGame,
  addRunes,
  maxRuneRank,
  rollRuneDrops,
} from "./game";
import { levelCap } from "./leveling";
import { Rng } from "../rng";
import { TEST_ACT, TEST_GAME_DATA, TREE_SKILL, WEAK_ENEMY } from "./test-fixtures";

const data = TEST_GAME_DATA;
const start = (seed = 1) => newGame(data, { seed, classId: "test-fighter" });
/** A Normal ring worn in the Ring slot (the hero starts with no gear but the weapon). */
const OLD_RING = rollItem(
  data.items,
  { baseId: "test-ring", itemLevel: 1, rarity: "normal" },
  new Rng(9),
);
const ringed = (state: GameState): GameState => ({
  ...state,
  hero: { ...state.hero, equipment: { ...state.hero.equipment, ring1: OLD_RING } },
});
const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);
/** A later run: Prestige `prestige` opens that many more acts. */
const inRun = (state: GameState, prestige: number): GameState => ({
  ...state,
  legacy: { ...state.legacy, prestige },
});
/** The third run with the road to every act open, as if the earlier bosses had fallen. */
const unlocked = (state: GameState): GameState => ({
  ...inRun(state, 2),
  progress: { ...state.progress, actsCleared: ["test-act", "deadly-act"] },
});

/** Plays one stage: fight, take nothing (Salvage All), skip spoils, continue. */
function clearStage(state: GameState): GameState {
  let s = act(state, { type: "startStage" }, { type: "resolveFight" });
  s = act(s, { type: "salvageAll" });
  if (s.run?.rewards?.spoils.length) s = act(s, { type: "pickSpoils", index: 0 });
  return act(s, { type: "continue" });
}

describe("game loop", () => {
  it("starts in the Camp with the class weapon (no item) and its Innate skill", () => {
    const state = start();
    expect(state.run).toBeNull();
    expect(state.hero.weaponId).toBe("test-sword");
    expect(state.hero.equipment).toEqual({});
    const { setup } = heroSetup(state, data);
    expect(setup.rotation.map((r) => r.skill.id)).toEqual(["sword-skill"]);
    expect(setup.bonuses?.life).toBe(5); // start node
  });

  it("is deterministic: same seed and actions, same game", () => {
    const play = () => clearStage(act(start(7), { type: "setOut", actId: "test-act" }));
    expect(play()).toEqual(play());
  });

  it("plays a stage: intermission → fight → rewards → next stage", () => {
    let s = act(start(), { type: "setOut", actId: "test-act" });
    expect(s.run).toMatchObject({ stage: 1, phase: "intermission", lifeFraction: 1 });
    s = act(s, { type: "startStage" });
    expect(s.run?.phase).toBe("fight");
    expect(currentFight(s, data).enemy.name).toBe("Weakling");
    s = act(s, { type: "resolveFight" });
    const rewards = s.run?.rewards;
    expect(rewards?.items).toHaveLength(PROGRESSION.itemChoices);
    expect(rewards?.xp).toBeGreaterThan(0);
    expect(s.wallet.gold).toBe(rewards?.gold);
    expect(s.stats).toMatchObject({ fights: 1, wins: 1 });
    expect(() => act(s, { type: "continue" })).toThrow(GameActionError);

    s = act(s, { type: "pickItem", index: 0, mode: "take" });
    expect(s.inventory).toHaveLength(1);
    expect(s.run?.rewards?.salvagedDust).toBeGreaterThan(0);
    expect(rewardsDone(s.run?.rewards ?? fail())).toBe(true);
    s = act(s, { type: "continue" });
    expect(s.run).toMatchObject({ stage: 2, phase: "intermission", encounter: null });
  });

  it("offers Spoils at the act's spoils stages", () => {
    let s = clearStage(act(start(), { type: "setOut", actId: "test-act" }));
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    expect(s.run?.stage).toBe(2);
    expect(s.run?.rewards?.spoils.map((c) => c.kind)).toEqual([
      "flaskCharge",
      "reforgeStones",
      "essence",
    ]);
    s = act(s, { type: "salvageAll" }, { type: "pickSpoils", index: 2 });
    expect(s.wallet.essences["test-essence"]).toBe(1);
    expect(() => act(s, { type: "pickSpoils", index: 1 })).toThrow(/already/);
  });

  it("clears the act after the boss: back to Camp, Kaelen joins, Pity resets", () => {
    // The second run: Act 1's boss is no longer the harvest.
    let s = act(inRun(start(), 1), { type: "setOut", actId: "test-act" });
    s = { ...s, progress: { ...s.progress, deathsInAct: 3 } };
    for (let i = 0; i < 2; i++) s = clearStage(s);
    s = act(s, { type: "startStage" });
    expect(s.run?.encounter).toMatchObject({
      enemyId: "boss",
      boss: true,
      level: stageMonsterLevel(data, TEST_ACT, 3, 1),
    });
    s = act(s, { type: "resolveFight" });
    expect(s.run?.rewards?.reforgeStones).toBeGreaterThanOrEqual(PROGRESSION.bossReforgeStones[0]);
    // Run 2: the Boss Hoard is at least Rare.
    expect(s.run?.rewards?.items.every((i) => i.rarity === "rare" || i.rarity === "epic")).toBe(
      true,
    );
    // Bosses and Elites offer Kindling instead of Reforge Stones.
    expect(s.run?.rewards?.spoils[1]).toEqual({ kind: "kindling", amount: CODEX.bossKindling });
    s = act(s, { type: "salvageAll" }, { type: "pickSpoils", index: 1 });
    expect(s.wallet.kindling).toBe(CODEX.bossKindling);
    s = act(s, { type: "continue" });
    expect(s.run).toBeNull();
    expect(s.notice).toMatchObject({ kind: "actCleared", enemyName: "Boss" });
    expect(s.progress).toMatchObject({
      actsCleared: ["test-act"],
      deathsInAct: 0,
      trainerUnlocked: true,
    });
    expect(s.stats.bossKills).toBe(1);
  });

  it("death sends the hero back to Camp, keeps gear and counts for Pity", () => {
    let s = act(unlocked(start()), { type: "setOut", actId: "deadly-act" });
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    expect(s.run).toBeNull();
    expect(s.notice).toMatchObject({ kind: "death", stage: 1, enemyName: "Killer" });
    expect(s.progress.deathsInAct).toBe(1);
    expect(s.stats.deaths).toBe(1);
    expect(act(s, { type: "dismissNotice" }).notice).toBeNull();
  });

  it("Retreat works in the intermission and mid-fight, without Pity", () => {
    const s = act(start(), { type: "setOut", actId: "test-act" });
    const fromIntermission = act(s, { type: "retreat" });
    const midFight = act(s, { type: "startStage" }, { type: "retreat" });
    for (const r of [fromIntermission, midFight]) {
      expect(r.run).toBeNull();
      expect(r.notice?.kind).toBe("retreat");
      expect(r.progress.deathsInAct).toBe(0);
    }
    expect(midFight.notice?.enemyName).toBe("Weakling");
  });

  it("the Ember Flask heals between stages and refills in Camp", () => {
    let s = act(start(), { type: "setOut", actId: "test-act" });
    expect(() => act(s, { type: "useFlask" })).toThrow(/full/);
    s = { ...s, run: s.run && { ...s.run, lifeFraction: 0.3 } };
    s = act(s, { type: "useFlask" });
    expect(s.run?.lifeFraction).toBeCloseTo(0.3 + PROGRESSION.flaskHeal);
    expect(s.flaskCharges).toBe(PROGRESSION.flaskStartCharges - 1);
    s = act(s, { type: "retreat" });
    expect(s.flaskCharges).toBe(PROGRESSION.flaskStartCharges);
  });

  it("life carries over into the next fight", () => {
    let s = act(start(), { type: "setOut", actId: "test-act" });
    s = { ...s, run: s.run && { ...s.run, lifeFraction: 0.5 } };
    s = act(s, { type: "startStage" });
    expect(currentFight(s, data).hero.lifeFraction).toBe(0.5);
  });

  it("level-ups give Skill Points but no Attribute Points; attributes are spent between fights", () => {
    let s = start();
    s = { ...s, hero: { ...s.hero, xp: (PROGRESSION.xpToNextLevel[0] ?? 0) - 1 } };
    s = act(
      s,
      { type: "setOut", actId: "test-act" },
      { type: "startStage" },
      { type: "resolveFight" },
    );
    expect(s.hero.level).toBe(2);
    expect(s.run?.rewards?.levelsGained).toBe(1);
    // The creation's free points still wait; the level brings none.
    expect(s.hero.unspentAttributePoints).toBe(ATTRIBUTE_RULES.creationPoints);
    expect(s.hero.unspentSkillPoints).toBe(
      PROGRESSION.startSkillPoints + PROGRESSION.skillPointsPerLevel,
    );
    s = act(s, { type: "allocateAttributes", points: { strength: 3, vitality: 3 } });
    expect(s.hero.attributes.strength).toBe(9);
    expect(s.hero.unspentAttributePoints).toBe(0);
    expect(() => act(s, { type: "allocateAttributes", points: { strength: 1 } })).toThrow();
  });

  it("Kaelen teaches the Skill Tree from the first Camp on", () => {
    let s = { ...start(), hero: { ...start().hero, unspentSkillPoints: 3 } };
    expect(s.progress.trainerUnlocked).toBe(false);
    s = act(s, { type: "learnNodes", nodeIds: ["a", "b", "b"] });
    expect(s.hero.unspentSkillPoints).toBe(0);
    const weapon = heroSetup(s, data).setup.weapon;
    expect(heroRotation(s, data, weapon).map((r) => r.skill.id)).toEqual(["sword-skill"]);
    s = act(s, { type: "setRotationSkill", slot: 0, skillId: TREE_SKILL.id });
    expect(heroRotation(s, data, weapon)).toEqual([{ skill: TREE_SKILL, level: 2 }]);
    expect(() => act(s, { type: "setRotationSkill", slot: 1, skillId: null })).toThrow(/Slot/);
    expect(() => act(s, { type: "setRotationSkill", slot: 0, skillId: "nope" })).toThrow();
  });

  it("equipping puts the old item into the inventory and respects requirements", () => {
    let s = act(ringed(start()), { type: "setOut", actId: "test-act" }, { type: "startStage" });
    s = act(s, { type: "resolveFight" });
    const rewards = s.run?.rewards ?? fail();
    const index = rewards.items.findIndex((i) => i.baseId === "test-ring");
    const shield = rewards.items.findIndex((i) => i.baseId === "test-shield");
    expect(index).toBeGreaterThanOrEqual(0);
    // The shield needs 8 Strength, the hero has 6.
    expect(equipBlockReason(s, data, rewards.items[shield] ?? fail(), "pick")).toBe("requirements");
    const oldRing = s.hero.equipment.ring1;
    s = act(s, { type: "pickItem", index, mode: "equip" });
    expect(s.hero.equipment.ring1?.id).toBe(rewards.items[index]?.id);
    expect(s.inventory.map((p) => p.item.id)).toEqual([oldRing?.id]);

    // Swap back from the inventory. Salvage is Thoric's (Camp only); on the road you can only
    // throw the other ring away, for nothing.
    s = act(s, { type: "equip", itemId: oldRing?.id ?? "" });
    expect(s.hero.equipment.ring1?.id).toBe(oldRing?.id);
    const other = rewards.items[index]?.id ?? "";
    expect(() => act(s, { type: "salvage", itemId: other })).toThrow(/Camp/);
    const dust = s.wallet.dust;
    const discarded = act(s, { type: "discard", itemId: other });
    expect(discarded.inventory).toHaveLength(0);
    expect(discarded.wallet).toEqual(s.wallet);
    expect(() => act(s, { type: "unequip", slot: "offHand" })).toThrow();

    s = act(s, { type: "retreat" });
    expect(s.run).toBeNull();
    s = act(s, { type: "salvage", itemId: other });
    expect(s.inventory).toHaveLength(0);
    expect(s.wallet.dust).toBeGreaterThan(dust);
  });

  it("drag & drop moves items inside the inventory and onto a chosen slot", () => {
    let s = act(ringed(start()), { type: "setOut", actId: "test-act" }, { type: "startStage" });
    s = act(s, { type: "resolveFight" });
    const rewards = s.run?.rewards ?? fail();
    const index = rewards.items.findIndex((i) => i.baseId === "test-ring");
    const oldWeapon = s.hero.equipment.ring1 ?? fail();
    s = act(s, { type: "pickItem", index, mode: "equip" });
    expect(s.inventory[0]).toMatchObject({ x: 0, y: 0 });
    s = act(s, { type: "placeItem", itemId: oldWeapon.id, at: { x: 3, y: 1 } });
    expect(s.inventory[0]).toMatchObject({ x: 3, y: 1 });
    expect(() => act(s, { type: "placeItem", itemId: oldWeapon.id, at: { x: 99, y: 0 } })).toThrow(
      /room/,
    );
    // An item never fits a slot of another kind.
    expect(equipBlockReason(s, data, oldWeapon, "inventory", "offHand")).toBe("noSlot");
    expect(() => act(s, { type: "equip", itemId: oldWeapon.id, slot: "offHand" })).toThrow();
    s = act(s, { type: "equip", itemId: oldWeapon.id, slot: "ring1" });
    expect(s.hero.equipment.ring1?.id).toBe(oldWeapon.id);
  });

  it("Pity raises the top weights; Elites and Bosses have a rarity floor", () => {
    const base = itemPickWeights("normal", 0, 4);
    const pity = itemPickWeights("normal", 2, 4);
    expect(pity.epic).toBeGreaterThan(base.epic);
    expect(pity.normal).toBe(base.normal);
    expect(itemPickWeights("elite", 0, 4)).toMatchObject({ normal: 0, magic: 0 });
    expect(itemPickWeights("boss", 0, 4)).toMatchObject({ normal: 0, magic: 0, rare: 0 });
  });

  it("the run's loot gate opens rarity over the whole game", () => {
    // Run 1: Normal and Magic from normal enemies, Rare from Elites and the boss, never Epic.
    expect(itemPickWeights("normal", 0, 0)).toMatchObject({ rare: 0, epic: 0 });
    expect(itemPickWeights("normal", 0, 0).magic).toBeGreaterThan(0);
    expect(itemPickWeights("elite", 0, 0)).toMatchObject({ normal: 0, epic: 0 });
    expect(itemPickWeights("elite", 0, 0).rare).toBeGreaterThan(0);
    expect(itemPickWeights("boss", 0, 0)).toMatchObject({ normal: 0, epic: 0 });
    // Run 2: Rare from normal enemies (seldom), still no Epic, not even from the boss.
    expect(itemPickWeights("normal", 0, 1)).toMatchObject({ epic: 0 });
    expect(itemPickWeights("normal", 0, 1).rare).toBeLessThan(PROGRESSION.rarityWeights.rare);
    expect(itemPickWeights("boss", 0, 1)).toMatchObject({ epic: 0 });
    // Run 3: the first Epics, only now and then from the boss.
    expect(itemPickWeights("elite", 0, 2)).toMatchObject({ epic: 0 });
    expect(itemPickWeights("boss", 0, 2).epic).toBeGreaterThan(0);
    // Run 5: Epic from normal enemies; later runs keep the last gate.
    expect(itemPickWeights("normal", 0, 3)).toMatchObject({ epic: 0 });
    expect(itemPickWeights("normal", 0, 4).epic).toBeGreaterThan(0);
    expect(lootGate(20)).toBe(lootGate(PROGRESSION.lootGates.length - 1));
    expect(lootGate(0).legendary).toEqual({ normal: 0, elite: 0, boss: 0 });
    // Pity lifts the highest allowed rarity, never a locked one.
    expect(itemPickWeights("normal", 2, 0).magic).toBeGreaterThan(
      itemPickWeights("normal", 0, 0).magic,
    );
    expect(itemPickWeights("normal", 2, 0)).toMatchObject({ rare: 0, epic: 0 });
  });

  it("bosses drop an Ascension Shard", () => {
    let s = act(start(), { type: "setOut", actId: "test-act" });
    for (let i = 0; i < 2; i++) s = clearStage(s);
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    expect(s.run?.rewards?.ascensionShards).toBe(PROGRESSION.bossAscensionShards);
    expect(s.wallet.ascensionShards).toBe(PROGRESSION.bossAscensionShards);
  });

  it("the Supply Wagon stores items in the Camp, and Equip swaps back into the stash", () => {
    let s = act(ringed(start()), { type: "setOut", actId: "test-act" }, { type: "startStage" });
    s = act(s, { type: "resolveFight" });
    const items = s.run?.rewards?.items ?? fail();
    const index = items.findIndex((i) => i.baseId === "test-ring");
    s = act(s, { type: "pickItem", index, mode: "take" }, { type: "retreat" });
    const loot = items[index] ?? fail();
    expect(moveBlockReason(s, data, loot.id, "stash")).toBeUndefined();
    s = act(s, { type: "moveItem", itemId: loot.id, to: "stash" });
    expect(s.inventory).toHaveLength(0);
    expect(s.stash.map((p) => p.item.id)).toEqual([loot.id]);

    const old = s.hero.equipment.ring1 ?? fail();
    s = act(s, { type: "equip", itemId: loot.id });
    expect(s.hero.equipment.ring1?.id).toBe(loot.id);
    expect(s.stash.map((p) => p.item.id)).toEqual([old.id]);
    s = act(s, { type: "sortStash" }, { type: "moveItem", itemId: old.id, to: "inventory" });
    expect(s.inventory.map((p) => p.item.id)).toEqual([old.id]);

    const inRun = act(s, { type: "setOut", actId: "test-act" });
    expect(moveBlockReason(inRun, data, old.id, "stash")).toBe("camp");
    expect(() => act(inRun, { type: "moveItem", itemId: old.id, to: "stash" })).toThrow();
  });

  it("Respec at Kaelen gives back Skill Points and Ember for Gold", () => {
    let s = start();
    s = {
      ...s,
      hero: { ...s.hero, unspentSkillPoints: 4 },
      wallet: { ...s.wallet, gold: PROGRESSION.respecGold, harvesterEmber: 1 },
      progress: { ...s.progress, trainerUnlocked: true },
    };
    s = act(
      s,
      { type: "learnNodes", nodeIds: ["a", "b", "b", "k"] },
      { type: "setRotationSkill", slot: 0, skillId: TREE_SKILL.id },
    );
    expect(spentInTree(data, s.hero.learned)).toEqual({ skillPoints: 3, harvesterEmber: 1 });
    s = act(s, { type: "respecTree" });
    expect(s.hero.learned).toEqual({});
    expect(s.hero.unspentSkillPoints).toBe(4);
    expect(s.hero.rotation).toEqual([null]);
    expect(s.wallet).toMatchObject({ gold: 0, harvesterEmber: 1 });
    expect(() => act(s, { type: "respecTree" })).toThrow(/Nothing/);
  });

  it("the boss of the newest act starts the Prestige: the world burns, all items stay", () => {
    // The first run has only the first act; its boss brings The Harvest.
    let s = act(start(), { type: "setOut", actId: "test-act" });
    for (let i = 0; i < 2; i++) s = clearStage(s);
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    const loot = s.run?.rewards?.items ?? fail();
    // The Boss Hoard: 2 of 6 cards, one of them at least Rare in run 1.
    expect(loot).toHaveLength(PROGRESSION.bossHoardCards);
    expect(loot.some((item) => item.rarity === "rare")).toBe(true);
    expect(loot.some((item) => item.rarity === "epic")).toBe(false);
    s = act(s, { type: "pickItem", index: 0, mode: "take" });
    expect(s.run?.rewards?.itemPick).toBeNull();
    expect(() => act(s, { type: "pickItem", index: 0, mode: "take" })).toThrow(/taken/);
    s = act(s, { type: "salvageAll" }, { type: "pickSpoils", index: 0 });
    s = act(s, { type: "continue" });
    expect(s.run).toBeNull();
    expect(s.notice).toBeNull();
    expect(s.pendingPrestige).toMatchObject({ actId: "test-act", enemyName: "Boss" });
    expect(() => act(s, { type: "setOut", actId: "test-act" })).toThrow(/harvest/);

    s = { ...s, stash: [{ item: { ...(loot[1] ?? fail()), id: "stashed" }, x: 0, y: 0 }] };
    const { level, attributes, learned, equipment } = s.hero;
    const { inventory, stash, wallet } = s;
    expect(inventory).toHaveLength(1);
    s = act(s, { type: "prestige" });
    expect(s.pendingPrestige).toBeNull();
    expect(s.notice).toMatchObject({ kind: "prestige", enemyName: "Boss" });
    expect(s.hero).toMatchObject({ level, attributes, learned, equipment });
    // The Harvest: two new Attribute Points wait, and a Phoenix Ash.
    expect(s.hero.unspentAttributePoints).toBe(ATTRIBUTE_RULES.creationPoints + 2);
    expect(s.inventory).toEqual(inventory);
    expect(s.stash).toEqual(stash);
    expect(s.wallet).toEqual({
      ...wallet,
      harvesterEmber: wallet.harvesterEmber + PROGRESSION.prestigeHarvesterEmber,
      phoenixAsh: 1,
    });
    expect(s.progress).toMatchObject({
      actsCleared: [],
      trainerUnlocked: true,
      rotationSlots: 2,
      stashBurned: false,
    });
    expect(s.legacy.prestige).toBe(1);
    expect(s.legacy.chronicle).toEqual([
      { generation: 1, title: "Fighter", level, deaths: 0, enemyName: "Boss" },
    ]);
    expect(levelCap(s.legacy.prestige)).toBe(15);

    // The new run's level band starts at the old Level Cap.
    s = act(s, { type: "dismissNotice" });
    expect(moveBlockReason(s, data, "stashed", "inventory")).toBeUndefined();
    s = act(s, { type: "setOut", actId: "test-act" }, { type: "startStage" });
    expect(s.run?.encounter?.level).toBe(levelCap(0));
    expect(actUnlocked(s, data, "deadly-act")).toBe(false);
  });

  it("Prestige rewards grow with the Prestige level", () => {
    expect(prestigeRewards(data, 1)).toEqual({
      prestige: 1,
      rotationSlots: 2,
      planUpgrade: "Rotation Slot 2 · Reaction Slot 1",
      harvesterEmber: 1,
      attributePoints: 2,
      rekindle: 2,
      phoenixAsh: 1,
      levelCap: 15,
      acts: 2,
      levelBand: { start: 5, end: 15 },
    });
    // Never more acts than the game has.
    expect(prestigeRewards(data, 9).acts).toBe(3);
  });

  it("migrates M4 save games (version 2)", () => {
    const s = start(4);
    const v2 = {
      ...s,
      version: 2,
      legacy: undefined,
      pendingPrestige: undefined,
      progress: { ...s.progress, stashBurned: undefined },
    };
    const migrated = deserializeGame(JSON.stringify(v2));
    expect(migrated).toEqual(s);
  });

  it("migrates M3 save games (version 1)", () => {
    const s = clearStage(act(start(3), { type: "setOut", actId: "test-act" }));
    const v1 = {
      ...s,
      version: 1,
      stash: undefined,
      wallet: { ...s.wallet, ascensionShards: undefined },
    };
    const migrated = deserializeGame(JSON.stringify(v1));
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.stash).toEqual([]);
    expect(migrated.wallet.ascensionShards).toBe(0);
    expect(migrated.run).toEqual(s.run);
  });

  it("migrates Seal-era save games (version 7): no Seals, points back above the new cap", () => {
    const s = start(3);
    const v7 = {
      ...s,
      version: 7,
      hero: { ...s.hero, level: 30, learned: { a: 1 }, unspentAttributePoints: 1 },
      wallet: { ...s.wallet, harvesterEmber: 0 },
      merchant: { key: 0, sold: [] },
      legacy: {
        ...s.legacy,
        prestige: 1,
        seals: ["ring1"],
        chronicle: [{ generation: 1, sealed: ["ring1"], level: 20, deaths: 2, enemyName: "Boss" }],
      },
    };
    const migrated = deserializeGame(JSON.stringify(v7), data);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.legacy).not.toHaveProperty("seals");
    expect(migrated).not.toHaveProperty("merchant");
    expect(migrated.legacy.chronicle).toEqual([
      { generation: 1, level: 20, deaths: 2, enemyName: "Boss" },
    ]);
    // Run 2's cap is 15: every point comes back to spend again (attributes: see v10 → v11).
    expect(migrated.hero).toMatchObject({
      level: 15,
      xp: 0,
      attributes: data.startingAttributes,
      unspentAttributePoints: ATTRIBUTE_RULES.creationPoints + ATTRIBUTE_RULES.harvestPoints,
      unspentSkillPoints: PROGRESSION.startSkillPoints + 14 * PROGRESSION.skillPointsPerLevel,
      learned: {},
    });
    expect(migrated.wallet.harvesterEmber).toBe(1);
    // A hero below the cap keeps its Skill Points.
    const low = deserializeGame(JSON.stringify({ ...v7, hero: s.hero }), data);
    expect(low.hero).toEqual({
      ...s.hero,
      unspentAttributePoints: ATTRIBUTE_RULES.creationPoints + ATTRIBUTE_RULES.harvestPoints,
    });
  });

  it("save games round-trip and reject other versions", () => {
    const s = clearStage(act(start(3), { type: "setOut", actId: "test-act" }));
    const json = serializeGame(s);
    expect(deserializeGame(json)).toEqual(s);
    expect(() => deserializeGame(JSON.stringify({ ...s, version: 99 }))).toThrow(/version/);
    expect(() => deserializeGame("null")).toThrow();
  });
});

function fail(): never {
  throw new Error("unexpected");
}

describe("the road through the acts", () => {
  it("each run opens one more act", () => {
    const s = start();
    expect(actUnlocked(s, data, "test-act")).toBe(true);
    expect(
      actUnlocked(
        { ...s, progress: { ...s.progress, actsCleared: ["test-act"] } },
        data,
        "deadly-act",
      ),
    ).toBe(false);
    expect(isHarvestAct(data, "test-act", 0)).toBe(true);
    expect(isHarvestAct(data, "test-act", 1)).toBe(false);
    expect(isHarvestAct(data, "deadly-act", 1)).toBe(true);
    expect(isHarvestAct(data, "final-act", 5)).toBe(true);
  });

  it("the level band rises evenly over all stages of the run", () => {
    expect(levelBand(0)).toEqual({ start: 1, end: 5 });
    expect(levelBand(1)).toEqual({ start: 5, end: 15 });
    expect(levelBand(3)).toEqual({ start: 30, end: 50 });
    // Run 1: one act of 3 stages, 1 → 5.
    expect([1, 2, 3].map((st) => stageMonsterLevel(data, TEST_ACT, st, 0))).toEqual([1, 3, 5]);
    // Run 2: two acts, 6 stages from 5 to 15; the second act carries on where the first ends.
    const second = data.acts[1] ?? fail();
    expect(stageMonsterLevel(data, TEST_ACT, 1, 1)).toBe(5);
    expect(stageMonsterLevel(data, second, 1, 1)).toBe(11);
    expect(stageMonsterLevel(data, second, 3, 1)).toBe(15);
  });

  it("Run Pressure grows along a run with more than one act and toughens its monsters", () => {
    const second = data.acts[1] ?? fail();
    expect(stagePressure(data, TEST_ACT, 3, 0)).toEqual({ life: 1, damage: 1 });
    expect(stagePressure(data, TEST_ACT, 1, 1)).toEqual({ life: 1, damage: 1 });
    expect(stagePressure(data, second, 3, 1)).toEqual({
      life: 1 + PROGRESSION.runPressure.life,
      damage: 1 + PROGRESSION.runPressure.damage,
    });
    const encounter = {
      enemyId: TEST_ACT.enemies[0]?.id ?? fail(),
      level: 5,
      boss: false,
      eliteModifiers: [],
      seed: 1,
    };
    const plain = enemySetup(encounter, TEST_ACT.id, data);
    const pressed = enemySetup(
      { ...encounter, pressure: { life: 2, damage: 1.5 } },
      TEST_ACT.id,
      data,
    );
    expect(pressed.baseLife).toBeCloseTo((plain.baseLife ?? 0) * 2);
    expect(pressed.damageMultiplier).toBeCloseTo((plain.damageMultiplier ?? 1) * 1.5);
  });

  it("opens one act after the other and lets cleared acts be revisited", () => {
    let s = inRun(start(), 2);
    expect(actUnlocked(s, data, "test-act")).toBe(true);
    expect(actUnlocked(s, data, "deadly-act")).toBe(false);
    expect(nextAct(s, data).id).toBe("test-act");
    expect(() => act(s, { type: "setOut", actId: "deadly-act" })).toThrow(/closed/);

    s = act(s, { type: "setOut", actId: "test-act" });
    while (s.run) s = clearStage(s);
    expect(s.notice).toMatchObject({ kind: "actCleared" });
    expect(actUnlocked(s, data, "deadly-act")).toBe(true);
    expect(actUnlocked(s, data, "final-act")).toBe(false);
    expect(nextAct(s, data).id).toBe("deadly-act");
    // Revisit Act: the cleared act stays open.
    expect(act(s, { type: "setOut", actId: "test-act" }).run?.actId).toBe("test-act");
  });

  it("the journey leads to the newest act of the run", () => {
    expect(nextAct(unlocked(start()), data).id).toBe("final-act");
  });
});

describe("Boss trophies and the Trophy Wall", () => {
  it("a boss sometimes drops its own trophy, which goes up on the Trophy Wall once", () => {
    let hits = 0;
    let bosses = 0;
    for (let seed = 1; seed <= 80; seed++) {
      // Boss trophies drop from run 4 on; a strong Heir survives its monster levels.
      const fresh = start(seed);
      const a = fresh.hero.attributes;
      const strong = {
        ...a,
        strength: a.strength + 60,
        vitality: a.vitality + 120,
        dexterity: a.dexterity + 30,
      };
      let s = act(
        {
          ...fresh,
          hero: { ...fresh.hero, level: 45, attributes: strong },
          legacy: { ...fresh.legacy, prestige: 3 },
        },
        { type: "setOut", actId: "test-act" },
      );
      for (let i = 0; i < 2; i++) s = clearStage(s);
      s = act(s, { type: "startStage" }, { type: "resolveFight" });
      const rewards = s.run?.rewards;
      if (!rewards) continue;
      bosses++;
      if (!rewards.items.some((it) => it.uniqueId === "boss-trophy")) continue;
      hits++;
      expect(rewards.newTrophies).toContain("boss-trophy");
      expect(s.legacy.trophies).toContain("boss-trophy");
    }
    expect(bosses).toBeGreaterThan(40);
    // About 10 % of boss kills.
    expect(hits).toBeGreaterThan(0);
    expect(hits).toBeLessThan(bosses * 0.3);
  });

  it("normal Unique drops and gambles never give a boss trophy", () => {
    expect(uniquesFor(data.items, 50).map((u) => u.id)).not.toContain("boss-trophy");
    expect(bossTrophies(data.items, "test-act").map((u) => u.id)).toEqual(["boss-trophy"]);
  });

  it("v6 save games start the Trophy Wall with the Uniques the hero carries", () => {
    const s = start();
    const ring = { ...OLD_RING, id: "u", uniqueId: "band" };
    const v6 = {
      ...s,
      version: 6,
      hero: { ...s.hero, equipment: { ...s.hero.equipment, ring1: ring } },
      legacy: { ...s.legacy, trophies: undefined },
    };
    expect(deserializeGame(JSON.stringify(v6)).legacy.trophies).toEqual(["band"]);
  });
});

describe("Runes in the run", () => {
  it("Runes drop by rank: bosses always, lower ranks far more often", () => {
    const counts: Record<string, number> = {};
    for (let seed = 1; seed <= 300; seed++) {
      const boss = rollRuneDrops(data, "boss", 1, new Rng(seed));
      expect(boss.length).toBeGreaterThanOrEqual(1);
      for (const id of boss) counts[id] = (counts[id] ?? 0) + 1;
    }
    expect(Object.keys(counts).sort()).toEqual(["ash", "moss", "thorn"]);
    expect(counts.ash ?? 0).toBeGreaterThan(counts.moss ?? 0);
    expect(counts.moss ?? 0).toBeGreaterThan(counts.thorn ?? 0);
    // Act Tier 1 allows up to rank 3; the pool is capped there.
    expect(maxRuneRank(1)).toBe(3);
    expect(rollRuneDrops(data, "normal", 1, new Rng(1)).length).toBeLessThanOrEqual(1);
  });

  it("the top Rune ranks never drop from normal enemies", () => {
    for (let seed = 1; seed <= 200; seed++) {
      expect(rollRuneDrops(data, "normal", 9, new Rng(seed)).every((id) => id === "ash")).toBe(
        true,
      );
    }
  });

  it("dropped Runes go into the pouch and are remembered as found", () => {
    let s = act(start(3), { type: "setOut", actId: "test-act" });
    for (let i = 0; i < 3 && s.run; i++) s = clearStage(s);
    const found = s.legacy.runesFound;
    const pouch = Object.values(s.wallet.runes).reduce((a, b) => a + b, 0);
    // The boss drops at least one Rune.
    expect(pouch).toBeGreaterThanOrEqual(1);
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(addRunes({ ash: 1 }, ["ash", "moss"])).toEqual({ ash: 2, moss: 1 });
  });

  it("Nyssa joins after the first trip into her act, even a deadly one", () => {
    let s = act(unlocked(start()), { type: "setOut", actId: "deadly-act" });
    expect(s.progress.runesmithUnlocked).toBe(false);
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    expect(s.run).toBeNull();
    expect(s.progress.runesmithUnlocked).toBe(true);
  });

  it("v3 save games get an empty pouch and Codex", () => {
    const v3 = JSON.parse(serializeGame(start())) as Record<string, unknown>;
    const wallet = { ...(v3.wallet as object) } as Record<string, unknown>;
    delete wallet.runes;
    const old = { ...v3, version: 3, wallet, merchant: undefined };
    const s = deserializeGame(JSON.stringify(old));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.wallet.runes).toEqual({});
    expect(s.legacy.runewords).toEqual([]);
    expect(s.progress.runesmithUnlocked).toBe(false);
  });
});

describe("Ember Thief", () => {
  const THIEF = { ...WEAK_ENEMY, id: "ember-thief", name: "Ember Thief" };
  const atStage = (data: GameData, seed: number): GameState => {
    const s = newGame(data, { seed, classId: "test-fighter" });
    return {
      ...s,
      run: {
        actId: "final-act",
        stage: 1,
        lifeFraction: 1,
        phase: "intermission",
        encounter: null,
        rewards: null,
      },
    };
  };
  /** First seed whose Stage 1 rolls the Thief. */
  const thiefSeed = (data: GameData) => {
    for (let seed = 1; seed < 2000; seed++) {
      const s = applyAction(atStage(data, seed), data, { type: "startStage" });
      if (s.run?.encounter?.thief) return seed;
    }
    throw new Error("No Thief in 2000 seeds");
  };

  it("shows up on normal stages from Act 2 on, about 3 % of the time", () => {
    const data = { ...TEST_GAME_DATA, thief: THIEF };
    let thieves = 0;
    for (let seed = 1; seed <= 2000; seed++) {
      const s = applyAction(atStage(data, seed), data, { type: "startStage" });
      if (s.run?.encounter?.thief) thieves++;
    }
    expect(thieves / 2000).toBeGreaterThan(0.015);
    expect(thieves / 2000).toBeLessThan(0.05);
    // Never in Act 1, never without Thief data.
    const act1 = (seed: number) =>
      applyAction(
        {
          ...atStage(data, seed),
          run: { ...(atStage(data, seed).run ?? fail()), actId: "test-act" },
        },
        data,
        { type: "startStage" },
      );
    for (let seed = 1; seed <= 300; seed++)
      expect(act1(seed).run?.encounter?.thief).toBeUndefined();
  });

  it("caught: a small Hoard of 4 cards, take 2, one at least Rare", () => {
    const data = { ...TEST_GAME_DATA, thief: THIEF };
    const seed = thiefSeed(data);
    let s = applyAction(atStage(data, seed), data, { type: "startStage" });
    expect(enemySetup(s.run?.encounter ?? fail(), "final-act", data).fleeAfter).toBe(
      PROGRESSION.thiefFleeSeconds,
    );
    s = applyAction(s, data, { type: "resolveFight" });
    const rewards = s.run?.rewards ?? fail();
    expect(rewards.thief).toBe("caught");
    expect(rewards.items).toHaveLength(PROGRESSION.thiefCards);
    expect(rewards.picks).toBe(PROGRESSION.thiefPicks);
    expect(rewards.items.some((it) => ["rare", "epic", "legendary"].includes(it.rarity))).toBe(
      true,
    );
  });

  it("escaped: the stage still counts, with the normal three cards", () => {
    const tough = { ...THIEF, baseLife: 1_000_000 };
    const data = { ...TEST_GAME_DATA, thief: tough };
    const seed = thiefSeed(data);
    let s = applyAction(atStage(data, seed), data, { type: "startStage" });
    s = applyAction(s, data, { type: "resolveFight" });
    expect(s.run?.phase).toBe("rewards");
    expect(s.run?.rewards?.thief).toBe("escaped");
    expect(s.run?.rewards?.items).toHaveLength(PROGRESSION.itemChoices);
    expect(s.stats.deaths).toBe(0);
  });
});
