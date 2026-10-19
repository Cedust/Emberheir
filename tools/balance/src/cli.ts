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
import { BUILDS, withMainMastery } from "./builds";
import { type BudgetRow, LAYERS, buildBudget, meanBudget } from "./budget";
import { simulateMatchup } from "./simulate";
import { type PowerSample, powerCurve, powerProbe } from "./curve";
import { PLAYTIME, median, runMinutes } from "./playtime";

const args = parseArgs(process.argv.slice(2));

if (args.budget > 0) {
  runBudgetMode();
  process.exit(0);
}
if (args.wildfire > 0) args.finale = 1;
if (args.act > 0 || args.finale > 0) {
  runActMode();
  process.exit(0);
}

/**
 * `--budget 1`: every chosen build (`--class`, `--build`, `--mastery` as in act mode) at the end
 * of the game against a training dummy: damage per second, where it comes from and what each
 * layer multiplies it by (balancing-neustart-v1.md, step 1).
 */
function runBudgetMode(): void {
  const runs = Math.max(1, Math.min(args.runs, 20));
  console.log(
    `${GAME_TITLE} balance tool (sim ${SIM_VERSION}), damage budget at the end of the game`,
  );
  console.log(`seeds=${args.seed}..${args.seed + runs - 1} (random Epic gear each), 30 s dummy`);
  console.log("factor = damage with the layer / without it; DA = Default Attack");
  const classIds = new Set(
    args.class === "all" ? GAME_DATA.classes.map((c) => c.id) : [args.class],
  );
  const plans = BUILDS.filter(
    (b) =>
      classIds.has(b.classId) &&
      (!args.build || args.build === "all" || b.id === args.build) &&
      (args.weapon === "all" || b.weapon === args.weapon),
  ).flatMap((b) => {
    if (!args.mastery) return [b];
    const masteries =
      args.mastery === "all"
        ? (GAME_DATA.classes.find((c) => c.id === b.classId)?.branches ?? [])
        : [args.mastery];
    return masteries.map((m) => withMainMastery(b, m));
  });
  if (!plans.length) throw new Error("No build matches");
  const pct = (x: number) => `${Math.round(100 * x)}`;
  const rows: { classId: string; budget: BudgetRow }[] = [];
  const table = plans.map((plan) => {
    const budget = meanBudget(
      Array.from({ length: runs }, (_, i) => buildBudget(GAME_DATA, plan, args.seed + i)),
    );
    rows.push({ classId: plan.classId, budget });
    return {
      build: plan.id,
      mastery: plan.masteries[0] ?? "-",
      "dps k": (budget.dps / 1000).toFixed(1),
      "life k": (budget.life / 1000).toFixed(1),
      "barrier k": (budget.barrier / 1000).toFixed(1),
      "DA %": pct(budget.shares.defaultAttack),
      "innate %": pct(budget.shares.innate),
      "skills %": pct(budget.shares.skills),
      "DoT %": pct(budget.shares.dots),
      "other %": pct(budget.shares.other),
      ...Object.fromEntries(LAYERS.map((l) => [`×${l}`, budget.factors[l].toFixed(2)])),
    };
  });
  console.table(table);
  const summary = [...classIds].map((classId) => {
    const own = rows.filter((r) => r.classId === classId).map((r) => r.budget);
    const dps = own.map((b) => b.dps);
    const geo = (f: (b: BudgetRow) => number) =>
      Math.exp(own.reduce((a, b) => a + Math.log(f(b)), 0) / Math.max(1, own.length));
    return {
      class: classId,
      builds: own.length,
      "dps k mean": (dps.reduce((a, b) => a + b, 0) / Math.max(1, dps.length) / 1000).toFixed(1),
      "dps max/min": (Math.max(...dps) / Math.min(...dps)).toFixed(2),
      "DA+innate %": pct(
        own.reduce((a, b) => a + b.shares.defaultAttack + b.shares.innate, 0) /
          Math.max(1, own.length),
      ),
      ...Object.fromEntries(LAYERS.map((l) => [`×${l}`, geo((b) => b.factors[l]).toFixed(2)])),
    };
  });
  console.log("");
  console.log("Per class (factors as geometric means)");
  console.table(summary);
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
  const samples: PowerSample[] = [];
  const probe = args.curve ? powerProbe(GAME_DATA, samples) : undefined;
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
        ...(probe ? { onFight: probe } : {}),
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
  printNewestActs(byPlay, generations, runs);
  if (probe) printCurve(samples);
  if (args.json) {
    writeFileSync(args.json, JSON.stringify({ args, plays: byPlay }, null, 1));
    console.log(`reports written to ${args.json}`);
  }
}

/**
 * `--curve 1`: the hero's power per Monster Level next to the monsters it meets (balancing-neustart
 * step 3), all stages and newest acts on their own.
 */
function printCurve(samples: readonly PowerSample[]): void {
  const k = (x: number) => (x / 1000).toFixed(x < 10_000 ? 2 : 0);
  const table = (own: readonly PowerSample[]) =>
    powerCurve(own).map((r) => ({
      ML: `${r.from}-${r.to}`,
      samples: r.samples,
      "hero lvl": r.heroLevel,
      "dps k": k(r.dps),
      "eff. life k": k(r.effectiveLife),
      "enemy life / dps s": r.lifeOverDps.toFixed(1),
      "eff. life / enemy dmg": r.ehpOverDamage.toFixed(0),
    }));
  console.log("");
  console.log("Hero power per Monster Level (medians), all sampled stages");
  console.table(table(samples));
  console.log("Newest acts only, bosses");
  console.table(table(samples.filter((s) => s.newest && s.kind === "boss")));
  console.log("Newest acts only, normal stages");
  console.table(table(samples.filter((s) => s.newest && s.kind === "normal")));
}

/**
 * The newest act of each run (where the run's tension sits): attempts, where the hero dies and
 * how long fights last per stage kind, per build and for all builds, with the targets of
 * neuausrichtung-v1.md 5.3 and 5.5 (✓ inside, ↑ too low, ↓ too high).
 */
function printNewestActs(
  byPlay: readonly { label: string; reports: readonly ActRunReport[] }[],
  generations: number,
  seeds: number,
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
  printPlaytime(byPlay, generations, seeds);
}

/**
 * Playtime per run (laengere-runs-v1.md): all acts of the run, fight seconds plus the time between
 * fights and trips (`PLAYTIME`), median and range over the builds.
 */
function printPlaytime(
  byPlay: readonly { label: string; reports: readonly ActRunReport[] }[],
  generations: number,
  seeds: number,
): void {
  const rows = [];
  let total = 0;
  for (let g = 1; g <= generations; g++) {
    const minutes = byPlay.map((p) => runMinutes(p.reports, g, seeds)).filter((m) => m > 0);
    if (!minutes.length) continue;
    const mid = median(minutes);
    total += mid;
    rows.push({
      run: g,
      "median min": mid.toFixed(0),
      "min / max": `${Math.min(...minutes).toFixed(0)} / ${Math.max(...minutes).toFixed(0)}`,
      "total h": (total / 60).toFixed(1),
    });
  }
  console.log("");
  console.log(
    `Playtime per run (fights + ${PLAYTIME.perFight} s per fight + ${PLAYTIME.perTrip} s per trip; stuck builds count too low)`,
  );
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
