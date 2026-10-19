import { type Attribute, type BuildPlan, MASTERY_NODES, MASTERY_SKILL } from "@emberheir/sim";

/**
 * The 24 builds (klassengeruest-v1.md 9, step 5): one per Heirloom path. The balance autopilot
 * plays them run by run, the Cheat Panel jumps to their last stage.
 *
 * Every build takes its first Battle Plan skill close to the class's start, then the main
 * Mastery's skill, then the Notables of its damage type. Weapon fighters with an elemental path
 * swing their infused weapon (Steel and Blood attacks), casters cast the spells of their element.
 */

const MS = MASTERY_SKILL;
const MN = MASTERY_NODES;

type Style = "bleed" | "stun" | "poison" | "fire" | "lightning" | "cold" | "void";

/** Heirloom choices per weapon: Heat Form, Innate Form and Keystone, plus fork sides per path. */
const HEIRLOOM: Record<
  string,
  {
    heat?: string;
    innate: string;
    keystone: string;
    forks?: Record<string, readonly [0 | 1, 0 | 1]>;
  }
> = {
  sword: {
    heat: "heat-cooling",
    innate: "rising-strike",
    keystone: "final-verdict",
    forks: { edge: [0, 1], winter: [1, 0] },
  },
  axe: {
    heat: "heat-cooling",
    innate: "gutting-lacerate",
    keystone: "rampage",
    forks: { butcher: [0, 0] },
  },
  mace: {
    heat: "heat-cooling",
    innate: "bone-breaker",
    keystone: "siege",
    forks: { quake: [1, 0], stormwall: [0, 1] },
  },
  bow: { innate: "hooked-arrow", keystone: "marked-prey" },
  crossbow: { innate: "ballista-bolt", keystone: "repeater", forks: { "venom-bolts": [1, 0] } },
  dagger: {
    heat: "heat-cooling",
    innate: "virulent-coat",
    keystone: "toxic-bloom",
    forks: { cutthroat: [1, 1] },
  },
  wand: {
    heat: "heat-warming",
    innate: "barrage",
    keystone: "wild-magic",
    forks: { rime: [1, 0] },
  },
  staff: {
    heat: "heat-warming",
    innate: "void-lance",
    keystone: "endless-night",
    forks: { smolder: [1, 0] },
  },
};

/** The Notables that carry a damage type, wherever the build comes from. */
const ELEMENT_NOTABLES: Record<"fire" | "lightning" | "cold", readonly string[]> = {
  fire: ["flame-firestarter", "flame-pyroclasm"],
  lightning: ["storm-thunderhead", "storm-storm-weaver"],
  cold: ["frost-glacier", "frost-deep-freeze"],
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
        "blood-flayer",
        "blood-cleave",
        "trunk-iron-bastion",
        "blood-exsanguinate",
        "steel-brutal-force",
        MN,
        "steel-colossus",
      ],
      rotation: ["rend", MS, "cleave", "crushing-blow"],
    };
  }
  const element = style === "stun" ? [] : ELEMENT_NOTABLES[style as "fire" | "lightning" | "cold"];
  return {
    nodes: [
      "steel-crushing-blow",
      MS,
      "steel-brutal-force",
      "steel-flurry",
      "trunk-iron-bastion",
      "steel-colossus",
      "steel-execute",
      ...(style === "stun" ? ["steel-coup-de-grace"] : []),
      MN,
      "roots-unbroken",
      ...element,
    ],
    rotation: ["crushing-blow", MS, "flurry", "execute"],
  };
}

/** Ashstrider (starts at Venom, Blood and Flame next door). */
function ashstriderKit(style: Style): Kit {
  if (style === "poison") {
    return {
      nodes: [
        "venom-envenom",
        MS,
        "venom-venom-heart",
        "venom-toxic-burst",
        "venom-creeping-death",
        MN,
        "venom-wither",
        "venom-leeching-rot",
        "trunk-iron-bastion",
      ],
      rotation: ["envenom", MS, "toxic-burst", "wither"],
    };
  }
  const element =
    style === "bleed"
      ? ["blood-flayer", "blood-exsanguinate"]
      : ELEMENT_NOTABLES[style as "fire" | "lightning" | "cold"];
  return {
    nodes: [
      "blood-cleave",
      MS,
      ...element.slice(0, 1),
      "blood-rend",
      ...element.slice(1),
      MN,
      "blood-flayer",
      "venom-ghost-step",
      "trunk-iron-bastion",
    ],
    rotation: ["cleave", MS, "rend", "serrated-edge"],
  };
}

/** Emberseer (starts at Void, Frost and the trunk next door). */
function emberseerKit(style: Style): Kit {
  const spells: Record<string, Kit> = {
    void: {
      nodes: [
        "void-corrupt",
        MS,
        "void-hollow-crown",
        "void-void-rift",
        "trunk-iron-bastion",
        "void-entropy",
        "void-hungering-void",
        MN,
        "void-soul-harvest",
        "frost-heart-of-winter",
      ],
      rotation: ["corrupt", MS, "void-rift", "soul-harvest"],
    },
    cold: {
      nodes: [
        "frost-ice-lance",
        MS,
        "frost-glacier",
        "frost-frost-nova",
        "trunk-iron-bastion",
        "frost-heart-of-winter",
        MN,
        "frost-deep-freeze",
      ],
      rotation: ["ice-lance", MS, "frost-nova", "corrupt"],
    },
    lightning: {
      nodes: [
        "void-corrupt",
        MS,
        "storm-chain-lightning",
        "storm-thunderhead",
        "storm-thunderstrike",
        "trunk-iron-bastion",
        "storm-storm-weaver",
        MN,
        "frost-heart-of-winter",
      ],
      rotation: ["chain-lightning", MS, "thunderstrike", "corrupt"],
    },
    fire: {
      nodes: [
        "void-corrupt",
        MS,
        "flame-immolate",
        "flame-firestarter",
        "flame-meteor",
        "trunk-iron-bastion",
        "flame-pyroclasm",
        "flame-inferno",
        "flame-cinder-heart",
        MN,
      ],
      rotation: ["immolate", MS, "meteor", "inferno", "corrupt"],
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
  const heirloom = HEIRLOOM[weapon] ?? { innate: "", keystone: "" };
  const forks = heirloom.forks?.[path];
  return {
    id: `${weapon}-${path}`,
    name: `${title(path)} ${title(weapon)}`,
    classId,
    weapon,
    heirloom: {
      ...(heirloom.heat ? { heat: heirloom.heat } : {}),
      innate: heirloom.innate,
      keystone: heirloom.keystone,
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
