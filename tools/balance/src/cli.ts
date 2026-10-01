import { GAME_TITLE } from "@emberheir/content";
import { Rng, SIM_VERSION } from "@emberheir/sim";
import { parseArgs } from "./args";

// M0 placeholder: proves the CLI can drive the simulation package.
// From M1/M2 on this runs real fights, e.g. "1000 fights, build X vs. Gorrak".
const { runs, seed } = parseArgs(process.argv.slice(2));
const rng = new Rng(seed);

let sum = 0;
for (let i = 0; i < runs; i++) sum += rng.next();

console.log(`${GAME_TITLE} balance tool (sim ${SIM_VERSION})`);
console.log(`runs=${runs} seed=${seed}`);
console.log(`placeholder: mean roll ${runs ? (sum / runs).toFixed(4) : "n/a"}`);
