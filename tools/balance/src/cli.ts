import {
  ACT1_ENEMIES,
  ACT2_ENEMIES,
  ACT2,
  ACT1,
  GAME_TITLE,
  GAME_DATA,
  HERO_SKILLS,
  HERO_WEAPONS,
  createHeroSetup,
  rollGear,
} from "@emberheir/content";
import { PROGRESSION, Rng, SIM_VERSION, createEnemySetup } from "@emberheir/sim";
import { GEAR_MODES, type GearMode, parseArgs } from "./args";
import { writeFileSync } from "node:fs";
import { type ActRunReport, playGenerations, summarizeActRuns } from "./act";
import { isNewestAct, stageKindRow, summarizeStageKinds } from "./newest";
import { BUILDS } from "./builds";
import { simulateMatchup } from "./simulate";

const args = parseArgs(process.argv.slice(2));

if (args.wildfire > 0) args.finale = 1;
if (args.act > 0 || args.finale > 0) {
  runActMode();
  process.exit(0);
}

/**
 * `--act 2`: plays the run from Act 1 up to that act with an autopilot (loot, flask, deaths),
 * per starter weapon (`--weapon axe` also plays a weapon that only drops).
 */
function runActMode(): void {
  if (args.finale) args.act = Math.max(args.act, 7);
  const last = GAME_DATA.acts.find((a) => a.number === args.act);
  if (!last) throw new Error(`Act ${args.act} is not playable yet`);
  const runs = Math.min(args.runs, 500);
  // Run n has acts 1..n, so reaching act N takes N runs (prestige-acts-v1.md).
  const generations = args.finale
    ? PROGRESSION.finalPrestige
    : Math.max(args.generations, last.number);
  console.log(`${GAME_TITLE} balance tool (sim ${SIM_VERSION}), act mode`);
  console.log(
    `up to act=${last.name} runs=${runs} seed=${args.seed} attempts=${args.attempts} generations=${generations} runes=${args.runes ? "on" : "off"}`,
  );
  console.log("");
  const rows = [];
  const classes =
    args.class === "all" ? GAME_DATA.classes : GAME_DATA.classes.filter((c) => c.id === args.class);
  if (!classes.length) throw new Error(`Unknown class "${args.class}"`);
  const classIds = new Set(classes.map((c) => c.id));
  // One autopilot build per start weapon, or the chosen builds (`--build storm`, `--build all`),
  // each with its own main Mastery or the chosen ones (`--mastery all`: the class's three).
  const chosen: { weapon: string; build?: string }[] = args.build
    ? BUILDS.filter(
        (b) =>
          (args.build === "all" ? classIds.has(b.classId) : b.id === args.build) &&
          (args.weapon === "all" || b.weapon === args.weapon),
      ).map((b) => ({ weapon: b.weapon, build: b.id }))
    : (args.weapon === "all" ? classes.flatMap((c) => c.weapons) : [args.weapon]).map((weapon) => ({
        weapon,
      }));
  if (!chosen.length) throw new Error(`Unknown build "${args.build}"`);
  const plays = chosen.flatMap((p) => {
    if (!args.mastery) return [p];
    const masteries =
      args.mastery === "all"
        ? (GAME_DATA.classes.find((c) => c.weapons.includes(p.weapon))?.branches ?? [])
        : [args.mastery];
    return masteries.map((mastery) => ({ ...p, mastery }));
  });
  const byPlay: { label: string; reports: ActRunReport[] }[] = [];
  for (const { weapon: starterWeapon, build, mastery } of plays as {
    weapon: string;
    build?: string;
    mastery?: string;
  }[]) {
    const label = `${build ? `${starterWeapon} (${build})` : starterWeapon}${mastery ? ` ${mastery}` : ""}`;
    const all = Array.from({ length: runs }, (_, i) =>
      playGenerations(GAME_DATA, {
        seed: args.seed + i,
        starterWeapon,
        ...(build ? { build } : {}),
        ...(mastery ? { mastery } : {}),
        upToAct: last.number,
        maxAttempts: args.attempts,
        generations,
        finale: args.finale > 0,
        wildfire: args.wildfire,
        runes: args.runes > 0,
      }),
    ).flat();
    byPlay.push({ label, reports: all });
    const finale = GAME_DATA.finale;
    for (let tier = 1; tier <= args.wildfire; tier++) {
      const reports = all.filter((x) => x.act === 100 + tier);
      if (!reports.length) continue;
      const s = summarizeActRuns(reports);
      rows.push({
        weapon: label,
        gen: `W${tier}`,
        act: ((tier - 1) % GAME_DATA.acts.length) + 1,
        runs: reports.length,
        "cleared %": (s.clearRate * 100).toFixed(0),
        "deaths before clear": s.avgDeaths.toFixed(1),
        "1st fight lost %": "-",
        "% deaths at boss": (s.bossDeathShare * 100).toFixed(0),
        "level at boss": s.avgLevelAtBoss.toFixed(1),
        "avg fight s": s.avgFightSeconds.toFixed(1),
        "p90 fight s": s.p90FightSeconds.toFixed(1),
        "boss fight s": s.avgBossSeconds.toFixed(1),
        "elites / run": s.avgElites.toFixed(1),
        "thief caught %": "-",
        "top killer": s.topKiller,
      });
    }
    for (let g = 1; g <= generations + 1; g++) {
      const acts = g > generations ? (finale ? [finale] : []) : GAME_DATA.acts;
      for (const act of acts.filter((a) => g > generations || a.number <= last.number)) {
        const reports = all.filter((x) => x.generation === g && x.act === act.number);
        if (!reports.length) continue;
        const s = summarizeActRuns(reports);
        rows.push({
          weapon: label,
          gen: g,
          act: act.number,
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
          "thief caught %": s.avgThieves ? (s.thiefCatchRate * 100).toFixed(0) : "-",
          "top killer": s.topKiller,
        });
      }
    }
  }
  if (!args.newest) console.table(rows);
  printNewestActs(byPlay, generations);
  if (args.json) {
    writeFileSync(args.json, JSON.stringify({ args, plays: byPlay }, null, 1));
    console.log(`reports written to ${args.json}`);
  }
}

/**
 * The newest act of each run (where the run's tension sits): attempts, where the hero dies and
 * how long fights last per stage kind, per build and for all builds, with the targets of
 * neuausrichtung-v1.md 5.3 and 5.5 (✓ inside, ↑ too low, ↓ too high).
 */
function printNewestActs(
  byPlay: readonly { label: string; reports: readonly ActRunReport[] }[],
  generations: number,
): void {
  const perBuild = [];
  for (const { label, reports } of byPlay) {
    for (let g = 1; g <= generations; g++) {
      const newest = reports.filter((r) => r.generation === g && isNewestAct(r));
      if (newest.length) {
        perBuild.push({
          build: label,
          act: g,
          ...stageKindRow(summarizeStageKinds(newest), false),
        });
      }
    }
  }
  console.log("");
  console.log("Newest act per run, by build (deaths and fight seconds per stage kind)");
  console.table(perBuild);
  const all = byPlay.flatMap((p) => p.reports);
  const pooled = [];
  for (let g = 1; g <= generations; g++) {
    const newest = all.filter((r) => r.generation === g && isNewestAct(r));
    const older = all.filter((r) => r.generation === g && r.act < g);
    if (newest.length) {
      pooled.push({ act: `${g} newest`, ...stageKindRow(summarizeStageKinds(newest), true) });
    }
    if (older.length) {
      pooled.push({
        act: `1-${g - 1} in run ${g}`,
        ...stageKindRow(summarizeStageKinds(older), false),
      });
    }
  }
  const newestAll = all.filter((r) => r.generation <= generations && isNewestAct(r));
  if (newestAll.length) {
    pooled.push({ act: "all newest", ...stageKindRow(summarizeStageKinds(newestAll), true) });
  }
  console.log("");
  console.log("All builds pooled (targets: ✓ inside, ↑ too low, ↓ too high)");
  console.table(pooled);
}

const pick = <T extends { id: string }>(list: readonly T[], id: string, what: string): T[] => {
  if (id === "all") return [...list];
  const found = list.find((x) => x.id === id);
  if (!found)
    throw new Error(`Unknown ${what} "${id}". Known: ${list.map((x) => x.id).join(", ")}`);
  return [found];
};

const weapons = pick(HERO_WEAPONS, args.weapon, "weapon");
const enemies = pick([...ACT1_ENEMIES, ACT1.boss, ...ACT2_ENEMIES, ACT2.boss], args.enemy, "enemy");
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
