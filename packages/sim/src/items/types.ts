import type {
  Attribute,
  Attributes,
  BuffStat,
  DamageRange,
  DamageType,
  StatBonuses,
  TriggerCondition,
  WeaponDefinition,
} from "../combat/types";
import type { AilmentType } from "../combat/types";

/** Item data shapes (docs/design/item-system-v1.md). Content is written against these. */

export const RARITIES = ["normal", "magic", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];

/** What kind of item a base is. Two Rings share the item slot "ring". */
export const ITEM_SLOTS = [
  "mainHand",
  "offHand",
  "helm",
  "body",
  "gloves",
  "boots",
  "belt",
  "amulet",
  "ring",
] as const;
export type ItemSlot = (typeof ITEM_SLOTS)[number];

/** The 10 equipment slots of the hero (= 10 Save Tokens). */
export const EQUIPMENT_SLOTS = [
  "mainHand",
  "offHand",
  "helm",
  "body",
  "gloves",
  "boots",
  "belt",
  "amulet",
  "ring1",
  "ring2",
] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export interface ValueRange {
  readonly min: number;
  readonly max: number;
}

/**
 * A base item type (D2 principle): base values, implicit, requirements. Its numbers are for
 * Item Tier 1 and scale with the tier.
 */
export interface ItemBaseDefinition {
  readonly id: string;
  readonly name: string;
  readonly slot: ItemSlot;
  /** Main hand only: the weapon at Tier 1. Damage scales with the tier. */
  readonly weapon?: WeaponDefinition;
  /** Off hand only: which weapons it fits (Shield → melee, Focus → ranged casters). */
  readonly fitsWeaponRange?: "melee" | "ranged";
  /** Base values at Tier 1. Flat values (Armor, Block Value, Life) scale with the tier. */
  readonly baseStats?: StatBonuses;
  /** Fixed bonus of the base type, never scaled. */
  readonly implicit?: StatBonuses;
  /** Attribute Requirements at Tier 1; they grow with the tier. */
  readonly requirements?: Partial<Attributes>;
  /** Affix weighting by tag, e.g. `{ elemental: 2 }` makes elemental affixes twice as likely. */
  readonly affixWeights?: Readonly<Record<string, number>>;
  /** Inventory grid cells (width × height). Default by slot, see PROGRESSION.itemSizes. */
  readonly size?: { readonly w: number; readonly h: number };
}

/** What a stat affix raises: a stat, an attribute or the weapon's own damage (local). */
export type AffixStat = keyof StatBonuses | Attribute | "addedWeaponDamage";

interface AffixCommon {
  readonly id: string;
  /** Item slots whose pool contains the affix. */
  readonly slots: readonly ItemSlot[];
  /** Relative roll weight inside a pool (before base weighting). */
  readonly weight: number;
  /** Tags for base weighting, e.g. "crit", "elemental", "defense". */
  readonly tags: readonly string[];
  /** Rolled value at Tier 1: quality 0 = min, quality 1 = max. */
  readonly value: ValueRange;
  /** Growth per tier above 1: value × (1 + perTier × (tier − 1)). 0 = no growth. */
  readonly perTier: number;
}

export interface StatAffixDefinition extends AffixCommon {
  readonly kind: "stat";
  readonly stat: AffixStat;
  /** Magic item name suffix, e.g. "of the Bear" → "Sword of the Bear". */
  readonly suffix: string;
}

/**
 * Trigger effect before rolling. The rolled value fills the effect's magnitude (`rolls:
 * "magnitude"`) or the trigger chance (`rolls: "chance"`).
 */
export type TriggerEffectTemplate =
  | { readonly kind: "weaponHit" }
  | {
      readonly kind: "spellHit";
      readonly name: string;
      /** Damage at value 1; multiplied by the rolled value. */
      readonly damage: DamageRange;
      readonly damageType: DamageType;
    }
  | { readonly kind: "ailment"; readonly ailment: AilmentType }
  | { readonly kind: "heal" }
  | { readonly kind: "barrier" }
  | { readonly kind: "heat" }
  | {
      readonly kind: "buff";
      readonly stat: BuffStat;
      readonly duration: number;
      readonly maxStacks?: number;
    }
  | { readonly kind: "extraAttack" };

export interface TriggerAffixDefinition extends AffixCommon {
  readonly kind: "trigger";
  /** Shown in tooltips and the combat log, e.g. "Second Wind". */
  readonly name: string;
  readonly condition: TriggerCondition;
  /** Fixed chance when `rolls` is "magnitude". Default 1. */
  readonly chance?: number;
  readonly cooldown?: number;
  readonly oncePerFight?: boolean;
  readonly effect: TriggerEffectTemplate;
  readonly rolls: "magnitude" | "chance";
}

export type AffixDefinition = StatAffixDefinition | TriggerAffixDefinition;

/** One rolled affix on an item. Quality (0..1) stays when the item's tier changes. */
export interface AffixRoll {
  readonly affixId: string;
  readonly quality: number;
}

/** A concrete item. Plain data (ids + numbers), so it can go into a save game as is. */
export interface Item {
  readonly id: string;
  readonly baseId: string;
  readonly name: string;
  readonly rarity: Rarity;
  readonly itemLevel: number;
  /** Item Tier (T1 = Item Level 1–10). Ascension can raise it later. */
  readonly tier: number;
  readonly affixes: readonly AffixRoll[];
}

/** Everything needed to roll and read items. Built once from content. */
export interface ItemCatalog {
  readonly bases: ReadonlyMap<string, ItemBaseDefinition>;
  readonly affixes: ReadonlyMap<string, AffixDefinition>;
  /** Name parts for Rare and Epic items ("Cinder" + "Bite"). */
  readonly rareNames: { readonly first: readonly string[]; readonly second: readonly string[] };
}

export type Equipment = Readonly<Partial<Record<EquipmentSlot, Item>>>;
