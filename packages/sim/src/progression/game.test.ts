import { describe, expect, it } from "vitest";
import { PROGRESSION } from "./constants";
import {
  type GameAction,
  type GameState,
  GameActionError,
  applyAction,
  currentFight,
  deserializeGame,
  equipBlockReason,
  heroRotation,
  heroSetup,
  itemPickWeights,
  levelCap,
  moveBlockReason,
  prestigeRewards,
  sealsAvailable,
  newGame,
  SAVE_VERSION,
  spentInTree,
  rewardsDone,
  serializeGame,
} from "./game";
import { TEST_GAME_DATA, TREE_SKILL } from "./test-fixtures";

const data = TEST_GAME_DATA;
const start = (seed = 1) => newGame(data, { seed, starterWeapon: "test-sword" });
const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);

/** Plays one stage: fight, take nothing (Salvage All), skip spoils, continue. */
function clearStage(state: GameState): GameState {
  let s = act(state, { type: "startStage" }, { type: "resolveFight" });
  s = act(s, { type: "salvageAll" });
  if (s.run?.rewards?.spoils.length) s = act(s, { type: "pickSpoils", index: 0 });
  return act(s, { type: "continue" });
}

describe("game loop", () => {
  it("starts in the Camp with a Normal starter weapon and the Start Skill", () => {
    const state = start();
    expect(state.run).toBeNull();
    expect(state.hero.equipment.mainHand).toMatchObject({ baseId: "test-sword", rarity: "normal" });
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
    let s = act(start(), { type: "setOut", actId: "test-act" });
    s = { ...s, progress: { ...s.progress, deathsInAct: 3 } };
    for (let i = 0; i < 2; i++) s = clearStage(s);
    s = act(s, { type: "startStage" });
    expect(s.run?.encounter).toMatchObject({ enemyId: "boss", boss: true, level: 2 });
    s = act(s, { type: "resolveFight" });
    expect(s.run?.rewards?.reforgeStones).toBeGreaterThanOrEqual(PROGRESSION.bossReforgeStones[0]);
    expect(s.run?.rewards?.items.every((i) => i.rarity === "epic")).toBe(true);
    s = act(s, { type: "salvageAll" }, { type: "pickSpoils", index: 0 }, { type: "continue" });
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
    let s = act(start(), { type: "setOut", actId: "deadly-act" });
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    expect(s.run).toBeNull();
    expect(s.notice).toMatchObject({ kind: "death", stage: 1, enemyName: "Killer" });
    expect(s.progress.deathsInAct).toBe(1);
    expect(s.stats.deaths).toBe(1);
    expect(s.hero.equipment.mainHand).toBeDefined();
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

  it("level-ups give Attribute and Skill Points; attributes are spent between fights", () => {
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
    expect(s.hero.unspentAttributePoints).toBe(PROGRESSION.attributePointsPerLevel);
    expect(s.hero.unspentSkillPoints).toBe(PROGRESSION.skillPointsPerLevel);
    s = act(s, { type: "allocateAttributes", points: { strength: 2, vitality: 1 } });
    expect(s.hero.attributes.strength).toBe(8);
    expect(s.hero.unspentAttributePoints).toBe(0);
    expect(() => act(s, { type: "allocateAttributes", points: { strength: 1 } })).toThrow();
  });

  it("the Skill Tree and Battle Plan are only at Kaelen, after the act boss", () => {
    let s = { ...start(), hero: { ...start().hero, unspentSkillPoints: 3 } };
    expect(() => act(s, { type: "learnNodes", nodeIds: ["a"] })).toThrow(/Kaelen/);
    s = { ...s, progress: { ...s.progress, trainerUnlocked: true } };
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
    let s = act(start(), { type: "setOut", actId: "test-act" }, { type: "startStage" });
    s = act(s, { type: "resolveFight" });
    const rewards = s.run?.rewards ?? fail();
    const index = rewards.items.findIndex((i) => i.baseId === "test-sword");
    const shield = rewards.items.findIndex((i) => i.baseId === "test-shield");
    expect(index).toBeGreaterThanOrEqual(0);
    // The shield needs 8 Strength, the hero has 6.
    expect(equipBlockReason(s, data, rewards.items[shield] ?? fail(), "pick")).toBe("requirements");
    const oldWeapon = s.hero.equipment.mainHand;
    s = act(s, { type: "pickItem", index, mode: "equip" });
    expect(s.hero.equipment.mainHand?.id).toBe(rewards.items[index]?.id);
    expect(s.inventory.map((p) => p.item.id)).toEqual([oldWeapon?.id]);

    // Swap back from the inventory, then salvage the other sword.
    s = act(s, { type: "equip", itemId: oldWeapon?.id ?? "" });
    expect(s.hero.equipment.mainHand?.id).toBe(oldWeapon?.id);
    const dust = s.wallet.dust;
    s = act(s, { type: "salvage", itemId: rewards.items[index]?.id ?? "" });
    expect(s.inventory).toHaveLength(0);
    expect(s.wallet.dust).toBeGreaterThan(dust);
    expect(() => act(s, { type: "unequip", slot: "mainHand" })).toThrow(/mainHand/);
  });

  it("Pity raises Rare and Epic weights; Elites and Bosses have a rarity floor", () => {
    const base = itemPickWeights("normal", 0);
    const pity = itemPickWeights("normal", 2);
    expect(pity.epic).toBeGreaterThan(base.epic);
    expect(pity.normal).toBe(base.normal);
    expect(itemPickWeights("elite", 0)).toMatchObject({ normal: 0, magic: 0 });
    expect(itemPickWeights("boss", 0)).toMatchObject({ normal: 0, magic: 0, rare: 0 });
  });

  it("bosses drop an Ascension Shard", () => {
    let s = act(start(), { type: "setOut", actId: "test-act" });
    for (let i = 0; i < 2; i++) s = clearStage(s);
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    expect(s.run?.rewards?.ascensionShards).toBe(PROGRESSION.bossAscensionShards);
    expect(s.wallet.ascensionShards).toBe(PROGRESSION.bossAscensionShards);
  });

  it("the Supply Wagon stores items in the Camp, and Equip swaps back into the stash", () => {
    let s = act(start(), { type: "setOut", actId: "test-act" }, { type: "startStage" });
    s = act(s, { type: "resolveFight" });
    const items = s.run?.rewards?.items ?? fail();
    const index = items.findIndex((i) => i.baseId === "test-sword");
    s = act(s, { type: "pickItem", index, mode: "take" }, { type: "retreat" });
    const loot = items[index] ?? fail();
    expect(moveBlockReason(s, data, loot.id, "stash")).toBeUndefined();
    s = act(s, { type: "moveItem", itemId: loot.id, to: "stash" });
    expect(s.inventory).toHaveLength(0);
    expect(s.stash.map((p) => p.item.id)).toEqual([loot.id]);

    const old = s.hero.equipment.mainHand ?? fail();
    s = act(s, { type: "equip", itemId: loot.id });
    expect(s.hero.equipment.mainHand?.id).toBe(loot.id);
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

  it("the final boss starts the Prestige: Seals keep their items, the rest burns", () => {
    let s = act(start(), { type: "setOut", actId: "final-act" });
    for (let i = 0; i < 2; i++) s = clearStage(s);
    s = act(s, { type: "startStage" }, { type: "resolveFight" });
    const loot = s.run?.rewards?.items ?? fail();
    s = act(s, { type: "pickItem", index: 0, mode: "take" }, { type: "pickSpoils", index: 0 });
    s = act(s, { type: "continue" });
    expect(s.run).toBeNull();
    expect(s.notice).toBeNull();
    expect(s.pendingPrestige).toMatchObject({ actId: "final-act", enemyName: "Boss" });
    expect(() => act(s, { type: "setOut", actId: "test-act" })).toThrow(/harvest/);
    expect(sealsAvailable(s, data)).toBe(1);

    // An equipped Ring to seal; the inventory holds the picked item.
    const ring = { ...(loot[0] ?? fail()), id: "sealed-ring", baseId: "test-ring" };
    s = { ...s, hero: { ...s.hero, equipment: { ...s.hero.equipment, ring1: ring } } };
    const oldWeapon = s.hero.equipment.mainHand ?? fail();
    const { level, attributes, learned } = s.hero;
    expect(s.inventory).toHaveLength(1);
    expect(() => act(s, { type: "prestige", sealedSlots: ["ring1", "mainHand"] })).toThrow(/Seals/);
    expect(() => act(s, { type: "prestige", sealedSlots: ["helm"] })).toThrow(/slot/);

    s = act(s, { type: "prestige", sealedSlots: ["ring1"] });
    expect(s.pendingPrestige).toBeNull();
    expect(s.notice).toMatchObject({ kind: "prestige", enemyName: "Boss" });
    expect(s.hero.equipment.ring1?.id).toBe("sealed-ring");
    // The unsealed weapon burned; the Heir picks up a plain one of the same kind.
    expect(s.hero.equipment.mainHand).toMatchObject({ baseId: oldWeapon.baseId, rarity: "normal" });
    expect(s.hero.equipment.mainHand?.id).not.toBe(oldWeapon.id);
    expect(s.hero).toMatchObject({ level, attributes, learned });
    expect(s.inventory).toEqual([]);
    expect(s.stash).toEqual([]);
    expect(s.wallet).toEqual({
      gold: 0,
      dust: PROGRESSION.prestigeDustPerLevel,
      reforgeStones: 0,
      essences: {},
      harvesterEmber: PROGRESSION.prestigeHarvesterEmber,
      ascensionShards: 0,
    });
    expect(s.progress).toMatchObject({
      actsCleared: [],
      trainerUnlocked: true,
      rotationSlots: 2,
      stashBurned: true,
    });
    expect(s.legacy).toMatchObject({ prestige: 1, seals: ["ring1"] });
    expect(s.legacy.chronicle).toEqual([
      { generation: 1, sealed: ["ring1"], level, deaths: 0, enemyName: "Boss" },
    ]);
    expect(sealsAvailable(s, data)).toBe(2);
    expect(levelCap(s.legacy.prestige)).toBe(
      PROGRESSION.levelCap + PROGRESSION.levelCapPerPrestige,
    );

    // The Supply Wagon is burned until the first return to Camp.
    s = act(s, { type: "dismissNotice" });
    expect(moveBlockReason(s, data, "x", "stash")).toBe("burned");
    s = act(s, { type: "setOut", actId: "test-act" }, { type: "startStage" });
    // Monster Levels rise with every Prestige.
    expect(s.run?.encounter?.level).toBe(1 + PROGRESSION.monsterLevelsPerPrestige);
    s = act(s, { type: "retreat" });
    expect(s.progress.stashBurned).toBe(false);
  });

  it("Prestige rewards grow with the Prestige level", () => {
    expect(prestigeRewards(data, 1)).toEqual({
      prestige: 1,
      seals: 1,
      rotationSlots: 2,
      harvesterEmber: 1,
      dust: PROGRESSION.prestigeDustPerLevel,
      levelCap: 20,
      monsterLevelBonus: PROGRESSION.monsterLevelsPerPrestige,
    });
    // Never more Seals than slots.
    expect(prestigeRewards(data, 9).seals).toBe(data.equipmentSlots.length);
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
