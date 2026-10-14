import type { CombatEvent } from "../../combat/events";
import { Fight } from "../../combat/fight";
import { createEnemySetup } from "../../combat/monsters";
import { fightReport } from "../../combat/report";
import { deriveStats } from "../../combat/stats";
import type { CombatantSetup } from "../../combat/types";
import type { Item } from "../../items/types";
import { nextAct, stageMonsterLevel } from "./acts";
import { heroSetup } from "./hero-build";
import { targetSlot } from "./item-rules";
import type { GameData, GameState } from "./state";

/**
 * The Training Dummy on Kaelen's practice ground (neuausrichtung-v1.md 9): the hero fights a straw
 * man that never dies, and the numbers show what the build does. The same measure marks loot
 * cards as upgrades. Deterministic: a fixed seed, so two comparisons play out the same.
 */

/**
 * Plain: no defenses. Boss: the defenses of the next act's boss (Armor, Resistances), it does not
 * hit back. Striking: that boss hitting back, to see damage taken against healing.
 */
export const DUMMY_PROFILES = ["plain", "boss", "striking"] as const;
export type DummyProfile = (typeof DUMMY_PROFILES)[number];

export interface DummyReport {
  readonly seconds: number;
  /** Damage per second, and per source (Default Attack, skills, triggers, "Ailments"). */
  readonly dps: number;
  readonly sources: readonly { readonly source: string; readonly dps: number }[];
  /** Heat spent on skills per second. */
  readonly heatPerSecond: number;
  readonly triggersPerMinute: number;
  /** Share of own hits that crit, and that were Glancing Blows. */
  readonly critRate: number;
  readonly glancingRate: number;
  /** Striking dummy only: damage taken and healing per second. */
  readonly takenPerSecond: number;
  readonly healedPerSecond: number;
  /** Max Life plus Barrier. */
  readonly life: number;
}

const DUMMY_SEED = 7;
const DUMMY_LIFE = 1e9;

/** The straw man for a profile, at the level of the next act's boss. */
export function dummySetup(
  state: GameState,
  data: GameData,
  profile: DummyProfile,
): CombatantSetup {
  const act = nextAct(state, data);
  const level = stageMonsterLevel(data, act, act.stages, state.legacy.prestige);
  const boss = createEnemySetup(act.boss, level);
  if (profile === "striking") return { ...boss, name: "Training Dummy", baseLife: DUMMY_LIFE };
  const still = {
    ...boss,
    name: "Training Dummy",
    weapon: { ...boss.weapon, attacksPerSecond: 0, triggers: [], ailmentChances: [] },
    rotation: [],
    telegraphs: [],
    triggers: [],
    baseLife: DUMMY_LIFE,
  };
  if (profile === "boss") return still;
  return {
    ...still,
    attributes: { strength: 0, dexterity: 0, agility: 0, intelligence: 0, wisdom: 0, vitality: 0 },
    bonuses: {},
  };
}

/** Plays the hero against the dummy for `seconds` and reads the numbers. */
export function dummyReport(
  hero: CombatantSetup,
  dummy: CombatantSetup,
  seconds = 30,
): DummyReport {
  const fight = new Fight({ ...hero, lifeFraction: 1 }, dummy, DUMMY_SEED);
  fight.advance(seconds);
  const events = fight.events;
  const time = Math.max(1, fight.time);
  const report = fightReport(events, "hero");
  const own = (e: CombatEvent) => "side" in e && e.side === "hero";
  const hits = events.filter((e) => e.type === "hit" && own(e));
  const count = (pred: (e: CombatEvent) => boolean) => events.filter(pred).length;
  const stats = deriveStats(hero);
  return {
    seconds: time,
    dps: report.total / time,
    sources: report.damage.map((d) => ({ source: d.source, dps: d.damage / time })),
    heatPerSecond:
      events.reduce((sum, e) => sum + (e.type === "skill" && own(e) ? e.heatCost : 0), 0) / time,
    triggersPerMinute: (count((e) => e.type === "trigger" && own(e)) * 60) / time,
    critRate: hits.length ? count((e) => e.type === "hit" && own(e) && e.crit) / hits.length : 0,
    glancingRate: hits.length
      ? count((e) => e.type === "hit" && own(e) && e.glancing === true) / hits.length
      : 0,
    takenPerSecond:
      events.reduce(
        (sum, e) =>
          sum +
          ((e.type === "hit" && e.side === "enemy") || (e.type === "dot" && e.side === "hero")
            ? e.damage
            : 0),
        0,
      ) / time,
    healedPerSecond:
      events.reduce((sum, e) => sum + (e.type === "heal" && own(e) ? e.amount : 0), 0) / time,
    life: stats.maxLife + stats.barrier,
  };
}

/** The Training Dummy with the hero as they are now. */
export function trainingDummy(
  state: GameState,
  data: GameData,
  profile: DummyProfile = "plain",
  seconds = 30,
): DummyReport {
  return dummyReport(heroSetup(state, data).setup, dummySetup(state, data, profile), seconds);
}

/** The hero wearing `item` in its slot instead of what is there now. */
export function wearing(state: GameState, data: GameData, item: Item): GameState | null {
  const slot = targetSlot(item, data, state.hero.equipment);
  if (!slot) return null;
  return {
    ...state,
    hero: { ...state.hero, equipment: { ...state.hero.equipment, [slot]: item } },
  };
}

/**
 * What `item` changes against the worn one (loot cards, the dummy's item list): damage per second
 * and Life + Barrier, as shares (0.08 = +8 %). Ailments count, triggers count.
 */
export function gearDelta(
  state: GameState,
  data: GameData,
  item: Item,
  profile: DummyProfile = "boss",
  seconds = 20,
): { readonly dps: number; readonly life: number } | null {
  const tried = wearing(state, data, item);
  if (!tried) return null;
  const dummy = dummySetup(state, data, profile);
  const before = dummyReport(heroSetup(state, data).setup, dummy, seconds);
  const after = dummyReport(heroSetup(tried, data).setup, dummy, seconds);
  return {
    dps: before.dps > 0 ? after.dps / before.dps - 1 : 0,
    life: before.life > 0 ? after.life / before.life - 1 : 0,
  };
}
