export interface BalanceArgs {
  runs: number;
  seed: number;
}

const DEFAULTS: BalanceArgs = { runs: 1000, seed: 1 };

/** Parses `--runs 1000 --seed 42` style arguments. */
export function parseArgs(argv: readonly string[]): BalanceArgs {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag !== "--runs" && flag !== "--seed") {
      throw new Error(`Unknown argument: ${flag}`);
    }
    const n = Number(value);
    if (value === undefined || !Number.isInteger(n) || n < 0) {
      throw new Error(`${flag} expects a non-negative integer`);
    }
    args[flag === "--runs" ? "runs" : "seed"] = n;
    i++;
  }
  return args;
}
