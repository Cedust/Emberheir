export interface BalanceArgs {
  runs: number;
  seed: number;
  /** Hero weapon id, e.g. "sword". */
  weapon: string;
  /** Rotation skill ids; empty = the weapon's Start Skill. */
  skills: string[];
  /** Enemy id, or "all" for every Act 1 enemy. */
  enemy: string;
  /** Hero level and Monster Level. */
  level: number;
}

const DEFAULTS: BalanceArgs = {
  runs: 1000,
  seed: 1,
  weapon: "all",
  skills: [],
  enemy: "all",
  level: 1,
};

const NUMBER_FLAGS = { "--runs": "runs", "--seed": "seed", "--level": "level" } as const;
const STRING_FLAGS = { "--weapon": "weapon", "--enemy": "enemy" } as const;

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
    } else if (flag === "--skills") {
      if (!value || value.startsWith("--")) throw new Error(`${flag} expects a value`);
      args.skills = value.split(",").filter(Boolean);
    } else {
      throw new Error(`Unknown argument: ${flag}`);
    }
  }
  if (args.level < 1) throw new Error("--level must be at least 1");
  return args;
}
