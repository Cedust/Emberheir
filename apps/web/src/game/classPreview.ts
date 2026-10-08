import { ACT1, ACT2, GAME_DATA } from "@emberheir/content";
import {
  type Attributes,
  type CombatantSetup,
  type Equipment,
  type GameState,
  type LearnedNodes,
  Rng,
  basesForSlot,
  createEnemySetup,
  heroSetup,
  heroTitle,
  type Item,
  applyAction,
  itemSlotFor,
  missingRequirements,
  newGame,
  rollItem,
} from "@emberheir/sim";
import type { EnemyLook, HeroLook } from "./battle/ArenaScene";
import { heroLookOf } from "./heroLook";
import { heroWeaponLook } from "./weaponLook";

/**
 * The class select preview (klassen-v2.md section 6): the class fights an Act 1 enemy with its
 * start kit, or, as a Glimpse, a late build of its first recommended path against the Rotwood
 * Warden. Built from the real sim, so it plays exactly like the game. Fixed seeds: always the
 * same picture.
 */
export interface ClassPreview {
  readonly hero: CombatantSetup;
  readonly enemy: CombatantSetup;
  readonly heroLook: HeroLook;
  readonly enemyLook: EnemyLook;
  /** The title the Glimpse build carries. */
  readonly title: string;
}

/** Hero level of the Glimpse build. */
export const GLIMPSE_LEVEL = 30;
const GLIMPSE_PRESTIGE = 3;

export function startPreview(classId: string, weapon: string): ClassPreview {
  const state = newGame(GAME_DATA, { seed: 7, classId, weapon });
  const enemy = ACT1.enemies[0] ?? ACT1.boss;
  return {
    hero: heroSetup(state, GAME_DATA).setup,
    enemy: createEnemySetup(enemy, 1),
    heroLook: heroLookOf(
      classId,
      state.hero.weaponId,
      state.hero.equipment,
      undefined,
      heroWeaponLook(state),
    ),
    enemyLook: { archetype: enemy.archetype, boss: false, elite: false, act: 1 },
    title: GAME_DATA.classes.find((c) => c.id === classId)?.name ?? "",
  };
}

/** The Glimpse: a finished build on the class's first recommended path. */
export function glimpseState(classId: string, weapon: string): GameState {
  const heroClass = GAME_DATA.classes.find((c) => c.id === classId);
  const branchId = heroClass?.branches[0];
  const tree = GAME_DATA.skillTree;
  const branch = tree.prestigeBranches?.find((b) => b.id === branchId);
  const base = newGame(GAME_DATA, { seed: 11, classId, weapon });
  // The base branch and Core, plus the Prestige branch up to tier II, all at full rank.
  const learned: Record<string, number> = {};
  for (const node of tree.nodes) {
    const own = node.prestigeBranch
      ? node.prestigeBranch === branchId && (node.tier ?? 1) <= 2
      : node.branch === "core" || node.branch === branch?.branch;
    const keystone = node.kind === "keystone";
    if (own && (!keystone || node.prestigeBranch)) learned[node.id] = node.maxRanks ?? 1;
  }
  const attributes = Object.fromEntries(
    Object.entries(heroClass?.startingAttributes ?? base.hero.attributes).map(([k, v]) => [
      k,
      v * 3,
    ]),
  ) as unknown as Attributes;
  const gear = glimpseGear(base, attributes, heroClass?.offHand);
  const branches = branchId ? [branchId, branchId] : [];
  const draft: GameState = {
    ...base,
    hero: {
      ...base.hero,
      level: GLIMPSE_LEVEL,
      attributes,
      learned: learned as LearnedNodes,
      equipment: gear,
    },
    progress: { ...base.progress, rotationSlots: 4, trainerUnlocked: true },
    legacy: { ...base.legacy, prestige: GLIMPSE_PRESTIGE, branches },
  };
  // Rotation: the Innate, then the newest skills the build knows (Prestige skill first).
  const setup = heroSetup(draft, GAME_DATA).setup;
  const skills = tree.nodes
    .filter((n) => n.skill && (learned[n.id] ?? 0) > 0)
    .sort((a, b) => Number(!!b.prestigeBranch) - Number(!!a.prestigeBranch))
    .map((n) => n.skill?.id ?? "")
    .filter((id) => id && id !== setup.rotation[0]?.skill.id)
    .slice(0, 3);
  return glimpseMastery({ ...draft, hero: { ...draft.hero, rotation: [null, ...skills] } });
}

/** Weapon Mastery of the Glimpse (Rank 10): Refine, then the weapon's first path. */
function glimpseMastery(state: GameState): GameState {
  const tree = GAME_DATA.weaponMastery[state.hero.weaponId];
  const firstPath = tree?.paths[0]?.id;
  const order = [
    "precision",
    "precision",
    "precision",
    "steady-hand",
    "steady-hand",
    "steady-hand",
    ...(tree?.nodes.filter((n) => n.path === firstPath).map((n) => n.id) ?? []),
  ];
  let s = state;
  for (const nodeId of order) {
    try {
      s = applyAction(s, GAME_DATA, { type: "learnMastery", nodeId });
    } catch {
      break;
    }
  }
  return s;
}

/** Rare gear on every slot that the Glimpse attributes can wear. */
function glimpseGear(
  base: GameState,
  attributes: Attributes,
  offHand: string | undefined,
): Equipment {
  const rng = new Rng(23);
  const equipment: Record<string, Item> = {};
  for (const slot of GAME_DATA.equipmentSlots) {
    const candidates =
      slot === "offHand"
        ? offHand
          ? [offHand]
          : []
        : basesForSlot(GAME_DATA.items, itemSlotFor(slot)).map((b) => b.id);
    for (const baseId of candidates) {
      const item = rollItem(
        GAME_DATA.items,
        { baseId, itemLevel: GLIMPSE_LEVEL, rarity: "rare" },
        rng,
      );
      if (missingRequirements(item, GAME_DATA.items, attributes).length === 0) {
        equipment[slot] = item;
        break;
      }
    }
  }
  return { ...base.hero.equipment, ...equipment };
}

export function glimpsePreview(classId: string, weapon: string): ClassPreview {
  const state = glimpseState(classId, weapon);
  const enemy = ACT2.boss;
  return {
    hero: heroSetup(state, GAME_DATA).setup,
    enemy: createEnemySetup(enemy, GLIMPSE_LEVEL - 4),
    heroLook: heroLookOf(
      classId,
      state.hero.weaponId,
      state.hero.equipment,
      undefined,
      heroWeaponLook(state),
    ),
    enemyLook: { archetype: enemy.archetype, boss: true, elite: false, act: 2 },
    title: heroTitle(state, GAME_DATA),
  };
}
