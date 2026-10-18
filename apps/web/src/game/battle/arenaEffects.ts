import { type PayoffKind, type PerkId } from "@emberheir/sim";
import { type Burst } from "./fx";

/** How each skill, Perk and ailment looks in the arena (the effect tables of `ArenaScene`). */

/** Original damage-type colors (ui-look-v1.md): the arena uses them in both modes. */
export const DAMAGE_COLORS: Record<string, number> = {
  physical: 0xc9c2b8,
  fire: 0xff6a2b,
  cold: 0x6fd3ff,
  lightning: 0xffe14d,
  void: 0xa35cff,
  burn: 0xff6a2b,
  chill: 0x6fd3ff,
  shock: 0xffe14d,
  bleed: 0xe0314b,
  poison: 0xb5d82c,
  corruption: 0xa35cff,
  heal: 0x4fe08a,
  barrier: 0xe8e2d6,
  miss: 0xd8d0c4,
  trigger: 0xf0b44c,
};

export const AILMENT_TINT: Record<string, number> = {
  burn: 0xff8a5a,
  chill: 0x9fe0ff,
  shock: 0xfff08a,
  bleed: 0xff9a9a,
  poison: 0xc4f0a0,
  corruption: 0xc9a0ff,
};

/** How a hit travels: melee slashes, arrows, glowing orbs, lightning, meteors or a burst on the target. */
export type Delivery = "slash" | "arrow" | "orb" | "bolt" | "fall" | "nova";

/** Skills with their own look; everything else follows the attacker's weapon. */
export const SKILL_FX: Record<string, Delivery> = {
  "Ice Lance": "orb",
  "Chain Lightning": "bolt",
  Meteor: "fall",
  "Toxic Burst": "nova",
  Immolate: "nova",
  Corrupt: "orb",
  "Soul Harvest": "nova",
  "Piercing Shot": "arrow",
  "Barbed Arrow": "arrow",
  "Heavy Bolt": "arrow",
  "Plague Cloud": "nova",
  Thunderstrike: "bolt",
  "Frost Nova": "nova",
  Inferno: "nova",
  "Void Rift": "nova",
  "Void Bolt": "orb",
  "Cinder Spit": "orb",
  "Blight Spit": "orb",
  "Rot Spray": "orb",
  Fireball: "orb",
  Eruption: "fall",
  "Ice Bolt": "orb",
  Avalanche: "fall",
  "Forked Bolt": "bolt",
  Thunderclap: "nova",
  "Void Lance": "orb",
  Hex: "orb",
  Consume: "nova",
  "Rift Snap": "nova",
  "Soul Reap": "nova",
  Ashfall: "fall",
  "The Last Harvest": "nova",
  "Flame Dash": "slash",
  "Arc Dash": "slash",
  Pounce: "slash",
};

export const RISE = -Math.PI / 2;

/**
 * Breakpoint Perks (attribute-v1.md): each one that fires gets its own flash. `on` says whether it
 * lands on the Perk's owner or on the foe; `name` floats the Perk's name for the rare ones.
 */
export const PERK_FX: Record<
  PerkId,
  {
    color: readonly number[];
    on: "self" | "foe";
    look: "flakes" | "ring" | "rise" | "wind" | "star";
    name?: boolean;
  }
> = {
  armorbreaker: { color: [0x9a9088, 0x6b625a], on: "foe", look: "flakes" },
  stoneguard: { color: [0xc9c2b8], on: "self", look: "ring" },
  titan: { color: [0xffd84a, 0xffb13b], on: "foe", look: "star", name: true },
  hawkeye: { color: [0xffffff], on: "foe", look: "ring" },
  opportunist: { color: [0xffd84a, 0xfff2b0], on: "foe", look: "star" },
  trueShot: { color: [0xffffff, 0xffe9a8], on: "foe", look: "star", name: true },
  attuned: { color: [0x5b8cff], on: "self", look: "ring" },
  elementalSurge: { color: [0x8a5bff, 0x5b8cff], on: "foe", look: "star" },
  spellfire: { color: [0x5b8cff, 0xb8d0ff], on: "self", look: "ring", name: true },
  quickReflexes: { color: [0xd8f0c8, 0xa8d8a0], on: "self", look: "wind", name: true },
  emberDance: { color: [0xffb13b, 0xffd84a], on: "self", look: "wind" },
  doubleTime: { color: [0xffd84a, 0xffffff], on: "self", look: "ring", name: true },
  innerFire: { color: [0xff8a3a, 0xffb13b], on: "self", look: "rise", name: true },
  afterglow: { color: [0xff8a3a, 0xffd84a], on: "self", look: "rise" },
  clarity: { color: [0xa35cff], on: "foe", look: "ring" },
  secondBreath: { color: [0x4fe08a, 0xffb13b], on: "self", look: "rise", name: true },
  thickSkin: { color: [0x9a9088], on: "self", look: "ring" },
  undying: { color: [0xff4a2a, 0xffd84a], on: "self", look: "star", name: true },
};

/**
 * Ailment payoffs and Class Traits (ailments-v2.md 3.1, neuausrichtung-v1.md 2.1): the "hits" of a
 * DoT build get a big moment, the traits a small sign. `on` is where it shows, `name` floats it.
 */
export const PAYOFF_FX: Record<
  PayoffKind,
  {
    color: readonly number[];
    on: "self" | "foe";
    look: "pop" | "flare" | "implode" | "ring" | "star" | "rift" | "arc";
    shake?: number;
    /** No floating name: it happens too often (Conduction). */
    quiet?: boolean;
  }
> = {
  overflow: { color: [0xb5d82c, 0xe8ff7a, 0x6f9a10], on: "foe", look: "pop", shake: 0.15 },
  combust: { color: [0xff6a2b, 0xffd84a, 0xfff1c9], on: "foe", look: "flare", shake: 0.2 },
  collapse: { color: [0xa35cff, 0x3a1a6a, 0xe0c8ff], on: "foe", look: "implode", shake: 0.3 },
  ironBlood: { color: [0xc9c2b8, 0xff8a3a], on: "self", look: "ring" },
  keenEye: { color: [0xffffff, 0xffe9a8], on: "foe", look: "star" },
  spark: { color: [0x5b8cff, 0xffe14d], on: "foe", look: "star" },
  // Starfall: a white-violet tear of light where the Spark crits; built-up Crits break the same way.
  flashpoint: { color: [0xd2b8ff, 0xffffff, 0x8a5cff], on: "foe", look: "rift", shake: 0.15 },
  criticalMass: { color: [0xb48cff, 0xffffff, 0xd2b8ff], on: "foe", look: "rift", shake: 0.1 },
  // Storm: a small arc of lightning runs from the Shocked enemy back into the Wand.
  conduction: { color: [0xfff08a, 0xffffff], on: "foe", look: "arc", quiet: true },
};

/** Floating names of the payoffs. */
export const PAYOFF_NAMES: Record<PayoffKind, string> = {
  overflow: "Overflow",
  combust: "Combust",
  collapse: "Collapse",
  ironBlood: "Iron Blood",
  keenEye: "Keen Eye",
  spark: "Spellcharge",
  flashpoint: "Flashpoint",
  criticalMass: "Critical Mass",
  conduction: "Conduction",
};

const FALL = Math.PI / 2;

/** Particles that hang around a fighter while an ailment is on them. */
export const AILMENT_FX: Record<string, Omit<Burst, "x" | "y" | "count">> = {
  sunder: {
    kind: "bit",
    color: [0x8a8f96, 0x5e5750],
    angle: [FALL - 0.4, FALL + 0.4],
    speed: [30, 80],
    gravity: 400,
    life: [0.4, 0.8],
    size: [5, 9],
    spin: 5,
    spreadX: 60,
    spreadY: 100,
  },
  burn: {
    color: [0xff6a2b, 0xffb13b],
    angle: [RISE - 0.3, RISE + 0.3],
    speed: [60, 130],
    life: [0.4, 0.8],
    size: [19, 35],
    spreadX: 50,
    spreadY: 90,
    wobble: 8,
  },
  chill: {
    kind: "bit",
    color: [0x9fe0ff, 0xffffff],
    angle: [FALL - 0.6, FALL + 0.6],
    speed: [20, 50],
    life: [0.8, 1.4],
    size: [10, 16],
    endSize: 0.6,
    spin: 3,
    spreadX: 60,
    spreadY: 120,
  },
  shock: {
    color: 0xffe14d,
    speed: [250, 450],
    life: [0.08, 0.16],
    size: [8, 13],
    stretch: 0.8,
    spreadX: 50,
    spreadY: 110,
  },
  bleed: {
    kind: "bit",
    color: [0xe0314b, 0xa01830],
    angle: [FALL - 0.3, FALL + 0.3],
    speed: [20, 60],
    gravity: 500,
    life: [0.5, 0.8],
    size: [10, 14],
    endSize: 0.7,
    spreadX: 40,
    spreadY: 70,
  },
  poison: {
    color: [0xb5d82c, 0xd8f06a],
    angle: [RISE - 0.4, RISE + 0.4],
    speed: [20, 50],
    life: [0.8, 1.3],
    size: [13, 22],
    wobble: 10,
    spreadX: 55,
    spreadY: 110,
  },
  corruption: {
    color: [0xa35cff, 0x6a3ad8],
    angle: [RISE - 0.6, RISE + 0.6],
    speed: [15, 40],
    life: [0.8, 1.4],
    size: [19, 35],
    endSize: 0.05,
    spreadX: 60,
    spreadY: 120,
  },
};
