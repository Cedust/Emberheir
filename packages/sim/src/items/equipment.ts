import { mergeRules } from "../combat/rules";
import { sumBonuses } from "../combat/stats";
import {
  ATTRIBUTES,
  type Attribute,
  type Attributes,
  type CombatRules,
  type StatBonuses,
  type TriggerSpec,
  type WeaponDefinition,
} from "../combat/types";
import { isPercentStat, resolveTrigger, statAffixValue, tierGrowth } from "./affixes";
import { rollTier } from "./codex";
import { ITEMS } from "./constants";
import { getBase } from "./generate";
import { activeRuneword, runeBonuses } from "./runes";
import {
  EQUIPMENT_SLOTS,
  type AffixStat,
  type Equipment,
  type EquipmentSlot,
  type Item,
  type ItemBaseDefinition,
  type ItemCatalog,
  type ItemSlot,
} from "./types";

const isAttribute = (stat: AffixStat): stat is Attribute =>
  (ATTRIBUTES as readonly string[]).includes(stat);

/** Attribute Requirements of a base at a tier (each grows by ITEMS.requirementPerTier). */
export function requirementsFor(base: ItemBaseDefinition, tier: number): Partial<Attributes> {
  const result: Partial<Record<Attribute, number>> = {};
  for (const attribute of ATTRIBUTES) {
    const value = base.requirements?.[attribute];
    if (value) result[attribute] = value + ITEMS.requirementPerTier * (Math.max(1, tier) - 1);
  }
  return result;
}

/**
 * Attributes whose requirement the hero does not meet. Only the hero's own attributes count,
 * not attribute bonuses from other items (keeps gear order irrelevant).
 */
export function missingRequirements(
  item: Item,
  catalog: ItemCatalog,
  attributes: Attributes,
): Attribute[] {
  const required = requirementsFor(getBase(catalog, item.baseId), item.tier);
  return ATTRIBUTES.filter((a) => (required[a] ?? 0) > attributes[a]);
}

/** Base values at a tier: flat values grow with the tier, percentages do not. */
export function scaledBaseStats(base: ItemBaseDefinition, tier: number): StatBonuses {
  const growth = tierGrowth(ITEMS.baseScalePerTier, tier);
  const result: Partial<Record<keyof StatBonuses, number>> = {};
  for (const [key, value] of Object.entries(base.baseStats ?? {}) as [
    keyof StatBonuses,
    number,
  ][]) {
    result[key] = isPercentStat(key) ? value : Math.round(value * growth);
  }
  return result;
}

/** The weapon of a main-hand item: tier-scaled damage plus local Added Weapon Damage. */
export function itemWeapon(item: Item, catalog: ItemCatalog): WeaponDefinition | undefined {
  const base = getBase(catalog, item.baseId);
  if (!base.weapon) return undefined;
  const growth = tierGrowth(ITEMS.baseScalePerTier, item.tier);
  let added = 0;
  for (const roll of item.affixes) {
    const affix = catalog.affixes.get(roll.affixId);
    if (affix?.kind === "stat" && affix.stat === "addedWeaponDamage") {
      added += statAffixValue(affix, item.tier, roll.quality, item.rarity);
    }
  }
  const { min, max } = addedDamageRange(added);
  return {
    ...base.weapon,
    spellPower: growth,
    damage: {
      min: Math.round(base.weapon.damage.min * growth) + min,
      max: Math.round(base.weapon.damage.max * growth) + max,
    },
  };
}

/** "+N Added Weapon Damage" adds N/2 (rounded) to min and N to max damage. */
export function addedDamageRange(value: number): { min: number; max: number } {
  return { min: Math.round(value / 2), max: value };
}

export interface ItemModifiers {
  readonly attributes: Partial<Attributes>;
  readonly bonuses: StatBonuses;
  readonly triggers: readonly TriggerSpec[];
  /** Rules from a Legendary Power or a Runeword. */
  readonly rules?: CombatRules;
}

/**
 * Everything an item adds to the hero apart from its weapon: base values, implicit, stat affixes
 * and trigger affixes. Weapon implicits are part of the weapon and not repeated here.
 */
export function itemModifiers(item: Item, catalog: ItemCatalog): ItemModifiers {
  const base = getBase(catalog, item.baseId);
  const attributes: Partial<Record<Attribute, number>> = {};
  const bonuses: Partial<Record<keyof StatBonuses, number>> = {};
  const triggers: TriggerSpec[] = [];

  const word = activeRuneword(item, catalog);
  const power = item.powerId ? catalog.powers.get(item.powerId) : undefined;
  const rolls = [
    ...item.affixes,
    ...(word?.triggers ?? []),
    ...(power?.trigger ? [power.trigger] : []),
  ];
  for (const a of ATTRIBUTES) {
    if (word?.attributes?.[a]) attributes[a] = word.attributes[a];
  }

  for (const roll of rolls) {
    const affix = catalog.affixes.get(roll.affixId);
    if (!affix) continue;
    if (affix.kind === "trigger") {
      triggers.push(resolveTrigger(affix, rollTier(item, roll), roll.quality));
      continue;
    }
    if (affix.stat === "addedWeaponDamage") continue;
    const value = statAffixValue(affix, item.tier, roll.quality, item.rarity);
    if (isAttribute(affix.stat)) attributes[affix.stat] = (attributes[affix.stat] ?? 0) + value;
    else bonuses[affix.stat] = (bonuses[affix.stat] ?? 0) + value;
  }

  const rules = word?.rules || power?.rules ? mergeRules(word?.rules, power?.rules) : undefined;
  return {
    attributes,
    bonuses: sumBonuses(
      scaledBaseStats(base, item.tier),
      base.weapon ? undefined : base.implicit,
      bonuses,
      runeBonuses(item, catalog),
      word?.bonuses,
      power?.bonuses,
    ),
    triggers,
    ...(rules ? { rules } : {}),
  };
}

/** Item slot an equipment slot takes. */
/** Whether an off hand works with a weapon: by weapon type if it names some, else by range. */
export function offHandFits(
  base: ItemBaseDefinition,
  weapon: WeaponDefinition | undefined,
): boolean {
  if (base.fitsWeapons) return weapon !== undefined && base.fitsWeapons.includes(weapon.id);
  return !base.fitsWeaponRange || weapon?.range === base.fitsWeaponRange;
}

export function itemSlotFor(slot: EquipmentSlot): ItemSlot {
  return slot === "ring1" || slot === "ring2" ? "ring" : slot;
}

export type InactiveReason =
  | { readonly kind: "requirements"; readonly missing: readonly Attribute[] }
  | { readonly kind: "wrongSlot" }
  /** Off hand does not fit the weapon (Shield needs melee, Focus needs a ranged weapon). */
  | { readonly kind: "offHandMismatch" };

export interface ResolvedEquipment {
  /** Attribute bonuses from gear (added to the hero's own attributes). */
  readonly attributes: Attributes;
  readonly bonuses: StatBonuses;
  readonly triggers: readonly TriggerSpec[];
  /** Rules from Legendary Powers and Runewords. */
  readonly rules?: CombatRules;
  /** Equipped items that give nothing right now, and why. */
  readonly inactive: readonly {
    readonly slot: EquipmentSlot;
    readonly item: Item;
    readonly reason: InactiveReason;
  }[];
}

/**
 * Sums up everything the equipped items give. Items whose requirements are not met, or that
 * sit in the wrong slot or do not fit the weapon, stay equipped but give nothing (like D2).
 */
export function resolveEquipment(
  equipment: Equipment,
  catalog: ItemCatalog,
  heroAttributes: Attributes,
  /** The hero's weapon (Weapon Mastery); decides which off hands fit. */
  weapon?: WeaponDefinition,
): ResolvedEquipment {
  const attributes: Record<Attribute, number> = {
    strength: 0,
    dexterity: 0,
    agility: 0,
    intelligence: 0,
    wisdom: 0,
    vitality: 0,
  };
  const bonusSets: StatBonuses[] = [];
  const triggers: TriggerSpec[] = [];
  const ruleSets: CombatRules[] = [];
  const inactive: { slot: EquipmentSlot; item: Item; reason: InactiveReason }[] = [];

  const reasonFor = (slot: EquipmentSlot, item: Item): InactiveReason | undefined => {
    const base = getBase(catalog, item.baseId);
    if (base.slot !== itemSlotFor(slot)) return { kind: "wrongSlot" };
    const missing = missingRequirements(item, catalog, heroAttributes);
    if (missing.length) return { kind: "requirements", missing };
    if (slot === "offHand" && !offHandFits(base, weapon)) {
      return { kind: "offHandMismatch" };
    }
    return undefined;
  };

  for (const slot of EQUIPMENT_SLOTS) {
    const item = equipment[slot];
    if (!item) continue;
    const reason = reasonFor(slot, item);
    if (reason) {
      inactive.push({ slot, item, reason });
      continue;
    }
    const mods = itemModifiers(item, catalog);
    for (const a of ATTRIBUTES) attributes[a] += mods.attributes[a] ?? 0;
    bonusSets.push(mods.bonuses);
    triggers.push(...mods.triggers);
    if (mods.rules) ruleSets.push(mods.rules);
  }

  return {
    attributes,
    bonuses: sumBonuses(...bonusSets),
    triggers,
    ...(ruleSets.length ? { rules: mergeRules(...ruleSets) } : {}),
    inactive,
  };
}
