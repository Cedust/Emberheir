import {
  type Attribute,
  type BuildPlan,
  MASTERY_KEYSTONE,
  MASTERY_NODES,
  MASTERY_SKILL,
} from "@emberheir/sim";

/**
 * The 24 builds (klassengeruest-v1.md 9, step 5): one per Heirloom path. The balance autopilot
 * plays them run by run, the Cheat Panel jumps to their last stage.
 *
 * Every build takes its first Battle Plan skill close to the class's start, then the main
 * Mastery's skill and Keystone, then the Notables of its damage type and one Ash Tree Keystone.
 * Weapon fighters with an elemental path swing their infused weapon (Steel and Blood attacks),
 * casters cast the spells of their element.
 */

const MS = MASTERY_SKILL;
const MN = MASTERY_NODES;
const MK = MASTERY_KEYSTONE;

type Style = "bleed" | "stun" | "poison" | "fire" | "lightning" | "cold" | "void";

/**
 * Heirloom choices per weapon: Heat Form and Innate Form, plus per path the Keystone that fits it
 * (a Bleed Keystone on a Fire path would only cost damage) and the fork sides.
 */
const HEIRLOOM: Record<
  string,
  {
    heat?: string;
    innate: string;
    innates?: Record<string, string>;
    keystones: Record<string, string>;
    forks?: Record<string, readonly [0 | 1, 0 | 1]>;
  }
> = {
  sword: {
    heat: "heat-cooling",
    innate: "rising-strike",
    keystones: { edge: "deep-cuts", thunder: "flowing-blade", winter: "perfect-parry" },
    forks: { edge: [0, 1], winter: [1, 0] },
  },
  axe: {
    heat: "heat-cooling",
    innate: "gutting-lacerate",
    keystones: { butcher: "rampage", blaze: "executioner", glacier: "gore" },
    forks: { butcher: [0, 0] },
  },
  mace: {
    heat: "heat-cooling",
    innate: "bone-breaker",
    keystones: { quake: "siege", forge: "siege", stormwall: "bastion" },
    forks: { quake: [1, 0], stormwall: [0, 1] },
  },
  bow: {
    innate: "hooked-arrow",
    keystones: { toxin: "marked-prey", "fire-arrows": "marked-prey", storm: "rain-of-arrows" },
  },
  crossbow: {
    innate: "ballista-bolt",
    keystones: { "venom-bolts": "siege-engine", incendiary: "repeater", frost: "repeater" },
    forks: { "venom-bolts": [1, 0] },
  },
  dagger: {
    heat: "heat-cooling",
    innate: "virulent-coat",
    keystones: { venom: "toxic-bloom", cutthroat: "assassinate", static: "shadowstep" },
    forks: { cutthroat: [1, 1] },
  },
  wand: {
    heat: "heat-warming",
    innate: "barrage",
    keystones: { starfall: "wild-magic", storm: "wild-magic", rime: "prism" },
    forks: { rime: [1, 0] },
  },
  staff: {
    heat: "heat-warming",
    innate: "void-lance",
    innates: { smolder: "rift-bolt" },
    keystones: { hollow: "endless-night", smolder: "pyre", glacial: "eclipse" },
    forks: { smolder: [1, 1] },
  },
};

/** The Notables that carry a damage type, wherever the build comes from. */
const ELEMENT_NOTABLES: Record<"fire" | "lightning" | "cold", readonly string[]> = {
  fire: ["flame-firestarter", "flame-pyroclasm"],
  lightning: ["storm-thunderhead", "storm-storm-weaver"],
  cold: ["frost-glacier", "frost-deep-freeze"],
};

/** The element attack of a weapon fighter: its Ash Tree node and the skill it teaches. */
const ELEMENT_ATTACKS: Record<"fire" | "lightning" | "cold", { node: string; skill: string }> = {
  fire: { node: "flame-searing-blow", skill: "searing-blow" },
  lightning: { node: "storm-storm-strike", skill: "storm-strike" },
  cold: { node: "frost-frost-strike", skill: "frost-strike" },
};

interface Kit {
  readonly nodes: readonly string[];
  readonly rotation: readonly string[];
}

/** Cinderguard (starts at Steel, Blood and the trunk next door). */
function cinderguardKit(style: Style): Kit {
  if (style === "bleed") {
    return {
      nodes: [
        "blood-rend",
        MS,
        MK,
        "blood-flayer",
        "blood-cleave",
        "trunk-iron-bastion",
        "blood-exsanguinate",
        "steel-final-mercy",
        "steel-brutal-force",
        MN,
        "steel-colossus",
      ],
      rotation: [MS, "rend"],
    };
  }
  // An elemental path learns its element's attack and Notables right after the Mastery, not last.
  const attack =
    style === "stun" ? undefined : ELEMENT_ATTACKS[style as "fire" | "lightning" | "cold"];
  const element = style === "stun" ? [] : ELEMENT_NOTABLES[style as "fire" | "lightning" | "cold"];
  return {
    nodes: [
      "steel-crushing-blow",
      MS,
      MK,
      ...(attack ? [attack.node] : []),
      ...element,
      "steel-brutal-force",
      "steel-flurry",
      "trunk-iron-bastion",
      "steel-colossus",
      "steel-final-mercy",
      ...(style === "stun" ? ["steel-coup-de-grace"] : []),
      MN,
      "roots-unbroken",
      "steel-execute",
    ],
    rotation: [MS, attack?.skill ?? "crushing-blow"],
  };
}

/** Ashstrider (starts at Venom, Blood and Flame next door). */
function ashstriderKit(style: Style): Kit {
  if (style === "poison") {
    return {
      nodes: [
        "venom-envenom",
        MS,
        MK,
        "venom-venom-heart",
        "venom-toxic-burst",
        "venom-creeping-death",
        "venom-slow-death",
        MN,
        "venom-wither",
        "venom-leeching-rot",
        "trunk-iron-bastion",
      ],
      rotation: [MS, "toxic-burst"],
    };
  }
  if (style === "bleed") {
    return {
      nodes: [
        "blood-rend",
        MS,
        MK,
        "blood-flayer",
        "blood-exsanguinate",
        "steel-final-mercy",
        MN,
        "venom-ghost-step",
        "trunk-iron-bastion",
      ],
      rotation: [MS, "rend"],
    };
  }
  // Like the Cinderguard, an elemental path shoots its element's attack, not the Blood kit.
  const attack = ELEMENT_ATTACKS[style as "fire" | "lightning" | "cold"];
  return {
    nodes: [
      attack.node,
      MS,
      MK,
      ...ELEMENT_NOTABLES[style as "fire" | "lightning" | "cold"],
      "steel-final-mercy",
      MN,
      "venom-ghost-step",
      "trunk-iron-bastion",
    ],
    rotation: [MS, attack.skill],
  };
}

/** Emberseer (starts at Void, Frost and the trunk next door). */
function emberseerKit(style: Style): Kit {
  const spells: Record<string, Kit> = {
    void: {
      nodes: [
        "void-corrupt",
        MS,
        MK,
        "void-hollow-crown",
        "void-void-rift",
        "trunk-iron-bastion",
        "void-entropy",
        "void-hungering-void",
        "void-pact-of-ash",
        MN,
        "void-soul-harvest",
        "frost-heart-of-winter",
      ],
      rotation: [MS, "void-rift"],
    },
    cold: {
      nodes: [
        "frost-ice-lance",
        MS,
        MK,
        "frost-glacier",
        "frost-frost-nova",
        "trunk-iron-bastion",
        "frost-heart-of-winter",
        "roots-arcane-conduit",
        MN,
        "frost-deep-freeze",
      ],
      rotation: [MS, "frost-nova"],
    },
    lightning: {
      nodes: [
        "void-corrupt",
        MS,
        MK,
        "storm-chain-lightning",
        "storm-thunderhead",
        "storm-thunderstrike",
        "trunk-iron-bastion",
        "storm-storm-weaver",
        "roots-arcane-conduit",
        MN,
        "frost-heart-of-winter",
      ],
      rotation: [MS, "chain-lightning"],
    },
    fire: {
      nodes: [
        "void-corrupt",
        MS,
        MK,
        "flame-immolate",
        "flame-firestarter",
        "flame-meteor",
        "trunk-iron-bastion",
        "flame-pyroclasm",
        "flame-inferno",
        "flame-cinder-heart",
        "roots-arcane-conduit",
        MN,
      ],
      rotation: [MS, "inferno"],
    },
  };
  return spells[style] ?? (spells.void as Kit);
}

/** Every Heirloom path: weapon, path id and the style it fights in. */
const PATHS: readonly (readonly [string, string, Style])[] = [
  ["sword", "edge", "bleed"],
  ["sword", "thunder", "lightning"],
  ["sword", "winter", "cold"],
  ["axe", "butcher", "bleed"],
  ["axe", "blaze", "fire"],
  ["axe", "glacier", "cold"],
  ["mace", "quake", "stun"],
  ["mace", "forge", "fire"],
  ["mace", "stormwall", "lightning"],
  ["bow", "toxin", "poison"],
  ["bow", "fire-arrows", "fire"],
  ["bow", "storm", "lightning"],
  ["crossbow", "venom-bolts", "poison"],
  ["crossbow", "incendiary", "fire"],
  ["crossbow", "frost", "cold"],
  ["dagger", "venom", "poison"],
  ["dagger", "cutthroat", "bleed"],
  ["dagger", "static", "lightning"],
  ["wand", "starfall", "void"],
  ["wand", "storm", "lightning"],
  ["wand", "rime", "cold"],
  ["staff", "hollow", "void"],
  ["staff", "smolder", "fire"],
  ["staff", "glacial", "cold"],
];

const CLASS_OF: Record<string, string> = {
  sword: "cinderguard",
  axe: "cinderguard",
  mace: "cinderguard",
  bow: "ashstrider",
  crossbow: "ashstrider",
  dagger: "ashstrider",
  wand: "emberseer",
  staff: "emberseer",
};

/** Masteries per class: Burst, Tempo, Ailment. */
const CLASS_MASTERIES: Record<string, readonly [string, string, string]> = {
  cinderguard: ["vanquisher", "berserker", "ravager"],
  ashstrider: ["deadeye", "skirmisher", "trickster"],
  emberseer: ["archmage", "spellweaver", "warlock"],
};

const CLASS_ATTRIBUTES: Record<string, readonly Attribute[]> = {
  cinderguard: ["strength", "vitality", "agility"],
  ashstrider: ["dexterity", "agility", "vitality"],
  emberseer: ["intelligence", "vitality", "wisdom"],
};

const AILMENT_STYLES = new Set<Style>(["bleed", "poison", "void"]);

const title = (id: string) =>
  id
    .split("-")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

export const BUILD_PLANS: readonly BuildPlan[] = PATHS.map(([weapon, path, style]) => {
  const classId = CLASS_OF[weapon] ?? "cinderguard";
  const [burst, tempo, ailment] = CLASS_MASTERIES[classId] ?? ["", "", ""];
  const kit =
    classId === "cinderguard"
      ? cinderguardKit(style)
      : classId === "ashstrider"
        ? ashstriderKit(style)
        : emberseerKit(style);
  const heirloom = HEIRLOOM[weapon] ?? { innate: "", keystones: {} };
  const forks = heirloom.forks?.[path];
  return {
    id: `${weapon}-${path}`,
    name: `${title(path)} ${title(weapon)}`,
    classId,
    weapon,
    heirloom: {
      ...(heirloom.heat ? { heat: heirloom.heat } : {}),
      innate: heirloom.innates?.[path] ?? heirloom.innate,
      keystone: heirloom.keystones[path] ?? "",
      path,
      ...(forks ? { forks } : {}),
    },
    nodes: kit.nodes,
    rotation: kit.rotation,
    masteries: AILMENT_STYLES.has(style) ? [ailment, burst, tempo] : [burst, ailment, tempo],
    reaction: { skillId: "iron-bastion", conditionId: "life-50" },
    attributes: CLASS_ATTRIBUTES[classId] ?? [],
  };
});
