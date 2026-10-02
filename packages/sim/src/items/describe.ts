import { COMBAT } from "../combat/constants";
import { sumBonuses } from "../combat/stats";
import { ATTRIBUTES, type Attribute, type Attributes, type DamageType } from "../combat/types";
import type {
  BuffStat,
  StatBonuses,
  TriggerCondition,
  TriggerEffect,
  TriggerSpec,
} from "../combat/types";
import { isPercentStat, resolveTrigger, statAffixValue } from "./affixes";
import { addedDamageRange, itemWeapon, requirementsFor, scaledBaseStats } from "./equipment";
import { getBase } from "./generate";
import { activeRuneword, runeBonuses } from "./runes";
import type { AffixStat, Item, ItemCatalog, ItemSlot, Rarity } from "./types";

/** English display names. All game terms stay English in code, data and UI. */
export const STAT_NAMES: Readonly<Record<AffixStat, string>> = {
  strength: "Strength",
  dexterity: "Dexterity",
  agility: "Agility",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  vitality: "Vitality",
  life: "Life",
  armor: "Armor",
  physicalDamage: "Physical Damage",
  elementalDamage: "Elemental Damage",
  critChance: "Crit Chance",
  triggerChance: "Trigger Chance",
  attackSpeed: "Attack Speed",
  evasion: "Evasion",
  blockChance: "Block Chance",
  blockValue: "Block Value",
  allResistance: "All Resistance",
  fireResistance: "Fire Resistance",
  coldResistance: "Cold Resistance",
  lightningResistance: "Lightning Resistance",
  voidResistance: "Void Resistance",
  heatGain: "Heat Gain",
  startingHeat: "Starting Heat",
  ailmentDuration: "Ailment Duration",
  tenacity: "Tenacity",
  lifesteal: "Lifesteal",
  physicalPenetration: "Physical Penetration",
  elementalPenetration: "Elemental Penetration",
  thorns: "Thorns",
  burnChance: "Chance to Burn",
  chillChance: "Chance to Chill",
  shockChance: "Chance to Shock",
  bleedChance: "Chance to Bleed",
  poisonChance: "Chance to Poison",
  addedWeaponDamage: "Weapon Damage",
};

export const RARITY_NAMES: Readonly<Record<Rarity, string>> = {
  normal: "Normal",
  magic: "Magic",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export const SLOT_NAMES: Readonly<Record<ItemSlot, string>> = {
  mainHand: "Main Hand",
  offHand: "Off Hand",
  helm: "Helm",
  body: "Body Armor",
  gloves: "Gloves",
  boots: "Boots",
  belt: "Belt",
  amulet: "Amulet",
  ring: "Ring",
};

const DAMAGE_TYPE_NAMES: Readonly<Record<DamageType, string>> = {
  physical: "Physical",
  fire: "Fire",
  cold: "Cold",
  lightning: "Lightning",
  void: "Void",
};

/** 0.125 → "12.5", 0.1 → "10". */
export function formatPercent(fraction: number): string {
  return String(Number((fraction * 100).toFixed(1)));
}

/** One stat line, e.g. "+12 % Physical Damage" or "+3 Strength". */
export function describeStat(stat: AffixStat, value: number): string {
  if (stat === "addedWeaponDamage") {
    const { min, max } = addedDamageRange(value);
    return `+${min}–${max} Weapon Damage`;
  }
  if (isPercentStat(stat)) return `+${formatPercent(value)} % ${STAT_NAMES[stat]}`;
  return `+${Math.round(value)} ${STAT_NAMES[stat]}`;
}

/** Lines for a set of bonuses, in a stable order. */
export function describeBonuses(bonuses: StatBonuses): string[] {
  return (Object.entries(bonuses) as [keyof StatBonuses, number][])
    .filter(([, value]) => value !== 0)
    .map(([stat, value]) => describeStat(stat, value));
}

const ordinal = (n: number) => {
  const suffix =
    n % 10 === 1 && n !== 11
      ? "st"
      : n % 10 === 2 && n !== 12
        ? "nd"
        : n % 10 === 3 && n !== 13
          ? "rd"
          : "th";
  return `${n}${suffix}`;
};

export function describeCondition(condition: TriggerCondition): string {
  switch (condition.kind) {
    case "fightStart":
      return "On Fight Start";
    case "everySeconds":
      return `Every ${condition.seconds} s`;
    case "everyNthAttack":
      return `Every ${ordinal(condition.n)} Attack`;
    case "onHit":
      return "On Hit";
    case "onCrit":
      return "On Crit";
    case "onSkillUse":
      return "On Skill Use";
    case "whenHit":
      return "When Hit";
    case "onEvade":
      return "On Evade";
    case "onBlock":
      return "On Block";
    case "lifeBelow":
      return `Life below ${formatPercent(condition.threshold)} %`;
  }
}

const buffAmount = (stat: BuffStat, amount: number) =>
  isPercentStat(stat) ? `+${formatPercent(amount)} %` : `+${Math.round(amount)}`;

/** Effect as a verb phrase in lower case, e.g. "gain 12 Heat". */
export function describeEffect(effect: TriggerEffect): string {
  switch (effect.kind) {
    case "weaponHit":
      return `strike again for ${formatPercent(effect.multiplier)} % Weapon Damage`;
    case "spellHit":
      return `cast ${effect.name} for ${effect.damage.min}–${effect.damage.max} ${DAMAGE_TYPE_NAMES[effect.damageType]} Damage`;
    case "ailment":
      return `${effect.ailment[0]?.toUpperCase()}${effect.ailment.slice(1)} the enemy`;
    case "heal":
      return `heal ${formatPercent(effect.fraction)} % of Max Life`;
    case "barrier":
      return `gain Barrier equal to ${formatPercent(effect.fraction)} % of Max Life`;
    case "heat":
      return `gain ${effect.amount} Heat`;
    case "buff": {
      const stacks =
        effect.maxStacks && effect.maxStacks > 1 ? `, stacks ${effect.maxStacks}×` : "";
      return `gain ${buffAmount(effect.stat, effect.amount)} ${STAT_NAMES[effect.stat]} for ${effect.duration} s${stacks}`;
    }
    case "extraAttack":
      return "strike back with a Default Attack";
  }
}

/** Full trigger text: "On Crit: 25 % chance to Burn the enemy (Cooldown 2 s)". */
export function describeTrigger(spec: TriggerSpec): string {
  const effect = describeEffect(spec.effect);
  const chance = spec.chance ?? 1;
  const body =
    chance < 1
      ? `${formatPercent(chance)} % chance to ${effect}`
      : `${effect[0]?.toUpperCase() ?? ""}${effect.slice(1)}`;
  const limit = spec.oncePerFight
    ? " (once per fight)"
    : spec.cooldown
      ? ` (Cooldown ${spec.cooldown} s)`
      : "";
  return `${describeCondition(spec.condition)}: ${body}${limit}`;
}

export interface ItemTooltip {
  readonly name: string;
  readonly rarity: Rarity;
  readonly rarityName: string;
  readonly baseName: string;
  readonly slotName: string;
  readonly tier: number;
  readonly itemLevel: number;
  /** Weapon damage, attack speed, Armor, Block ... */
  readonly baseLines: readonly string[];
  readonly implicitLines: readonly string[];
  readonly affixLines: readonly { readonly text: string; readonly kind: "stat" | "trigger" }[];
  /** "unique" and "runeword" items show their own label and color. */
  readonly special?: "unique" | "runeword";
  /** Legendary Power: name and rule text. */
  readonly power?: { readonly name: string; readonly text: string };
  /** Sockets with the socketed Runes in order (Normal items only). */
  readonly sockets?: { readonly total: number; readonly runes: readonly string[] };
  /** Runeword recipe shown under the name, e.g. "Ash · Ember". */
  readonly runewordRecipe?: string;
  readonly flavor?: string;
  readonly requirements: readonly {
    readonly attribute: Attribute;
    readonly name: string;
    readonly value: number;
    /** Undefined when no hero attributes were given. */
    readonly met?: boolean;
  }[];
}

/**
 * Attack Speed as an abstract Speed value instead of attacks per second (playtest 1):
 * 0.8 attacks per second, the Sword's speed, is Speed 100. +10 % Attack Speed makes it 110.
 */
export const SPEED_BASE_ATTACKS_PER_SECOND = 0.8;

export function speedValue(attacksPerSecond: number): number {
  return Math.round((attacksPerSecond / SPEED_BASE_ATTACKS_PER_SECOND) * 100);
}

/** Everything a tooltip shows, as plain text. The UI only lays it out. */
export function describeItem(
  item: Item,
  catalog: ItemCatalog,
  heroAttributes?: Attributes,
): ItemTooltip {
  const base = getBase(catalog, item.baseId);
  const baseLines: string[] = [];
  const weapon = itemWeapon(item, catalog);
  if (weapon) {
    baseLines.push(
      `${weapon.damage.min}–${weapon.damage.max} ${DAMAGE_TYPE_NAMES[weapon.damageType]} Damage`,
      `Speed ${speedValue(weapon.attacksPerSecond)}`,
      weapon.heatBehavior === "warming"
        ? `Heat: Warming, ${COMBAT.warmingHeatPerSecond} per second`
        : `Heat: ${weapon.heatBehavior === "cooling" ? "Cooling" : "Steady"}, ${weapon.heatPerHit} per Hit`,
      `Default Attack: ${weapon.defaultAttack}`,
    );
  }
  baseLines.push(...describeBonuses(scaledBaseStats(base, item.tier)));

  const implicitLines = [
    ...describeBonuses((weapon ? base.weapon?.implicit : base.implicit) ?? {}),
    ...(weapon?.triggers ?? []).map(describeTrigger),
  ];

  const word = activeRuneword(item, catalog);
  const power = item.powerId ? catalog.powers.get(item.powerId) : undefined;
  const unique = item.uniqueId ? catalog.uniques.get(item.uniqueId) : undefined;
  const runeName = (id: string) => catalog.runes.get(id)?.name ?? id;
  const affixLines = [
    ...item.affixes,
    ...(word?.triggers ?? []),
    ...(power?.trigger ? [power.trigger] : []),
  ].flatMap((roll): { text: string; kind: "stat" | "trigger" }[] => {
    const affix = catalog.affixes.get(roll.affixId);
    if (!affix) return [];
    if (affix.kind === "trigger") {
      return [
        {
          text: describeTrigger(resolveTrigger(affix, item.tier, roll.quality)),
          kind: "trigger" as const,
        },
      ];
    }
    return [
      {
        text: describeStat(affix.stat, statAffixValue(affix, item.tier, roll.quality)),
        kind: "stat" as const,
      },
    ];
  });
  // Runeword and Rune bonuses read like affixes.
  const extra = sumBonuses(word?.bonuses, runeBonuses(item, catalog), power?.bonuses);
  const wordAttributes = ATTRIBUTES.flatMap((a) =>
    word?.attributes?.[a] ? [describeStat(a, word.attributes[a])] : [],
  );
  affixLines.push(
    ...[...wordAttributes, ...describeBonuses(extra)].map((text) => ({
      text,
      kind: "stat" as const,
    })),
  );
  // Stat affixes first, triggers last (like the tooltip mock).
  affixLines.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "stat" ? -1 : 1));

  const required = requirementsFor(base, item.tier);
  const requirements = ATTRIBUTES.flatMap((attribute) => {
    const value = required[attribute];
    if (!value) return [];
    return [
      {
        attribute,
        name: STAT_NAMES[attribute],
        value,
        ...(heroAttributes ? { met: heroAttributes[attribute] >= value } : {}),
      },
    ];
  });

  const special = unique ? "unique" : word ? "runeword" : undefined;
  return {
    name: item.name,
    rarity: item.rarity,
    rarityName: unique ? "Unique" : word ? "Runeword" : RARITY_NAMES[item.rarity],
    ...(special ? { special } : {}),
    ...(power ? { power: { name: power.name, text: power.description } } : {}),
    ...(item.sockets
      ? { sockets: { total: item.sockets, runes: (item.runes ?? []).map(runeName) } }
      : {}),
    ...(word ? { runewordRecipe: word.runes.map(runeName).join(" · ") } : {}),
    ...(unique?.flavor ? { flavor: unique.flavor } : {}),
    baseName: base.name,
    slotName: SLOT_NAMES[base.slot],
    tier: item.tier,
    itemLevel: item.itemLevel,
    baseLines,
    implicitLines,
    affixLines,
    requirements,
  };
}
