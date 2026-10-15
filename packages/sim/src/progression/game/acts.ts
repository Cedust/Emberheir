import { ATTRIBUTE_RULES } from "../attributes";
import { BATTLE_PLAN_LADDER, battlePlanUnlocks } from "../battle-plan";
import { PROGRESSION } from "../constants";
import { bossLevel, levelCap } from "../leveling";
import { keystoneLimit } from "../skill-tree";
import {
  fail,
  GameActionError,
  type ActData,
  type GameData,
  type GameState,
  type LevelBand,
  type PrestigeRewards,
  type RouteKind,
} from "./state";

/** The road: acts of a run, Monster Levels, Run Pressure, walls, Waymarks and Wildfire. */

export function getAct(data: GameData, actId: string): ActData {
  const act =
    data.acts.find((a) => a.id === actId) ?? (data.finale?.id === actId ? data.finale : undefined);
  if (!act) throw new GameActionError(`Unknown act "${actId}"`);
  return act;
}

export const stagesInAct = (act: ActData) => act.stages;

/** True for the act of The Last Ember. */
export const isFinaleAct = (data: GameData, actId: string) => data.finale?.id === actId;

/** The Last Ember opens with the final Prestige. */
export const finaleOpen = (state: GameState, data: GameData) =>
  data.finale !== undefined && state.legacy.prestige >= PROGRESSION.finalPrestige;

/** The Warden echoes of the finale in order: every act boss but the Harvester. */
export function finaleEchoes(data: GameData): readonly ActData[] {
  return [...data.acts]
    .filter((a) => a.boss.archetype !== "harvester")
    .sort((a, b) => a.number - b.number);
}

/** Acts in their order through the run. */
export function actsInOrder(data: GameData): ActData[] {
  return [...data.acts].sort((a, b) => a.number - b.number);
}

/**
 * The acts of a run (prestige-acts-v1.md): run n has acts 1..n, so every Prestige opens one more
 * act until the whole world is open.
 */
export function actsInRun(data: GameData, prestige: number): ActData[] {
  return actsInOrder(data).slice(0, Math.max(1, prestige + 1));
}

/** The newest act of the run: its boss brings The Harvest (the Prestige). */
export function harvestAct(data: GameData, prestige: number): ActData {
  const acts = actsInRun(data, prestige);
  return acts[acts.length - 1] ?? fail("No acts");
}

/**
 * Whether the hero may set out into an act: it must belong to this run, and the act before it
 * must have fallen in this generation. Cleared acts can be revisited to farm.
 */
export function actUnlocked(state: GameState, data: GameData, actId: string): boolean {
  const acts = actsInRun(data, state.legacy.prestige);
  const index = acts.findIndex((a) => a.id === actId);
  if (index < 0) return false;
  const before = acts[index - 1];
  return !before || state.progress.actsCleared.includes(before.id);
}

/**
 * Whether the hero knows the act's boss by name: it faced it once, or the act fell in this or an
 * earlier generation (every Prestige so far cleared the acts before its newest one).
 */
export function bossKnown(state: GameState, data: GameData, actId: string): boolean {
  if (state.legacy.bossesMet?.includes(actId)) return true;
  if (state.progress.actsCleared.includes(actId)) return true;
  const index = actsInOrder(data).findIndex((a) => a.id === actId);
  return index >= 0 && index < state.legacy.prestige;
}

/** The act the journey continues with: the first unlocked act that has not fallen yet. */
export function nextAct(state: GameState, data: GameData): ActData {
  const acts = actsInRun(data, state.legacy.prestige);
  const open = acts.find(
    (a) => !state.progress.actsCleared.includes(a.id) && actUnlocked(state, data, a.id),
  );
  return open ?? acts[acts.length - 1] ?? fail("No acts");
}

/** Whether the boss of this act brings The Harvest in the given run (the newest act or later). */
export function isHarvestAct(data: GameData, actId: string, prestige: number): boolean {
  return getAct(data, actId).number >= harvestAct(data, prestige).number;
}

/**
 * The run's level band (neuausrichtung-v1.md 5.1): the whole world burns at the new level. Act 1
 * starts `PROGRESSION.worldBelowCap` levels below the Level Cap of the run before (where the hero
 * left off with all of its gear) and the band ends at the new harvest boss.
 */
export function levelBand(prestige: number): LevelBand {
  const end = bossLevel(prestige);
  if (prestige === 0) return { start: 1, end };
  return { start: Math.min(end, levelCap(prestige - 1) - PROGRESSION.worldBelowCap), end };
}

/** How far into its run a stage is: 0 on the run's first stage, 1 on its last. */
function runProgress(data: GameData, act: ActData, stage: number, prestige: number): number {
  const acts = actsInRun(data, prestige);
  const total = acts.reduce((n, a) => n + a.stages, 0);
  let index = 0;
  for (const a of acts) {
    if (a.id === act.id) break;
    index += a.stages;
  }
  // Acts past the run (old saves) count as its last stage.
  index = Math.min(total - 1, index + stage - 1);
  return index / Math.max(1, total - 1);
}

/** Monster Level of a stage: the run's band, spread evenly over all stages of its acts. */
export function stageMonsterLevel(
  data: GameData,
  act: ActData,
  stage: number,
  prestige: number,
): number {
  const { start, end } = levelBand(prestige);
  return Math.round(start + (end - start) * runProgress(data, act, stage, prestige));
}

/**
 * Waymarks of an act (level-v2.md section 7): a third, two thirds and the end of the act (Stages
 * 5, 10 and 15). The first win on each of them in a run gives a Skill Point.
 */
export function waymarkStages(act: ActData): readonly number[] {
  return [Math.round(act.stages / 3), Math.round((2 * act.stages) / 3), act.stages];
}

/**
 * Hearth Embers (neuausrichtung-v1.md 5.4): a won Waymark before the boss heals
 * `PROGRESSION.hearthEmbers` of max Life, every time. Not in the Wildfire.
 */
export function hearthEmbers(act: ActData, stage: number, wildfire = 0): boolean {
  return !wildfire && stage < act.stages && waymarkStages(act).includes(stage);
}

/**
 * Forks of the road (neuausrichtung-v1.md 6.2): the two stages right before each Waymark before
 * the boss (3–4 and 8–9 in a 15-stage act), so both paths are equally long and the Gatekeepers
 * stay where they are. Never on the Elite-free first stages.
 */
export function routeForks(act: ActData): readonly (readonly [number, number])[] {
  return waymarkStages(act)
    .filter((w) => w < act.stages && w - 2 > PROGRESSION.eliteFreeStages)
    .map((w) => [w - 2, w - 1] as const);
}

/**
 * The route a stage lies on: the fork's chosen path (the Shrine path when none was chosen) and
 * whether the stage is the fork's first or second. `null` off the forks and in the Wildfire.
 */
export function routeAt(
  run: { readonly routes?: Readonly<Record<string, RouteKind>>; readonly wildfire?: number },
  act: ActData,
  stage: number,
): { readonly kind: RouteKind; readonly second: boolean; readonly fork: number } | null {
  if (run.wildfire) return null;
  const fork = routeForks(act).find(([a, b]) => stage === a || stage === b);
  if (!fork) return null;
  return {
    kind: run.routes?.[String(fork[0])] ?? "shrine",
    second: stage === fork[1],
    fork: fork[0],
  };
}

/**
 * The fork whose path is still to choose before `stage` starts (its first stage, nothing chosen
 * yet), or null. The UI asks for a path there; the sim falls back to the Shrine path.
 */
export function openFork(
  run: { readonly routes?: Readonly<Record<string, RouteKind>>; readonly wildfire?: number },
  act: ActData,
  stage: number,
): number | null {
  const at = routeAt(run, act, stage);
  return at && !at.second && !run.routes?.[String(at.fork)] ? at.fork : null;
}

export const waymarkKey = (actId: string, stage: number) => `${actId}:${stage}`;

/**
 * Skill Points a hero has earned so far: the start, the Waymarks of every finished run (all
 * acts of a run fall before its Prestige), The Harvest of each Prestige and this run's Waymarks.
 */
export function earnedSkillPoints(state: GameState, data: GameData): number {
  let points = PROGRESSION.startSkillPoints;
  for (let p = 0; p < state.legacy.prestige; p++) {
    for (const act of actsInRun(data, p)) points += waymarkStages(act).length;
    points += PROGRESSION.harvestSkillPoints;
  }
  return points + state.progress.waymarks.length;
}

/**
 * Run Pressure of a stage (PROGRESSION.runPressure): 1 in a one-act run and on a run's first
 * stage, rising to 1 + pressure × (acts − 1) on its last.
 */
export function stagePressure(
  data: GameData,
  act: ActData,
  stage: number,
  prestige: number,
): { readonly life: number; readonly damage: number } {
  const steps = (actsInRun(data, prestige).length - 1) * runProgress(data, act, stage, prestige);
  return {
    life: 1 + PROGRESSION.runPressure.life * steps,
    damage: 1 + PROGRESSION.runPressure.damage * steps,
  };
}

/**
 * The Harvester at the end of a run takes only part of the Run Pressure: its own values already
 * make it the run's peak. The Wildfire evens out its bosses per act (`ActData.wildfireBoss`), and
 * the Harvester's Core in the finale takes all of the finale's pressure.
 */
export function harvesterShare(
  p: { readonly life: number; readonly damage: number },
  harvester: boolean,
): { readonly life: number; readonly damage: number } {
  if (!harvester) return p;
  const k = PROGRESSION.harvesterPressure;
  return { life: 1 + (p.life - 1) * k.life, damage: 1 + (p.damage - 1) * k.damage };
}

/** True for the newest act of the run (its boss brings The Harvest): the act with the walls. */
export function isWallAct(data: GameData, act: ActData, prestige: number): boolean {
  return !isFinaleAct(data, act.id) && harvestAct(data, prestige).id === act.id;
}

/**
 * Stages of the newest act that hold a Gatekeeper: the Waymarks before the boss (5 and 10), never
 * the Elite-free first stages.
 */
export function gateStages(act: ActData): readonly number[] {
  return waymarkStages(act).filter((s) => s < act.stages && s > PROGRESSION.eliteFreeStages);
}

/**
 * The wall of a stage (PROGRESSION.wall): only in the run's newest act. The boss takes the run's
 * full strength; before it the act climbs in teeth (neuausrichtung-v1.md 5.3): normal stages ramp
 * up stretch by stretch, each Gatekeeper is a peak above the stretch before it. `null` = no wall.
 */
export function stageWall(
  data: GameData,
  act: ActData,
  stage: number,
  prestige: number,
): { readonly life: number; readonly damage: number; readonly gate: boolean } | null {
  if (!isWallAct(data, act, prestige)) return null;
  const w = PROGRESSION.wall;
  const strength = w.strength[Math.min(prestige, w.strength.length - 1)] ?? 1;
  // A wall is a fight that a few levels or better gear win (balance-grundlagen-v1.md D): the
  // enemy hits harder, with only a little more Life so the fight stays short. Heavy Attacks stay
  // below `COMBAT.heavyHitCap`, so it is never a one-shot lottery.
  const at = (strength: number, gate: boolean) => ({
    life: strength ** w.lifeExponent,
    damage: strength,
    gate,
  });
  const part = (share: number) => 1 + (strength - 1) * share;
  if (stage >= act.stages) return at(strength, false);
  return at(part(sawtoothShare(act, stage)), gateStages(act).includes(stage));
}

/** Share of the wall on a stage before the boss: a Gatekeeper's peak or its stretch's ramp. */
export function sawtoothShare(act: ActData, stage: number): number {
  const w = PROGRESSION.wall;
  const gates = gateStages(act);
  const gate = gates.indexOf(stage);
  if (gate >= 0) return w.gates[Math.min(gate, w.gates.length - 1)] ?? 1;
  // The stretch between the Gatekeeper before this stage and the next one (or the boss).
  const stretch = gates.filter((g) => g < stage).length;
  const first = (gates[stretch - 1] ?? 0) + 1;
  const last = (gates[stretch] ?? act.stages) - 1;
  const [from, to] = w.ramps[Math.min(stretch, w.ramps.length - 1)] ?? [1, 1];
  const t = last > first ? (stage - first) / (last - first) : 1;
  return from + (to - from) * t;
}

const WILDFIRE_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** Wildfire opens once The Last Ember is won (spielzeit-v1.md, C). */
export const wildfireOpen = (state: GameState) => state.legacy.finaleWon === true;

/** Ember Penalty on every Resistance in this run (0 in run 1, −60 % from run 7 on). */
export function emberPenalty(state: GameState): number {
  const p = PROGRESSION.resistancePenalty;
  return Math.min(p.max, p.perPrestige * state.legacy.prestige);
}

/** The highest Wildfire tier the hero may choose: one above the highest cleared, 0 = closed. */
export function wildfireTop(state: GameState): number {
  if (!wildfireOpen(state)) return 0;
  return Math.min(PROGRESSION.wildfire.tiers, (state.legacy.wildfire ?? 0) + 1);
}

/** "Wildfire IV". */
export const wildfireName = (tier: number) =>
  `Wildfire ${WILDFIRE_NUMERALS[tier - 1] ?? String(tier)}`;

/** Monster Level of every stage at a Wildfire tier: 92 at I, 100 at V, 110 at X. */
export const wildfireLevel = (tier: number) =>
  PROGRESSION.wildfire.baseLevel + PROGRESSION.wildfire.levelsPerTier * tier;

/**
 * Life and damage of a Wildfire stage, raised per tier above I. Normal stages take the pressure of
 * the same stage in the seventh run's newest act (every act burns like the last one); the act boss
 * takes `PROGRESSION.wildfire.boss` times its act's `endgameBoss` factor (endgame-balance-v1.md
 * A). Above V each tier rises steeply.
 */
export function wildfirePressure(
  data: GameData,
  stage: number,
  tier: number,
  boss = false,
  act?: ActData,
): { readonly life: number; readonly damage: number } {
  const last = PROGRESSION.finalPrestige - 1;
  const w = PROGRESSION.wildfire;
  const k = boss ? (act?.endgameBoss ?? 1) : 1;
  const p = boss ? w.boss : stagePressure(data, harvestAct(data, last), stage, last);
  const gentle = Math.min(tier, w.steep.from) - 1;
  const steep = Math.max(0, tier - w.steep.from);
  return {
    life: k * p.life * (1 + w.life * gentle + w.steep.life * steep),
    damage: k * p.damage * (1 + w.damage * gentle + w.steep.damage * steep),
  };
}

/** What the Prestige at `prestige` (1 = the first one) gives. */
export function prestigeRewards(data: GameData, prestige: number): PrestigeRewards {
  return {
    prestige,
    rotationSlots: battlePlanUnlocks(prestige).rotationSlots,
    planUpgrade: BATTLE_PLAN_LADDER[prestige - 1]?.name ?? null,
    skillPoints: PROGRESSION.harvestSkillPoints,
    attributePoints: ATTRIBUTE_RULES.harvestPoints,
    keystones: keystoneLimit(prestige),
    levelCap: levelCap(prestige),
    acts: actsInRun(data, prestige).length,
    levelBand: levelBand(prestige),
  };
}
