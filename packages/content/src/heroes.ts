import type { Attributes, CombatantSetup, SkillDefinition, WeaponDefinition } from "@emberheir/sim";
import { START_SKILLS } from "./skills";

/** Level 1 Heir before any points are spent. */
export const STARTING_ATTRIBUTES: Attributes = {
  strength: 6,
  dexterity: 6,
  agility: 6,
  intelligence: 6,
  wisdom: 6,
  vitality: 6,
};

export interface HeroLoadout {
  readonly weapon: WeaponDefinition;
  /** Rotation Slots in order. Defaults to the weapon's Start Skill. */
  readonly skills?: readonly SkillDefinition[];
  /** Trigger Threshold per slot (undefined = Heat Cost). */
  readonly thresholds?: readonly (number | undefined)[];
  readonly level?: number;
  readonly attributes?: Attributes;
}

/** Builds the hero's fight setup from a weapon and a Battle Plan. */
export function createHeroSetup(loadout: HeroLoadout): CombatantSetup {
  const startSkill = START_SKILLS[loadout.weapon.id];
  const skills = loadout.skills ?? (startSkill ? [startSkill] : []);
  return {
    name: "Heir",
    level: loadout.level ?? 1,
    attributes: loadout.attributes ?? STARTING_ATTRIBUTES,
    weapon: loadout.weapon,
    rotation: skills.map((skill, i) => {
      const threshold = loadout.thresholds?.[i];
      return threshold === undefined ? { skill } : { skill, threshold };
    }),
  };
}
