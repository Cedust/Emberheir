import {
  type Attributes,
  type CombatantSetup,
  type Equipment,
  type ResolvedEquipment,
  type SkillDefinition,
  type WeaponDefinition,
  ATTRIBUTES,
  resolveEquipment,
} from "@emberheir/sim";
import { ITEM_CATALOG } from "./items";
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
  /** Weapon when no (active) main-hand item is equipped. */
  readonly weapon?: WeaponDefinition;
  /** Equipped items. An active main-hand item replaces `weapon`. */
  readonly equipment?: Equipment;
  /** Rotation Slots in order. Defaults to the weapon's Start Skill. */
  readonly skills?: readonly SkillDefinition[];
  /** Trigger Threshold per slot (undefined = Heat Cost). */
  readonly thresholds?: readonly (number | undefined)[];
  readonly level?: number;
  /** The hero's own attributes (points), without gear. */
  readonly attributes?: Attributes;
}

/** What the equipped gear does for a loadout (also tells which items are inactive). */
export function resolveHeroGear(loadout: HeroLoadout): ResolvedEquipment {
  return resolveEquipment(
    loadout.equipment ?? {},
    ITEM_CATALOG,
    loadout.attributes ?? STARTING_ATTRIBUTES,
    loadout.weapon,
  );
}

/** Builds the hero's fight setup from gear and a Battle Plan. */
export function createHeroSetup(loadout: HeroLoadout): CombatantSetup {
  const gear = resolveHeroGear(loadout);
  const weapon = gear.weapon ?? loadout.weapon;
  if (!weapon) throw new Error("The hero needs a weapon or an active main-hand item");
  const own = loadout.attributes ?? STARTING_ATTRIBUTES;
  const attributes = Object.fromEntries(
    ATTRIBUTES.map((a) => [a, own[a] + gear.attributes[a]]),
  ) as Record<keyof Attributes, number>;

  const startSkill = START_SKILLS[weapon.id];
  const skills = loadout.skills ?? (startSkill ? [startSkill] : []);
  return {
    name: "Heir",
    level: loadout.level ?? 1,
    attributes,
    weapon,
    rotation: skills.map((skill, i) => {
      const threshold = loadout.thresholds?.[i];
      return threshold === undefined ? { skill } : { skill, threshold };
    }),
    bonuses: gear.bonuses,
    ...(gear.triggers.length ? { triggers: gear.triggers } : {}),
  };
}
