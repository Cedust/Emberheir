import {
  ACT1_ENEMIES,
  GAME_TITLE,
  GAME_DATA,
  HERO_SKILLS,
  HERO_WEAPONS,
  createHeroSetup,
  rollGear,
} from "@emberheir/content";
import { Rng, SIM_VERSION, createEnemySetup } from "@emberheir/sim";
import { GEAR_MODES, type GearMode, parseArgs } from "./args";
import { playGenerations, summarizeActRuns } from "./act";
import { simulateMatchup } from "./simulate";

const args = parseArgs(process.argv.slice(2));

if (args.act > 0) {
  runActMode();
  process.exit(0);
}

/** `--act 1`: plays whole acts with an autopilot (loot, flask, deaths) per starter weapon. */
function runActMode(): void {
  const act = GAME_DATA.acts.find((a) => a.number === args.act);
  if (!act) throw new Error(`Act ${args.act} is not in the PoC`);
  const runs = Math.min(args.runs, 500);
  console.log(`${GAME_TITLE} balance tool (sim ${SIM_VERSION}), act mode`);
  console.log(
    `act=${act.name} runs=${runs} seed=${args.seed} attempts=${args.attempts} generations=${args.generations}`,
  );
  console.log("");
  const rows = [];
  for (const starterWeapon of GAME_DATA.starterWeapons) {
    if (args.weapon !== "all" && args.weapon !== starterWeapon) continue;
    const runsByGeneration = Array.from({ length: runs }, (_, i) =>
      playGenerations(GAME_DATA, {
        seed: args.seed + i,
        starterWeapon,
        actId: act.id,
        maxAttempts: args.attempts,
        generations: args.generations,
      }),
    );
    for (let g = 1; g <= args.generations; g++) {
      const reports = runsByGeneration.flatMap((r) => r.filter((x) => x.generation === g));
      const s = summarizeActRuns(reports);
      rows.push({
        weapon: starterWeapon,
        gen: g,
        runs: reports.length,
        "cleared %": (s.clearRate * 100).toFixed(0),
        "deaths before clear": s.avgDeaths.toFixed(1),
        "1st fight lost %": (s.firstFightLossRate * 100).toFixed(1),
        "% deaths at boss": (s.bossDeathShare * 100).toFixed(0),
        "level at boss": s.avgLevelAtBoss.toFixed(1),
        "avg fight s": s.avgFightSeconds.toFixed(1),
        "p90 fight s": s.p90FightSeconds.toFixed(1),
        "boss fight s": s.avgBossSeconds.toFixed(1),
        "elites / run": s.avgElites.toFixed(1),
      });
    }
  }
  console.table(rows);
}

const pick = <T extends { id: string }>(list: readonly T[], id: string, what: string): T[] => {
  if (id === "all") return [...list];
  const found = list.find((x) => x.id === id);
  if (!found)
    throw new Error(`Unknown ${what} "${id}". Known: ${list.map((x) => x.id).join(", ")}`);
  return [found];
};

const weapons = pick(HERO_WEAPONS, args.weapon, "weapon");
const enemies = pick(ACT1_ENEMIES, args.enemy, "enemy");
const skills = args.skills.flatMap((id) => pick(HERO_SKILLS, id, "skill"));
const gearModes: Exclude<GearMode, "all">[] =
  args.gear === "all" ? GEAR_MODES.filter((g) => g !== "all" && g !== "mixed") : [args.gear];
const itemLevel = args.ilvl || args.level;

console.log(`${GAME_TITLE} balance tool (sim ${SIM_VERSION})`);
console.log(
  `runs=${args.runs} seed=${args.seed} level=${args.level} gear=${args.gear} ilvl=${itemLevel}`,
);
console.log("");

/** Gear is rolled from its own seed stream so it does not shift the fight seeds. */
const GEAR_SEED_OFFSET = 1_000_003;

const rows = [];
for (const weapon of weapons) {
  for (const gear of gearModes) {
    const hero = (run: number) =>
      createHeroSetup({
        weapon,
        level: args.level,
        ...(skills.length ? { skills } : {}),
        ...(gear === "none"
          ? {}
          : {
              equipment: rollGear(
                { weaponBaseId: weapon.id, rarity: gear, itemLevel },
                new Rng(args.seed + run + GEAR_SEED_OFFSET),
              ),
            }),
      });
    const plan = hero(0)
      .rotation.map((s) => s.skill.name)
      .join(" > ");
    for (const enemy of enemies) {
      const r = simulateMatchup(hero, createEnemySetup(enemy, args.level), args.runs, args.seed);
      rows.push({
        hero: `${weapon.name} [${plan}]`,
        gear,
        enemy: enemy.name,
        "win %": r.runs ? ((r.wins / r.runs) * 100).toFixed(1) : "-",
        draws: r.draws,
        "avg s": r.avgDuration.toFixed(1),
        "life left %": (r.avgLifeLeftOnWin * 100).toFixed(0),
      });
    }
  }
}
console.table(rows);
