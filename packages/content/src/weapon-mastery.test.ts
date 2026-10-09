import { describe, expect, it } from "vitest";
import {
  EMPTY_MASTERY,
  MASTERY,
  type MasteryState,
  applyAction,
  buildMasteryWeapon,
  createEnemySetup,
  getBase,
  heroSetup,
  heroWeaponName,
  newGame,
  runFight,
} from "@emberheir/sim";
import { ACT1_ENEMIES } from "./enemies";
import { GAME_DATA } from "./game";
import { ITEM_CATALOG } from "./items";
import { START_SKILLS } from "./skills";
import { ECHOES, WEAPON_MASTERY } from "./weapon-mastery";

const WEAPON_IDS = [...new Set(GAME_DATA.classes.flatMap((c) => c.weapons))];

describe("Weapon Mastery content", () => {
  it("every class weapon has a tree with the shared ground plan", () => {
    for (const id of WEAPON_IDS) {
      const tree = WEAPON_MASTERY[id];
      expect(tree, id).toBeDefined();
      if (!tree) continue;
      const count = (kind: string) => tree.nodes.filter((n) => n.kind === kind).length;
      expect(count("refine"), id).toBe(4);
      expect(count("heatForm"), id).toBe(4);
      expect(count("innateForm"), id).toBe(3);
      expect(count("minor"), id).toBe(18);
      expect(count("notable"), id).toBe(6);
      expect(count("keystone"), id).toBe(4);
      expect(tree.paths).toHaveLength(3);
      expect(new Set(tree.nodes.map((n) => n.id)).size, id).toBe(tree.nodes.length);
      // Refine 11 points + Heat Form + Innate Form + 24 path nodes + Keystone = 38.
      const refine = tree.nodes
        .filter((n) => n.kind === "refine")
        .reduce((sum, n) => sum + (n.maxRanks ?? 1), 0);
      expect(refine).toBe(11);
      for (const n of tree.nodes) {
        for (const l of n.links ?? [])
          expect(
            tree.nodes.some((m) => m.id === l),
            l,
          ).toBe(true);
        expect(Number.isFinite(n.x) && Number.isFinite(n.y), n.id).toBe(true);
        if (n.kind === "keystone") expect(n.form, n.id).toBeTruthy();
      }
    }
  });

  it("every Innate Form, Keystone and Heat Form fights without breaking the rules", () => {
    for (const id of WEAPON_IDS) {
      const tree = WEAPON_MASTERY[id];
      const base = getBase(ITEM_CATALOG, id).weapon;
      if (!tree || !base) throw new Error(id);
      const groups = tree.nodes.filter((n) => n.group && !n.default);
      for (const node of groups) {
        const state: MasteryState = {
          ...EMPTY_MASTERY,
          choices: { [node.group as string]: node.id },
        };
        const build = buildMasteryWeapon(base, tree, state, 12, START_SKILLS[base.id]);
        const enemy = ACT1_ENEMIES[0];
        if (!enemy || !build.innate) throw new Error(id);
        const hero = {
          name: "Heir",
          level: 10,
          attributes: GAME_DATA.startingAttributes,
          weapon: build.weapon,
          rotation: [{ skill: build.innate }],
          bonuses: build.bonuses,
          triggers: build.triggers,
          rules: build.rules,
          weaponRules: build.weaponRules,
        };
        const result = runFight(hero, createEnemySetup(enemy, 10), 3);
        expect(result.duration, `${id} ${node.id}`).toBeGreaterThan(0);
        expect(Number.isFinite(result.final.enemy.life), `${id} ${node.id}`).toBe(true);
      }
    }
  });

  it("all paths can be learned in a real game, and the name follows the Keystone and Echo", () => {
    let s = newGame(GAME_DATA, { seed: 2, classId: "warrior" });
    s = { ...s, hero: { ...s.hero, level: 100 }, legacy: { ...s.legacy, prestige: 6 } };
    const tree = WEAPON_MASTERY.sword;
    if (!tree) throw new Error("sword");
    const learn = (nodeId: string) => {
      s = applyAction(s, GAME_DATA, { type: "learnMastery", nodeId });
    };
    for (const id of ["precision", "precision", "steady-hand", "full-swing"]) learn(id);
    for (const n of tree.nodes.filter((n) => n.path === "riposte")) learn(n.id);
    learn("perfect-parry");
    expect(heroWeaponName(s, GAME_DATA)).toBe("Exalted Parrying Blade");
    s = {
      ...s,
      legacy: { ...s.legacy, echoes: { "ashfall-wrath": { stage: 3, prestige: 2 } } },
    };
    s = applyAction(s, GAME_DATA, { type: "setEcho", echoId: "ashfall-wrath" });
    expect(heroWeaponName(s, GAME_DATA)).toBe("Exalted Parrying Blade of Ashfall Wrath");
    const { setup } = heroSetup(s, GAME_DATA);
    expect(setup.triggers?.some((t) => t.id === "echo-ashfall-wrath")).toBe(true);
    expect(setup.weaponRules?.extraAttacksPrecise).toBe(true);
    expect(setup.weapon.precision).toBeCloseTo(0.85);
  });

  it("Echoes belong to the seven act bosses and grow with their stage", () => {
    const acts = new Set(GAME_DATA.acts.map((a) => a.id));
    expect(ECHOES).toHaveLength(7);
    for (const e of ECHOES) {
      expect(acts.has(e.actId), e.id).toBe(true);
      expect(e.description(MASTERY.maxEchoStage)).not.toBe(e.description(1));
    }
  });

  it("Wand Attunement turns Spark and Firebolt into Cold", () => {
    let s = newGame(GAME_DATA, { seed: 2, classId: "sorcerer" });
    s = applyAction(s, GAME_DATA, { type: "learnMastery", nodeId: "attune-cold" });
    const { setup } = heroSetup(s, GAME_DATA);
    expect(setup.weapon.damageType).toBe("cold");
    expect(setup.rotation[0]?.skill.name).toBe("Frostbolt");
  });
});
