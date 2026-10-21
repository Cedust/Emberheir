import { ATTRIBUTES, type Attribute } from "../../combat/types";
import { rollItem } from "../../items/generate";
import { Rng } from "../../rng";
import {
  addAttributes,
  attributeFloor,
  ATTRIBUTE_RULES,
  lineagePoints,
  attributeProblem,
  sumAttributes,
  type AttributePoints,
} from "../attributes";
import { battlePlanUnlocks, EMPTY_PLAN } from "../battle-plan";
import { EMPTY_BOONS } from "../boons";
import { EMPTY_CODEX } from "../codex";
import { PROGRESSION } from "../constants";
import { startingNodes } from "../skill-tree";
import { EMPTY_MASTERY } from "../weapon-mastery";
import { fail, mixSeed, SAVE_VERSION, type GameData, type GameState } from "./state";

/** A new character (Character Select). */

export interface NewGameOptions {
  readonly seed: number;
  readonly classId: string;
  /** One of the class's weapons; default its first. Fixed for the character. */
  readonly weapon?: string;
  readonly name?: string;
  /**
   * The free points of the creation (attribute-v1.md section 5), on top of the Class Array. Left
   * out, they wait as unspent points.
   */
  readonly attributes?: AttributePoints;
  /**
   * Lineage (phase 5): the main attributes of the classes that won the finale on this account
   * and that the player kept switched on. +1 each, on top of the Class Array.
   */
  readonly lineage?: readonly Attribute[];
}

export function newGame(data: GameData, options: NewGameOptions): GameState {
  const heroClass = data.classes.find((c) => c.id === options.classId);
  if (!heroClass) return fail(`Unknown class "${options.classId}"`);
  const weaponId = options.weapon ?? heroClass.weapons[0] ?? fail("Class without a weapon");
  if (!heroClass.weapons.includes(weaponId)) {
    fail(`"${weaponId}" is not a start weapon of the ${heroClass.name}`);
  }
  const seed = options.seed >>> 0;
  const rng = new Rng(mixSeed(seed, 0xfffff));
  const offHandId = heroClass.offHandFor?.[weaponId] ?? heroClass.offHand;
  const offHand = offHandId
    ? rollItem(data.items, { baseId: offHandId, itemLevel: 1, rarity: "normal" }, rng)
    : undefined;
  const lineage = options.lineage?.length ? lineagePoints(options.lineage) : undefined;
  const floor = attributeFloor(heroClass.startingAttributes, lineage);
  const free = options.attributes ?? {};
  if (ATTRIBUTES.some((k) => (free[k] ?? 0) < 0)) fail("Points must be positive");
  const attributes = addAttributes(floor, free);
  const problem = attributeProblem(attributes, {
    floor,
    current: floor,
    points: ATTRIBUTE_RULES.creationPoints,
    max: ATTRIBUTE_RULES.creationMax + (lineage ? 1 : 0),
  });
  if (
    lineage &&
    ATTRIBUTES.some((k) => attributes[k] > ATTRIBUTE_RULES.creationMax + (lineage[k] ?? 0))
  ) {
    fail(`At most ${ATTRIBUTE_RULES.creationMax} points`);
  }
  if (problem) fail(problem);
  return {
    version: SAVE_VERSION,
    seed,
    nonce: 0,
    hero: {
      name: options.name?.trim() || heroClass.name,
      classId: heroClass.id,
      level: 1,
      xp: 0,
      attributes,
      unspentAttributePoints: ATTRIBUTE_RULES.creationPoints - sumAttributes(free),
      ...(lineage ? { lineage } : {}),
      unspentSkillPoints: PROGRESSION.startSkillPoints,
      learned: startingNodes(data.skillTree, heroClass.id),
      weaponId,
      mastery: EMPTY_MASTERY,
      equipment: offHand ? { offHand } : {},
      rotation: [null],
      plan: EMPTY_PLAN,
    },
    wallet: {
      acorns: 0,
      ash: 0,
      emberCoal: 0,
      phoenixFeathers: 0,
      runes: {},
    },
    inventory: [],
    stash: [],
    flaskCharges: PROGRESSION.flaskStartCharges,
    progress: {
      actsCleared: [],
      deathsInAct: 0,
      trainerUnlocked: false,
      rotationSlots: battlePlanUnlocks(0).rotationSlots,
      runesmithUnlocked: false,
      waymarks: [],
    },
    run: null,
    notice: null,
    stats: { fights: 0, wins: 0, deaths: 0, retreats: 0, bossKills: 0 },
    legacy: {
      prestige: 0,
      chronicle: [],
      runewords: [],
      runesFound: [],
      codex: EMPTY_CODEX,
      branches: [],
      trophies: [],
      echoes: {},
    },
    pendingPrestige: null,
    boons: EMPTY_BOONS,
  };
}
