import { describe, expect, it } from "vitest";
import { PROGRESSION } from "./constants";
import {
  type BattlePlanState,
  EMPTY_PLAN,
  REACTION_COOLDOWN,
  battlePlanUnlocks,
} from "./battle-plan";
import {
  type GameAction,
  type GameState,
  applyAction,
  deserializeGame,
  heroSetup,
  newGame,
} from "./game";
import { TEST_GAME_DATA, TREE_SKILL } from "./test-fixtures";

const data = TEST_GAME_DATA;
const act = (state: GameState, ...actions: GameAction[]) =>
  actions.reduce((s, a) => applyAction(s, data, a), state);

/** A hero after `prestige` Prestiges with the Rotation Slots it gives and Bash learned. */
function hero(prestige: number): GameState {
  const s = newGame(data, { seed: 1, classId: "test-fighter" });
  const unlocked: GameState = {
    ...s,
    hero: { ...s.hero, unspentSkillPoints: 3 },
    wallet: { ...s.wallet, gold: 500 },
    progress: {
      ...s.progress,
      trainerUnlocked: true,
      rotationSlots: battlePlanUnlocks(prestige).rotationSlots,
    },
    legacy: { ...s.legacy, prestige },
  };
  return act(unlocked, { type: "learnNodes", nodeIds: ["a", "b"] });
}

const plan = (patch: Partial<BattlePlanState>): GameAction => ({
  type: "setBattlePlan",
  plan: { ...EMPTY_PLAN, ...patch },
});

describe("Battle Plan", () => {
  it("run 1 is a tutorial, all slots stand by Prestige 5, later Prestiges add depth", () => {
    expect(battlePlanUnlocks(0)).toEqual({
      rotationSlots: 1,
      thresholds: false,
      reactionSlots: 0,
      reactionConditions: false,
      modifiers: 0,
      conditions: false,
      openingMove: false,
      rareModifiers: false,
      capstone: false,
    });
    expect(battlePlanUnlocks(1)).toMatchObject({ rotationSlots: 2, reactionSlots: 1 });
    expect(battlePlanUnlocks(4)).toMatchObject({
      rotationSlots: 3,
      reactionSlots: 2,
      reactionConditions: true,
      modifiers: 1,
    });
    expect(battlePlanUnlocks(5)).toMatchObject({ rotationSlots: 4, reactionSlots: 2 });
    expect(battlePlanUnlocks(10)).toEqual({
      rotationSlots: 4,
      thresholds: true,
      reactionSlots: 2,
      reactionConditions: true,
      modifiers: 2,
      conditions: true,
      openingMove: true,
      rareModifiers: true,
      capstone: true,
    });
  });

  it("refuses choices the hero has not unlocked yet", () => {
    const s = hero(1);
    expect(() => act(s, plan({ thresholds: [60] }))).toThrow(/Threshold/);
    expect(() => act(s, plan({ modifiers: [["thrifty"]] }))).toThrow(/Modifier/);
    expect(() =>
      act(s, plan({ reactions: [null, { skillId: TREE_SKILL.id, conditionId: "life-50" }] })),
    ).toThrow(/locked/);
    expect(() =>
      act(s, plan({ reactions: [{ skillId: TREE_SKILL.id, conditionId: "enemy-heals" }] })),
    ).toThrow(/locked/);
    expect(() => act(s, plan({ capstone: { id: "vigil", slot: 0 } }))).toThrow(/locked/);
    expect(() => act(s, plan({ openingMove: TREE_SKILL.id }))).toThrow(/locked/);
    expect(() => act(hero(3), plan({ modifiers: [["reverb"]] }))).toThrow(/locked/);
    expect(() => act(hero(0), plan({ reactions: [] }))).not.toThrow();
  });

  it("the Battle Plan can change between stages, but not mid-fight", () => {
    let s = act(hero(1), { type: "setOut", actId: "test-act" });
    s = act(s, { type: "setRotationSkill", slot: 1, skillId: TREE_SKILL.id });
    s = act(s, plan({ reactions: [{ skillId: TREE_SKILL.id, conditionId: "fight-start" }] }));
    expect(heroSetup(s, data).setup.reactions).toHaveLength(1);
    s = act(s, { type: "startStage" });
    expect(() => act(s, plan({}))).toThrow(/fight/);
    expect(() => act(s, { type: "learnNodes", nodeIds: ["a"] })).toThrow(/Camp/);
  });

  it("the Opening Move is cast for free when the fight starts", () => {
    const s = act(hero(8), plan({ openingMove: TREE_SKILL.id }));
    expect(heroSetup(s, data).setup.openingMove).toEqual({ skill: TREE_SKILL, level: 1 });
  });

  it("locked choices in older save games are ignored", () => {
    const s = hero(1);
    const old: GameState = {
      ...s,
      hero: {
        ...s.hero,
        plan: {
          ...EMPTY_PLAN,
          modifiers: [["reverb"]],
          reactions: [{ skillId: TREE_SKILL.id, conditionId: "ailmented" }],
        },
      },
    };
    const setup = heroSetup(old, data).setup;
    expect(setup.rotation[0]?.modifiers).toBeUndefined();
    expect(setup.reactions).toBeUndefined();
  });

  it("v6 save games get the Rotation Slots of the faster ladder", () => {
    const s = hero(2);
    const v6 = { ...s, version: 6, progress: { ...s.progress, rotationSlots: 2 } };
    expect(deserializeGame(JSON.stringify(v6)).progress.rotationSlots).toBe(3);
  });

  it("puts Thresholds, Modifiers and Conditions on the Rotation Slots", () => {
    let s = act(hero(9), { type: "setRotationSkill", slot: 1, skillId: TREE_SKILL.id });
    s = act(
      s,
      plan({
        thresholds: [null, 80],
        modifiers: [["thrifty", "reverb"], ["empowered"]],
        conditions: [null, "enemy-burn"],
      }),
    );
    const { rotation } = heroSetup(s, data).setup;
    expect(rotation[0]).toMatchObject({
      skill: { id: "sword-skill" },
      modifiers: ["thrifty", "reverb"],
    });
    expect(rotation[0]?.threshold).toBeUndefined();
    expect(rotation[1]).toMatchObject({
      skill: TREE_SKILL,
      threshold: 80,
      modifiers: ["empowered"],
      condition: { kind: "enemyHas", ailment: "burn" },
    });
    expect(() => act(s, plan({ modifiers: [["thrifty", "thrifty"]] }))).toThrow();
    expect(() => act(s, plan({ conditions: ["nope"] }))).toThrow(/Condition/);
  });

  it("fills Reaction Slots with known skills", () => {
    const s = act(
      hero(4),
      plan({ reactions: [null, { skillId: TREE_SKILL.id, conditionId: "life-30" }] }),
    );
    expect(heroSetup(s, data).setup.reactions).toEqual([
      {
        skill: TREE_SKILL,
        level: 1,
        condition: { kind: "lifeBelow", fraction: 0.3 },
        cooldown: REACTION_COOLDOWN,
      },
    ]);
    expect(() =>
      act(s, plan({ reactions: [{ skillId: "nope", conditionId: "life-30" }] })),
    ).toThrow(/skill/);
  });

  it("the first Capstone is free, switching costs Gold, Echo follows its slot", () => {
    let s = act(hero(10), { type: "setRotationSkill", slot: 2, skillId: TREE_SKILL.id });
    s = act(s, plan({ capstone: { id: "echo", slot: 2 } }));
    expect(s.wallet.gold).toBe(500);
    // Slot 0 and 1 hold the Start Skill once (no duplicates), so slot 2 is the second fight slot.
    expect(heroSetup(s, data).setup.capstone).toEqual({ kind: "echo", slot: 1 });
    s = act(s, plan({ capstone: { id: "crescendo", slot: 0 } }));
    expect(s.wallet.gold).toBe(500 - PROGRESSION.capstoneChangeGold);
    expect(heroSetup(s, data).setup.capstone).toEqual({ kind: "crescendo" });
    expect(() => act(s, plan({}))).toThrow(/removed/);
  });

  it("v5 save games get an empty Battle Plan", () => {
    const s = hero(0);
    const v5 = { ...s, version: 5, hero: { ...s.hero, plan: undefined } };
    expect(deserializeGame(JSON.stringify(v5))).toEqual(s);
  });
});
