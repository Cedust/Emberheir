import type {
  Attribute,
  Attributes,
  BuffStat,
  CombatRules,
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
  /** Off hands for some weapon types only (a Quiver needs a Bow or Crossbow). Wins over range. */
  readonly fitsWeapons?: readonly string[];
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
  /** Most Sockets a Normal item of this base can have (0 = none, e.g. Jewelry). */
  readonly maxSockets?: number;
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
  /**
   * Magic item name part (D2 style): either a prefix ("Sturdy") or a suffix ("of the Bear").
   * A Magic item has at most one of each: "Sturdy Iron Helm of the Bear".
   */
  readonly prefix?: string;
  readonly suffix?: string;
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
  /** Trigger Codex parts it teaches when salvaged (docs/design/trigger-codex-v1.md). */
  readonly parts?: { readonly condition: string; readonly effect: string };
}

/**
 * Where a Trigger Codex part drops more often: enemy archetypes, an act, or act bosses. A
 * trigger affix whose part has its home in the current fight is ×`homeWeight` likely.
 */
export interface CodexHome {
  readonly archetypes?: readonly string[];
  readonly actId?: string;
  readonly boss?: boolean;
}

/** A Condition of the Trigger Codex: when a kindled trigger fires. */
export interface TriggerConditionPart {
  readonly id: string;
  /** Shown in the Codex, e.g. "On Crit". */
  readonly name: string;
  readonly condition: TriggerCondition;
  /**
   * Scales the trigger chance: 1 for rare moments (On Crit, Every 4th Attack), lower for frequent
   * ones (On Hit). Default 1.
   */
  readonly chance?: number;
  readonly cooldown?: number;
  readonly oncePerFight?: boolean;
  readonly home: CodexHome;
}

/** An Effect of the Trigger Codex: what a kindled trigger does. */
export interface TriggerEffectPart {
  readonly id: string;
  /** Shown in the Codex and the combat log, e.g. "Flame Pulse". */
  readonly name: string;
  readonly effect: TriggerEffectTemplate;
  readonly rolls: "magnitude" | "chance";
  /** Value at Tier 1 (quality 0..1), like a trigger affix. */
  readonly value: ValueRange;
  readonly perTier: number;
  /** Least Internal Cooldown, so strong effects cannot fire on every hit. */
  readonly cooldown?: number;
  readonly home: CodexHome;
}

export type AffixDefinition = StatAffixDefinition | TriggerAffixDefinition;

/** One rolled affix on an item. Quality (0..1) stays when the item's tier changes. */
export interface AffixRoll {
  readonly affixId: string;
  readonly quality: number;
  /** Kindled at the Mystic (one per item). */
  readonly kindled?: true;
  /** Own tier of a kindled trigger (the Codex Mastery); never above the item's tier. */
  readonly tier?: number;
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
  /**
   * Affix Lock (Mystic): after Temper or Imbue only this affix index can be changed again,
   * until a Reforge clears it.
   */
  readonly lockedAffix?: number;
  /** Normal items only: empty Sockets plus socketed Runes (`runes.length` ≤ `sockets`). */
  readonly sockets?: number;
  /** Socketed Rune ids in order. The right order in the right base makes a Runeword. */
  readonly runes?: readonly string[];
  /** Legendary items: their fixed Legendary Power. */
  readonly powerId?: string;
  /** Unique items: hand-made, fixed affixes. */
  readonly uniqueId?: string;
}

/** Which bonus of a Rune applies: in a weapon, or in armor (Off Hand, Helm, Body Armor). */
export type RuneGroup = "weapon" | "armor";

/** A Rune (docs/design/item-system-v1.md section 7): a small bonus, more in a Runeword. */
export interface RuneDefinition {
  readonly id: string;
  readonly name: string;
  /** 1 = most common. Three of one rank combine into one of the next. */
  readonly rank: number;
  readonly bonuses: Readonly<Record<RuneGroup, StatBonuses>>;
}

/** A Runeword: the exact Runes, in order, in a Normal item with exactly that many Sockets. */
export interface RunewordDefinition {
  readonly id: string;
  readonly name: string;
  readonly runes: readonly string[];
  /** Item slots whose bases can carry it. */
  readonly slots: readonly ItemSlot[];
  readonly bonuses: StatBonuses;
  readonly attributes?: Partial<Attributes>;
  /** Trigger affixes it grants, at a fixed quality. */
  readonly triggers?: readonly AffixRoll[];
  readonly rules?: CombatRules;
}

/**
 * A Legendary Power (item-system-v1.md section 6): rule-changing, only on Legendary items.
 * It brings rules, bonuses or a trigger, and never changes (no Reforge, no Temper).
 */
export interface LegendaryPowerDefinition {
  readonly id: string;
  readonly name: string;
  /** One line for the tooltip, e.g. "Your Bleed also Poisons". */
  readonly description: string;
  readonly slots: readonly ItemSlot[];
  readonly rules?: CombatRules;
  readonly bonuses?: StatBonuses;
  readonly trigger?: AffixRoll;
}

/** A Unique item: fixed base, name, affixes and maybe a Legendary Power. */
export interface UniqueDefinition {
  readonly id: string;
  readonly name: string;
  readonly baseId: string;
  /** Affixes with their quality range (rolled inside it). */
  readonly affixes: readonly {
    readonly affixId: string;
    readonly quality: ValueRange;
  }[];
  readonly powerId?: string;
  /** Lowest Item Level it drops at. */
  readonly minItemLevel: number;
  /** One line of flavor text for the tooltip. */
  readonly flavor?: string;
}

/** Everything needed to roll and read items. Built once from content. */
export interface ItemCatalog {
  readonly bases: ReadonlyMap<string, ItemBaseDefinition>;
  readonly affixes: ReadonlyMap<string, AffixDefinition>;
  /** Name parts for Rare and Epic items ("Cinder" + "Bite"). */
  readonly rareNames: { readonly first: readonly string[]; readonly second: readonly string[] };
  readonly runes: ReadonlyMap<string, RuneDefinition>;
  readonly runewords: ReadonlyMap<string, RunewordDefinition>;
  readonly powers: ReadonlyMap<string, LegendaryPowerDefinition>;
  readonly uniques: ReadonlyMap<string, UniqueDefinition>;
  /** Trigger Codex parts. Every Condition × Effect is also an affix (`kindledAffixId`). */
  readonly conditions: ReadonlyMap<string, TriggerConditionPart>;
  readonly effects: ReadonlyMap<string, TriggerEffectPart>;
}

export type Equipment = Readonly<Partial<Record<EquipmentSlot, Item>>>;
