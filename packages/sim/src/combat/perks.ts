import type { Attribute } from "./types";

/**
 * Attribute Breakpoints (docs/design/attribute-v1.md section 4): at 4, 7 and 10 every attribute
 * opens a fixed Perk. Only the hero's own points and Blaze Boons count, never gear.
 */
export const PERK_IDS = [
  "armorbreaker",
  "stoneguard",
  "titan",
  "hawkeye",
  "opportunist",
  "trueShot",
  "attuned",
  "elementalSurge",
  "spellfire",
  "quickReflexes",
  "emberDance",
  "doubleTime",
  "readyFlame",
  "afterglow",
  "clarity",
  "secondBreath",
  "scarTissue",
  "undying",
] as const;
export type PerkId = (typeof PERK_IDS)[number];

export interface PerkDefinition {
  readonly id: PerkId;
  readonly name: string;
  readonly attribute: Attribute;
  /** Own attribute value that opens the Perk. */
  readonly threshold: number;
  readonly description: string;
}

export const BREAKPOINTS = [4, 7, 10] as const;

/** Numbers of the Perks. Starting values for the balance CLI. */
export const PERK = {
  /** Stoneguard: more Block Value. */
  stoneguardBlockValue: 0.25,
  /** Titan: a hit of at least this share of the target's max life stuns. */
  titanThreshold: 0.1,
  titanStun: 0.5,
  titanCooldown: 6,
  hawkeyePrecision: 0.05,
  trueShotEvery: 5,
  attunedPenetration: 0.1,
  elementalSurgeChance: 0.1,
  spellfireDamage: 2,
  emberDanceHeat: 5,
  doubleTimeEvery: 4,
  readyFlameHeat: 10,
  afterglowRefund: 0.1,
  /** Clarity: own ailments last this much longer, Poison holds one stack more. */
  claritySeconds: 1,
  clarityPoisonStacks: 1,
  secondBreathBelow: 0.3,
  secondBreathHeal: 0.15,
  scarTissueDotTaken: 0.15,
} as const;

const pct = (x: number) => `${Math.round(x * 100)} %`;

export const PERKS: readonly PerkDefinition[] = [
  {
    id: "armorbreaker",
    name: "Armorbreaker",
    attribute: "strength",
    threshold: 4,
    description: "Crits add a Sunder stack.",
  },
  {
    id: "stoneguard",
    name: "Stoneguard",
    attribute: "strength",
    threshold: 7,
    description: `+${pct(PERK.stoneguardBlockValue)} Block Value.`,
  },
  {
    id: "titan",
    name: "Titan",
    attribute: "strength",
    threshold: 10,
    description: `Hits for ${pct(PERK.titanThreshold)} of enemy Life stun for ${PERK.titanStun} s (every ${PERK.titanCooldown} s).`,
  },
  {
    id: "hawkeye",
    name: "Hawkeye",
    attribute: "dexterity",
    threshold: 4,
    description: `+${pct(PERK.hawkeyePrecision)} Precision.`,
  },
  {
    id: "opportunist",
    name: "Opportunist",
    attribute: "dexterity",
    threshold: 7,
    description: "Glancing Blows fire On Hit triggers.",
  },
  {
    id: "trueShot",
    name: "True Shot",
    attribute: "dexterity",
    threshold: 10,
    description: `Every ${PERK.trueShotEvery}th attack is a clean Crit.`,
  },
  {
    id: "attuned",
    name: "Attuned",
    attribute: "intelligence",
    threshold: 4,
    description: `+${pct(PERK.attunedPenetration)} Elemental Penetration.`,
  },
  {
    id: "elementalSurge",
    name: "Elemental Surge",
    attribute: "intelligence",
    threshold: 7,
    description: `Elemental hits: +${pct(PERK.elementalSurgeChance)} chance of their ailment.`,
  },
  {
    id: "spellfire",
    name: "Spellfire",
    attribute: "intelligence",
    threshold: 10,
    description: "The first Spell of a fight deals double damage.",
  },
  {
    id: "quickReflexes",
    name: "Quick Reflexes",
    attribute: "agility",
    threshold: 4,
    description: "The first enemy attack of a fight misses.",
  },
  {
    id: "emberDance",
    name: "Ember Dance",
    attribute: "agility",
    threshold: 7,
    description: `+${PERK.emberDanceHeat} Heat on Evade.`,
  },
  {
    id: "doubleTime",
    name: "Double Time",
    attribute: "agility",
    threshold: 10,
    description: `Every ${PERK.doubleTimeEvery}th attack strikes twice.`,
  },
  {
    id: "readyFlame",
    name: "Ready Flame",
    attribute: "wisdom",
    threshold: 4,
    description: `+${PERK.readyFlameHeat} Starting Heat.`,
  },
  {
    id: "afterglow",
    name: "Afterglow",
    attribute: "wisdom",
    threshold: 7,
    description: `Skills refund ${pct(PERK.afterglowRefund)} of their Heat Cost.`,
  },
  {
    id: "clarity",
    name: "Clarity",
    attribute: "wisdom",
    threshold: 10,
    description: `Your ailments last ${PERK.claritySeconds} s longer, Poison stacks once more.`,
  },
  {
    id: "secondBreath",
    name: "Second Breath",
    attribute: "vitality",
    threshold: 4,
    description: `Once per fight below ${pct(PERK.secondBreathBelow)} Life: heal ${pct(PERK.secondBreathHeal)}.`,
  },
  {
    id: "scarTissue",
    name: "Scar Tissue",
    attribute: "vitality",
    threshold: 7,
    description: `−${pct(PERK.scarTissueDotTaken)} damage from ailments.`,
  },
  {
    id: "undying",
    name: "Undying",
    attribute: "vitality",
    threshold: 10,
    description: "Once per fight a deadly blow leaves you at 1 Life.",
  },
];

export function getPerk(id: PerkId): PerkDefinition {
  const perk = PERKS.find((p) => p.id === id);
  if (!perk) throw new Error(`Unknown Perk "${id}"`);
  return perk;
}

/** The Perks open at these attribute values. */
export function perksFor(attributes: Readonly<Record<Attribute, number>>): PerkId[] {
  return PERKS.filter((p) => attributes[p.attribute] >= p.threshold).map((p) => p.id);
}
