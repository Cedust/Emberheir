import { mergeRules } from "../combat/rules";
import { sumBonuses } from "../combat/stats";
import {
  ATTRIBUTES,
  type Attribute,
  type Attributes,
  type CombatRules,
  type CombatantSetup,
  type RotationSlot,
  type StatBonuses,
  type WeaponDefinition,
} from "../combat/types";
import { type ResolvedEquipment, resolveEquipment } from "../items/equipment";
import type { Equipment, ItemCatalog } from "../items/types";

export interface HeroBuildOptions {
  readonly level: number;
  /** The hero's own attributes (start values + spent points), without gear. */
  readonly attributes: Attributes;
  readonly equipment: Equipment;
  /** Weapon when no active main-hand item is equipped. */
  readonly fallbackWeapon?: WeaponDefinition | undefined;
  /** Rotation Slots for the weapon in use (Start Skills depend on the weapon). */
  readonly rotation: (weapon: WeaponDefinition) => readonly RotationSlot[];
  /** Extra bonuses, e.g. from the Skill Tree, by weapon range. */
  readonly bonuses?: (weapon: WeaponDefinition) => StatBonuses;
  readonly rules?: CombatRules;
  readonly lifeFraction?: number;
}

/** Builds the hero's fight setup from attributes, gear, Skill Tree bonuses and the Battle Plan. */
export function buildHeroSetup(
  options: HeroBuildOptions,
  catalog: ItemCatalog,
): { readonly setup: CombatantSetup; readonly gear: ResolvedEquipment } {
  const gear = resolveEquipment(
    options.equipment,
    catalog,
    options.attributes,
    options.fallbackWeapon,
  );
  const weapon = gear.weapon ?? options.fallbackWeapon;
  if (!weapon) throw new Error("The hero needs a weapon or an active main-hand item");
  const attributes = Object.fromEntries(
    ATTRIBUTES.map((a) => [a, options.attributes[a] + gear.attributes[a]]),
  ) as Record<Attribute, number>;
  const setup: CombatantSetup = {
    name: "Heir",
    level: options.level,
    attributes,
    weapon,
    rotation: options.rotation(weapon),
    bonuses: sumBonuses(gear.bonuses, options.bonuses?.(weapon)),
    ...(gear.triggers.length ? { triggers: gear.triggers } : {}),
    ...(options.rules || gear.rules ? { rules: mergeRules(options.rules, gear.rules) } : {}),
    ...(options.lifeFraction !== undefined ? { lifeFraction: options.lifeFraction } : {}),
  };
  return { setup, gear };
}
