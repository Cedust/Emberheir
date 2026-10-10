import { mergeRules } from "../combat/rules";
import { sumBonuses } from "../combat/stats";
import {
  type Attributes,
  type Capstone,
  type CombatRules,
  type CombatantSetup,
  type ReactionSlot,
  type RotationSlot,
  type StatBonuses,
  type TriggerSpec,
  type WeaponDefinition,
  type WeaponRules,
} from "../combat/types";
import { type AttributePoints, combatAttributes, heroPerks } from "./attributes";
import { type ResolvedEquipment, resolveEquipment } from "../items/equipment";
import type { Equipment, ItemCatalog } from "../items/types";

export interface HeroBuildOptions {
  readonly level: number;
  /** The hero's own attributes (start values + spent points), without gear. */
  readonly attributes: Attributes;
  /** Attributes from Blaze Boons: they count for Breakpoints, unlike gear. */
  readonly boonAttributes?: AttributePoints;
  readonly equipment: Equipment;
  /** The hero's own weapon (Weapon Mastery); gear never brings one. */
  readonly weapon: WeaponDefinition;
  /** Weapon Mastery rules (Glancing Blows, Sunder, Keystones ...). */
  readonly weaponRules?: WeaponRules;
  /** Rotation Slots for the weapon in use (Start Skills depend on the weapon). */
  readonly rotation: (weapon: WeaponDefinition) => readonly RotationSlot[];
  readonly reactions?: (weapon: WeaponDefinition) => readonly ReactionSlot[];
  readonly capstone?: (weapon: WeaponDefinition) => Capstone | undefined;
  readonly openingMove?: (weapon: WeaponDefinition) => CombatantSetup["openingMove"];
  /** Extra bonuses, e.g. from the Skill Tree, by weapon range. */
  readonly bonuses?: (weapon: WeaponDefinition) => StatBonuses;
  /** Extra triggers, e.g. from Prestige branch nodes. */
  readonly triggers?: (weapon: WeaponDefinition) => readonly TriggerSpec[];
  readonly rules?: CombatRules;
  readonly lifeFraction?: number;
}

/** Builds the hero's fight setup from attributes, gear, Skill Tree bonuses and the Battle Plan. */
export function buildHeroSetup(
  options: HeroBuildOptions,
  catalog: ItemCatalog,
): { readonly setup: CombatantSetup; readonly gear: ResolvedEquipment } {
  const gear = resolveEquipment(options.equipment, catalog, options.attributes, options.weapon);
  const { weapon } = options;
  const boon = options.boonAttributes ?? {};
  const attributes = combatAttributes(options.attributes, boon, gear.attributes);
  const perks = heroPerks(options.attributes, boon);
  const reactions = options.reactions?.(weapon) ?? [];
  const triggers = [...gear.triggers, ...(options.triggers?.(weapon) ?? [])];
  const capstone = options.capstone?.(weapon);
  const openingMove = options.openingMove?.(weapon);
  const setup: CombatantSetup = {
    name: "Heir",
    level: options.level,
    attributes,
    attributeScale: "heir",
    ...(perks.length ? { perks } : {}),
    weapon,
    rotation: options.rotation(weapon),
    ...(reactions.length ? { reactions } : {}),
    ...(capstone ? { capstone } : {}),
    ...(openingMove ? { openingMove } : {}),
    bonuses: sumBonuses(gear.bonuses, options.bonuses?.(weapon)),
    // Heat from enemy hits comes only from the Skill Tree (Timo, after Playtest 2).
    baseHeatFromHitsTaken: 0,
    ...(triggers.length ? { triggers } : {}),
    ...(options.rules || gear.rules ? { rules: mergeRules(options.rules, gear.rules) } : {}),
    ...(options.weaponRules && Object.keys(options.weaponRules).length
      ? { weaponRules: options.weaponRules }
      : {}),
    ...(options.lifeFraction !== undefined ? { lifeFraction: options.lifeFraction } : {}),
  };
  return { setup, gear };
}
