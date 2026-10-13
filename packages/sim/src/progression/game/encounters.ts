import { createEnemySetup, type EnemyDefinition } from "../../combat/monsters";
import { recordFight, type FightRecording } from "../../combat/recording";
import { type CombatantSetup } from "../../combat/types";
import { Rng } from "../../rng";
import { PROGRESSION } from "../constants";
import { applyEliteModifiers, type EliteModifier } from "../elites";
import { type EnemyRank } from "../leveling";
import { finaleEchoes, getAct, harvestAct, stageMonsterLevel } from "./acts";
import { heroSetup } from "./hero-build";
import {
  fail,
  GameActionError,
  type ActData,
  type Encounter,
  type GameData,
  type GameState,
} from "./state";

/** Who the hero fights at a stage, and the fight itself (simulated once, when it starts). */

/** The enemy of an encounter: the act's enemy or boss, or the Ember Thief. */
export function encounterEnemy(
  encounter: Encounter,
  act: ActData,
  data: GameData,
): EnemyDefinition {
  if (encounter.thief) return data.thief ?? fail("No Ember Thief in this game");
  if (encounter.echo) return findEnemy(getAct(data, encounter.echo), encounter.enemyId);
  return findEnemy(act, encounter.enemyId);
}

function findEnemy(act: ActData, id: string): EnemyDefinition {
  const enemy = act.boss.id === id ? act.boss : act.enemies.find((e) => e.id === id);
  if (!enemy) throw new GameActionError(`Unknown enemy "${id}" in ${act.id}`);
  return enemy;
}

/**
 * The abilities an act boss has in a run: one more per Prestige, from the second run after its
 * act opened (Playtest 2: the first boss of a run is where a hero who left off below the Level
 * Cap catches up, one ability more was a wall). The Harvester has none: its three phases already
 * grow with the run.
 */
export function bossAbilities(data: GameData, act: ActData, prestige: number): EliteModifier[] {
  const list = data.bossAbilities ?? [];
  if (act.boss.archetype === "harvester") return [];
  const count = Math.min(list.length, Math.max(0, prestige - act.number));
  return Array.from({ length: count }, (_, i) => list[(act.number - 1 + i) % list.length]).filter(
    (m): m is EliteModifier => m !== undefined,
  );
}

/**
 * Boss abilities in the Wildfire: the same count for every act boss, rising with the tier
 * (`PROGRESSION.wildfire.abilities`), so Act 1 burns as hot as Act 6. The Harvester has none.
 */
export function wildfireBossAbilities(data: GameData, act: ActData, tier: number): EliteModifier[] {
  const list = data.bossAbilities ?? [];
  if (act.boss.archetype === "harvester") return [];
  const w = PROGRESSION.wildfire;
  const count = Math.min(list.length, w.abilities[0] + Math.floor(tier / w.abilities[1]));
  return Array.from({ length: count }, (_, i) => list[(act.number - 1 + i) % list.length]).filter(
    (m): m is EliteModifier => m !== undefined,
  );
}

export function eliteModifiersOf(encounter: Encounter, data: GameData): EliteModifier[] {
  return encounter.eliteModifiers.flatMap((id) => {
    const mod =
      data.eliteModifiers.find((m) => m.id === id) ?? data.bossAbilities?.find((m) => m.id === id);
    return mod ? [mod] : [];
  });
}

/** The enemy's fight setup for an encounter (Elites included). */
export function enemySetup(encounter: Encounter, actId: string, data: GameData): CombatantSetup {
  const enemy = encounterEnemy(encounter, getAct(data, actId), data);
  const created = createEnemySetup(enemy, encounter.level);
  const base = encounter.thief
    ? { ...created, fleeAfter: PROGRESSION.thiefFleeSeconds }
    : encounter.boss && enemy.archetype !== "harvester"
      ? { ...created, baseLife: (created.baseLife ?? 0) * PROGRESSION.bossLife }
      : created;
  const p = encounter.pressure;
  // The Harvester takes only part of the Run Pressure: it is already the run's peak.
  const share = enemy.archetype === "harvester" ? PROGRESSION.harvesterPressure : undefined;
  const scaled = (x: number, k: number | undefined) => (k === undefined ? x : 1 + (x - 1) * k);
  const setup = p
    ? {
        ...base,
        baseLife: (base.baseLife ?? 0) * scaled(p.life, share?.life),
        damageMultiplier: (base.damageMultiplier ?? 1) * scaled(p.damage, share?.damage),
      }
    : base;
  const w = encounter.wall;
  const walled = w
    ? {
        ...setup,
        baseLife: (setup.baseLife ?? 0) * w.life,
        damageMultiplier: (setup.damageMultiplier ?? 1) * w.damage,
      }
    : setup;
  const mods = eliteModifiersOf(encounter, data);
  // A Gatekeeper is already half the wall: its modifiers, but no Elite Life and damage on top.
  return mods.length ? applyEliteModifiers(walled, mods, { plain: encounter.gate }) : walled;
}

export function encounterName(encounter: Encounter, actId: string, data: GameData): string {
  return encounterEnemy(encounter, getAct(data, actId), data).name;
}

export function encounterRank(encounter: Encounter): EnemyRank {
  return encounter.boss ? "boss" : encounter.eliteModifiers.length ? "elite" : "normal";
}

/** Both setups and the seed of the current fight. */
export function currentFight(
  state: GameState,
  data: GameData,
): { readonly hero: CombatantSetup; readonly enemy: CombatantSetup; readonly seed: number } {
  const run = state.run;
  if (!run || run.phase !== "fight" || !run.encounter) return fail("No fight in progress");
  return {
    hero: heroSetup(state, data).setup,
    enemy: enemySetup(run.encounter, run.actId, data),
    seed: run.encounter.seed,
  };
}

/** Fights simulated so far, by encounter (an encounter is immutable, so is its fight). */
const recordings = new WeakMap<Encounter, FightRecording>();

/**
 * The current fight, simulated to the end. Each encounter is simulated once: the Battle view
 * plays this recording back, and the outcome in it is the one `startFight` stored.
 */
export function fightRecording(state: GameState, data: GameData): FightRecording {
  const encounter = state.run?.encounter ?? fail("No fight in progress");
  const cached = recordings.get(encounter);
  if (cached) return cached;
  const { hero, enemy, seed } = currentFight(state, data);
  const recording = recordFight(hero, enemy, seed);
  recordings.set(encounter, recording);
  return recording;
}

/** A state that just entered the "fight" phase, with the fight's outcome fixed in it. */
export function startFight(state: GameState, data: GameData): GameState {
  const run = state.run ?? fail("Not in a run");
  const recording = fightRecording(state, data);
  const encounter = { ...(run.encounter ?? fail("No encounter")), outcome: recording.outcome };
  recordings.set(encounter, recording);
  return { ...state, run: { ...run, encounter } };
}

/**
 * Life and damage of the finale's foe at a stage: `PROGRESSION.finaleRamp` of the finale's pressure
 * at the first echo, all of it at the Core.
 */
export function finalePressure(
  stage: number,
  stages: number,
): { readonly life: number; readonly damage: number } {
  const k =
    PROGRESSION.finaleRamp +
    (1 - PROGRESSION.finaleRamp) * Math.min(1, (stage - 1) / Math.max(1, stages - 1));
  const p = PROGRESSION.finale;
  return { life: 1 + (p.life - 1) * k, damage: 1 + (p.damage - 1) * k };
}

/** The finale's foe at a stage: a Warden echo (one boss ability more per stage), then the Core. */
export function finaleEncounter(data: GameData, stage: number, rng: Rng): Encounter {
  const finale = data.finale ?? fail("No finale in this game");
  const last = harvestAct(data, PROGRESSION.finalPrestige - 1);
  const level = stageMonsterLevel(data, last, last.stages, PROGRESSION.finalPrestige - 1);
  const pressure = finalePressure(stage, finale.stages);
  const echo = finaleEchoes(data)[stage - 1];
  const seed = rng.int(0, 0x7fffffff);
  if (!echo || stage >= finale.stages) {
    return { enemyId: finale.boss.id, level, boss: true, eliteModifiers: [], pressure, seed };
  }
  return {
    enemyId: echo.boss.id,
    level,
    boss: true,
    eliteModifiers: bossAbilities(data, echo, PROGRESSION.finalPrestige)
      .slice(0, Math.min(stage, PROGRESSION.finaleEchoAbilities))
      .map((m) => m.id),
    pressure,
    seed,
    echo: echo.id,
  };
}
