import {
  ACT1_ENEMIES,
  GAME_TITLE,
  HERO_SKILLS,
  HERO_WEAPONS,
  createHeroSetup,
  rollPocGear,
} from "@emberheir/content";
import { Rng, SIM_VERSION, createEnemySetup } from "@emberheir/sim";
import { GEAR_MODES, type GearMode, parseArgs } from "./args";
import { simulateMatchup } from "./simulate";

const args = parseArgs(process.argv.slice(2));

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
              equipment: rollPocGear(
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
