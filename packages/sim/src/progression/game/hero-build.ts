import { mergeRules } from "../../combat/rules";
import { sumBonuses } from "../../combat/stats";
import {
  type Capstone,
  type CombatantSetup,
  type ReactionSlot,
  type RotationSlot,
  type SkillDefinition,
  type WeaponDefinition,
} from "../../combat/types";
import { type ResolvedEquipment } from "../../items/equipment";
import { getBase } from "../../items/generate";
import {
  battlePlanUnlocks,
  capstoneSpec,
  REACTION_COOLDOWN,
  reactionCondition,
  reactionConditionAllowed,
  slotCondition,
  slotModifiers,
} from "../battle-plan";
import { activeBoons, boonEffects } from "../boons";
import { classTitle, getClass, LINEAGE_STEPS, lineageEffect, type HeroClass } from "../classes";
import { buildHeroSetup } from "../hero";
import { tripOmenEffects } from "./omens";
import { webRuneEffects } from "./web-runes";
import { keystoneRules, treeBonuses, treeSkills, treeTriggers } from "../skill-tree";
import {
  buildMasteryWeapon,
  pointsAvailable,
  weaponRank,
  weaponTitle,
  type EchoDefinition,
  type MasteryBuild,
  type WeaponMasteryTree,
} from "../weapon-mastery";
import { emberPenalty } from "./acts";
import { activeDraught } from "./flask";
import { fail, type GameData, type GameState } from "./state";

/** The hero as the fight sees it: weapon, Mastery, known skills, Battle Plan, Boons, title. */

/** The weapon type's base values (damage, speed, Innate) from the item catalog. */
export function weaponBase(data: GameData, weaponId: string): WeaponDefinition {
  return getBase(data.items, weaponId).weapon ?? fail(`"${weaponId}" is not a weapon`);
}

export function masteryTree(data: GameData, weaponId: string): WeaponMasteryTree {
  return data.weaponMastery[weaponId] ?? fail(`No Weapon Mastery for "${weaponId}"`);
}

/** The hero's Weapon Rank: it follows the level (one Mastery point per Rank), capped per run. */
export const heroWeaponRank = (state: GameState) =>
  weaponRank(state.hero.level, state.legacy.prestige);

/** The worn Echo and its stage, if any. */
export function wornEcho(
  state: GameState,
  data: GameData,
): { readonly def: EchoDefinition; readonly stage: number } | undefined {
  const id = state.hero.mastery.echo;
  const def = id ? data.echoes.find((e) => e.id === id) : undefined;
  const stage = id ? (state.legacy.echoes[id]?.stage ?? 0) : 0;
  return def && stage > 0 ? { def, stage } : undefined;
}

/** The hero's weapon as Weapon Mastery builds it (Rank, nodes, Forms, Keystone, Echo). */
export function heroWeapon(state: GameState, data: GameData): MasteryBuild {
  const { weaponId, mastery } = state.hero;
  const base = weaponBase(data, weaponId);
  return buildMasteryWeapon(
    base,
    masteryTree(data, weaponId),
    mastery,
    heroWeaponRank(state),
    data.startSkills[base.id],
    wornEcho(state, data),
    state.hero.level,
  );
}

/** The weapon's name: grade + Keystone form + "of" Echo ("Tempered Parrying Blade of ..."). */
export function heroWeaponName(state: GameState, data: GameData): string {
  const { weaponId, mastery } = state.hero;
  return weaponTitle(
    weaponBase(data, weaponId),
    masteryTree(data, weaponId),
    mastery,
    heroWeaponRank(state),
    wornEcho(state, data)?.def,
  );
}

/** Weapon Mastery points not spent yet. */
export function masteryPointsLeft(state: GameState, data: GameData): number {
  const tree = masteryTree(data, state.hero.weaponId);
  return pointsAvailable(tree, state.hero.mastery, heroWeaponRank(state));
}

export interface KnownSkill {
  readonly skill: SkillDefinition;
  /** Node ranks, +1 for the Start Skill of the weapon in hand. */
  readonly level: number;
  readonly startSkill: boolean;
}

/** Skills the hero can put into the Battle Plan with a given weapon. */
export function knownSkills(
  state: GameState,
  data: GameData,
  weapon: WeaponDefinition,
): KnownSkill[] {
  // The Innate after Innate Form and Attunement; tree ranks still count for the weapon's own.
  const own = data.startSkills[weapon.id];
  const start = heroWeapon(state, data).innate ?? own;
  const fromTree = treeSkills(data.skillTree, state.hero.learned);
  const result: KnownSkill[] = [];
  if (start) {
    const ranks =
      fromTree.find((t) => t.skill.id === start.id || t.skill.id === own?.id)?.ranks ?? 0;
    result.push({ skill: start, level: 1 + ranks, startSkill: true });
  }
  for (const { skill, ranks } of fromTree) {
    if (skill.id !== start?.id && skill.id !== own?.id) {
      result.push({ skill, level: ranks, startSkill: false });
    }
  }
  return result;
}

/** The Rotation Slots the hero fights with, with the unlocked Battle Plan choices. */
export function heroRotation(
  state: GameState,
  data: GameData,
  weapon: WeaponDefinition,
): RotationSlot[] {
  return heroRotationSlots(state, data, weapon).map((s) => s.slot);
}

/** Like `heroRotation`, but each slot remembers its Battle Plan index (Echo, Modifiers). */
function heroRotationSlots(
  state: GameState,
  data: GameData,
  weapon: WeaponDefinition,
): { readonly slot: RotationSlot; readonly index: number }[] {
  const known = knownSkills(state, data, weapon);
  const start = known.find((k) => k.startSkill);
  const unlocks = battlePlanUnlocks(state.legacy.prestige);
  const { plan } = state.hero;
  const slots: { slot: RotationSlot; index: number }[] = [];
  // Silenced Ember: the first Rotation Slot stays empty on this trip.
  const silenced = tripOmenEffects(state, data).lockFirstSlot;
  state.hero.rotation.slice(0, state.progress.rotationSlots).forEach((id, index) => {
    if (silenced && index === 0) return;
    const entry = id === null ? start : known.find((k) => k.skill.id === id);
    if (!entry || slots.some((s) => s.slot.skill.id === entry.skill.id)) return;
    const threshold = unlocks.thresholds ? plan.thresholds[index] : null;
    const modifiers = slotModifiers(plan.modifiers, index, unlocks);
    const condition = unlocks.conditions ? slotCondition(plan.conditions[index]) : undefined;
    slots.push({
      index,
      slot: {
        skill: entry.skill,
        level: entry.level,
        ...(threshold != null ? { threshold } : {}),
        ...(modifiers.length ? { modifiers } : {}),
        ...(condition ? { condition } : {}),
      },
    });
  });
  if (slots.length === 0 && start && !silenced) {
    slots.push({ index: 0, slot: { skill: start.skill, level: start.level } });
  }
  return slots;
}

/** The hero's Reaction Slots (Battle Plan, from the 4th Prestige on). */
export function heroReactions(
  state: GameState,
  data: GameData,
  weapon: WeaponDefinition,
): ReactionSlot[] {
  const unlocks = battlePlanUnlocks(state.legacy.prestige);
  const known = knownSkills(state, data, weapon);
  const { plan } = state.hero;
  const result: ReactionSlot[] = [];
  plan.reactions.slice(0, unlocks.reactionSlots).forEach((r, index) => {
    if (!r) return;
    const entry = known.find((k) => k.skill.id === r.skillId);
    const condition = reactionConditionAllowed(r.conditionId, unlocks)
      ? reactionCondition(r.conditionId)
      : undefined;
    if (!entry || !condition) return;
    const modifiers = slotModifiers(plan.reactionModifiers, index, unlocks);
    result.push({
      skill: entry.skill,
      level: entry.level,
      condition,
      cooldown: REACTION_COOLDOWN,
      ...(modifiers.length ? { modifiers } : {}),
    });
  });
  return result;
}

/** The Opening Move (Battle Plan, 8th Prestige): a known skill cast for free at fight start. */
function heroOpeningMove(
  state: GameState,
  data: GameData,
  weapon: WeaponDefinition,
): CombatantSetup["openingMove"] {
  const id = state.hero.plan.openingMove;
  if (!id || !battlePlanUnlocks(state.legacy.prestige).openingMove) return undefined;
  const entry = knownSkills(state, data, weapon).find((k) => k.skill.id === id);
  return entry ? { skill: entry.skill, level: entry.level } : undefined;
}

/** The Capstone the hero fights with; Echo points at the slot's index in the fight rotation. */
function heroCapstone(
  state: GameState,
  data: GameData,
  weapon: WeaponDefinition,
): Capstone | undefined {
  if (!battlePlanUnlocks(state.legacy.prestige).capstone) return undefined;
  const spec = capstoneSpec(state.hero.plan);
  if (spec?.kind !== "echo") return spec;
  const slot = heroRotationSlots(state, data, weapon).findIndex((s) => s.index === spec.slot);
  return slot >= 0 ? { kind: "echo", slot } : undefined;
}

/** The Stolen Fire Boons in effect (rank and grade resolved). */
export function heroBoons(state: GameState, data: GameData) {
  return activeBoons(state.boons, data.boons ?? []);
}

/** Boon families open in an act: Hearth and every Warden family up to this act. */
export function openBoonFamilies(data: GameData, actNumber: number): string[] {
  const tied = new Set(data.acts.flatMap((a) => (a.boonFamily ? [a.boonFamily] : [])));
  return (data.boonFamilies ?? [])
    .map((f) => f.id)
    .filter(
      (id) => !tied.has(id) || data.acts.some((a) => a.boonFamily === id && a.number <= actNumber),
    );
}

/** The character's class. */
export function heroClassOf(state: GameState, data: GameData): HeroClass {
  return getClass(data.classes, state.hero.classId);
}

/**
 * The character's title: class name, then the main Prestige branch decides (klassen-v2.md). A
 * full Lineage (five finale wins on the account) puts "Emberheir" in front.
 */
export function heroTitle(state: GameState, data: GameData): string {
  const title = classTitle(heroClassOf(state, data), state.legacy.branches, data.branchEpithets);
  return (state.lineage ?? 0) >= LINEAGE_STEPS ? `Emberheir ${title}` : title;
}

/** The hero's fight setup from the current state. */
export function heroSetup(
  state: GameState,
  data: GameData,
): { readonly setup: CombatantSetup; readonly gear: ResolvedEquipment } {
  const { hero } = state;
  const boons = boonEffects(heroBoons(state, data));
  const heroClass = heroClassOf(state, data);
  const trait = heroClass.trait;
  const lineage = lineageEffect(heroClass.lineage, state.lineage ?? 0);
  const mastery = heroWeapon(state, data);
  const draught = activeDraught(state, data);
  const sockets = webRuneEffects(hero, data);
  const omens = tripOmenEffects(state, data);
  const built = buildHeroSetup(
    {
      level: hero.level,
      attributes: hero.attributes,
      boonAttributes: boons.attributes,
      equipment: hero.equipment,
      weapon: mastery.weapon,
      weaponRules: mastery.weaponRules,
      rotation: (weapon) => heroRotation(state, data, weapon),
      reactions: (weapon) => heroReactions(state, data, weapon),
      capstone: (weapon) => heroCapstone(state, data, weapon),
      openingMove: (weapon) => heroOpeningMove(state, data, weapon),
      bonuses: (weapon) =>
        sumBonuses(
          treeBonuses(data.skillTree, hero.learned, weapon.range),
          boons.bonuses,
          trait.bonuses,
          lineage.bonuses,
          mastery.bonuses,
          draught?.bonuses,
          sockets.bonuses,
          omens.hero.bonuses,
        ),
      triggers: (weapon) => [
        ...treeTriggers(data.skillTree, hero.learned, weapon.range),
        ...boons.triggers,
        ...mastery.triggers,
        ...omens.hero.triggers,
      ],
      rules: mergeRules(
        keystoneRules(data.skillTree, hero.learned),
        boons.rules,
        trait.rules,
        lineage.rules,
        mastery.rules,
        draught?.rules,
        sockets.rules,
        omens.hero.rules,
      ),
      ...(state.run ? { lifeFraction: state.run.lifeFraction } : {}),
      resistancePenalty: emberPenalty(state),
    },
    data.items,
  );
  // Short Fuse: a fight that lasts too long is lost.
  return omens.fightSeconds !== undefined
    ? { ...built, setup: { ...built.setup, timeLimit: omens.fightSeconds } }
    : built;
}
