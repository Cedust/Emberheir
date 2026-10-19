export interface BalanceArgs {
  runs: number;
  seed: number;
  /** Hero weapon id, e.g. "sword". */
  weapon: string;
  /** Act mode: class id (all its start weapons) or "all". */
  class: string;
  /** Act mode: autopilot build id, "all" (every build of the class) or "" (one per weapon). */
  build: string;
  /** Act mode: main Mastery id, "all" (each of the class's three in turn) or "" (the build's). */
  mastery: string;
  /** Rotation skill ids; empty = the weapon's Start Skill. */
  skills: string[];
  /** Enemy id, or "all" for every Act 1 enemy. */
  enemy: string;
  /** Hero level and Monster Level. */
  level: number;
  /** Gear per fight: none, one rarity, "mixed" (random rarity per item) or "all" (compare). */
  gear: GearMode;
  /** Item Level of rolled gear; 0 = same as --level. */
  ilvl: number;
  /** Act number to play with the autopilot (whole runs incl. loot and deaths); 0 = off. */
  act: number;
  /** Act mode: attempts (deaths + 1) before a run counts as stuck. */
  attempts: number;
  /** Act mode: generations to play; each one after the first starts with a Prestige. */
  generations: number;
  /** Act mode: 1 = play all ten runs, the final Prestige and The Last Ember. */
  finale: number;
  /** Act mode: after The Last Ember, climb Wildfire up to this tier (implies --finale). */
  wildfire: number;
  /** Act mode: 1 = the autopilot uses Runes and Runewords (default), 0 = it leaves them. */
  runes: number;
  /** Act mode: 1 = only the newest-act tables (deaths and fight lengths per stage kind). */
  newest: number;
  /** Act mode: write every report as JSON to this file ("" = none). */
  json: string;
  /**
   * 1 = damage budget per build at the end of the game (where the damage comes from, what each
   * layer is worth); `--runs` seeds of random gear each.
   */
  budget: number;
  /**
   * Act mode: 1 = also measure the hero's power along the game (damage per second, effective Life
   * per Monster Level) next to the monsters it meets.
   */
  curve: number;
}

export const GEAR_MODES = ["none", "normal", "magic", "rare", "epic", "mixed", "all"] as const;
export type GearMode = (typeof GEAR_MODES)[number];

const DEFAULTS: BalanceArgs = {
  runs: 1000,
  seed: 1,
  weapon: "all",
  class: "all",
  build: "",
  mastery: "",
  skills: [],
  enemy: "all",
  level: 1,
  gear: "none",
  ilvl: 0,
  act: 0,
  attempts: 30,
  generations: 1,
  finale: 0,
  wildfire: 0,
  runes: 1,
  newest: 0,
  json: "",
  budget: 0,
  curve: 0,
};

const NUMBER_FLAGS = {
  "--runs": "runs",
  "--seed": "seed",
  "--level": "level",
  "--ilvl": "ilvl",
  "--act": "act",
  "--attempts": "attempts",
  "--generations": "generations",
  "--finale": "finale",
  "--wildfire": "wildfire",
  "--runes": "runes",
  "--newest": "newest",
  "--budget": "budget",
  "--curve": "curve",
} as const;
const STRING_FLAGS = {
  "--weapon": "weapon",
  "--enemy": "enemy",
  "--class": "class",
  "--build": "build",
  "--mastery": "mastery",
  "--json": "json",
} as const;

/** Parses `--runs 1000 --seed 42 --weapon sword --skills power-strike,flurry` style arguments. */
export function parseArgs(argv: readonly string[]): BalanceArgs {
  const args: BalanceArgs = { ...DEFAULTS, skills: [] };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i] ?? "";
    const value = argv[i + 1];
    if (flag in NUMBER_FLAGS) {
      const n = Number(value);
      if (value === undefined || !Number.isInteger(n) || n < 0) {
        throw new Error(`${flag} expects a non-negative integer`);
      }
      args[NUMBER_FLAGS[flag as keyof typeof NUMBER_FLAGS]] = n;
    } else if (flag in STRING_FLAGS) {
      if (!value || value.startsWith("--")) throw new Error(`${flag} expects a value`);
      args[STRING_FLAGS[flag as keyof typeof STRING_FLAGS]] = value;
    } else if (flag === "--gear") {
      if (!GEAR_MODES.includes(value as GearMode)) {
        throw new Error(`--gear expects one of ${GEAR_MODES.join(", ")}`);
      }
      args.gear = value as GearMode;
    } else if (flag === "--skills") {
      if (!value || value.startsWith("--")) throw new Error(`${flag} expects a value`);
      args.skills = value.split(",").filter(Boolean);
    } else {
      throw new Error(`Unknown argument: ${flag}`);
    }
  }
  if (args.level < 1) throw new Error("--level must be at least 1");
  if (args.generations < 1) throw new Error("--generations must be at least 1");
  return args;
}
