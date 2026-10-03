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
  const s = newGame(data, { seed: 1, starterWeapon: "test-sword" });
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
  it("unlocks one upgrade per Prestige", () => {
    expect(battlePlanUnlocks(0)).toEqual({
      rotationSlots: 1,
      thresholds: false,
      reactionSlots: 0,
      modifiers: 0,
      conditions: false,
      capstone: false,
    });
    expect(battlePlanUnlocks(4)).toMatchObject({ rotationSlots: 3, reactionSlots: 1 });
    expect(battlePlanUnlocks(10)).toEqual({
      rotationSlots: 4,
      thresholds: true,
      reactionSlots: 2,
      modifiers: 2,
      conditions: true,
      capstone: true,
    });
  });

  it("refuses choices the hero has not unlocked yet", () => {
    const s = hero(1);
    expect(() => act(s, plan({ thresholds: [60] }))).toThrow(/Threshold/);
    expect(() => act(s, plan({ modifiers: [["thrifty"]] }))).toThrow(/Modifier/);
    expect(() =>
      act(s, plan({ reactions: [{ skillId: TREE_SKILL.id, conditionId: "life-50" }] })),
    ).toThrow(/locked/);
    expect(() => act(s, plan({ capstone: { id: "vigil", slot: 0 } }))).toThrow(/locked/);
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
      hero(7),
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
