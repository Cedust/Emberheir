import {
  applyAction,
  encounterFight,
  getAct,
  getOmen,
  minPeril,
  omenEffectsOf,
  omenOffer,
  type GameData,
  type GameState,
  stagesInAct,
} from "@emberheir/sim";

/**
 * The autopilot's Omens (neuausrichtung-v1.md 5.2 and 7.2): it fights the act boss once under
 * each choice, like a player who knows the build, and takes what hurts least. What a boss fight
 * does not show (Flask, rests, more Elites) counts a little on top.
 */

/** How well the hero fares against the act boss under these Omens: higher is better. */
function trial(
  state: GameState,
  data: GameData,
  actId: string,
  omens: readonly string[],
  wildfire?: number,
): number {
  const act = getAct(data, actId);
  const s = applyAction(
    {
      ...state,
      run: {
        actId,
        stage: stagesInAct(act),
        lifeFraction: 1,
        phase: "intermission",
        encounter: null,
        rewards: null,
        ...(wildfire ? { wildfire } : {}),
        ...(omens.length ? { omens } : {}),
      },
    },
    data,
    { type: "startStage" },
  );
  const fight = encounterFight(s, data);
  fight.runToEnd();
  const { hero, enemy } = fight.snapshot();
  const fought =
    fight.winner === "hero"
      ? 1 + hero.life / Math.max(1, hero.maxLife)
      : -enemy.life / Math.max(1, enemy.maxLife);
  const e = omenEffectsOf(data, omens);
  const road = -(1 - e.flaskHeal) * 0.4 - (e.eliteChance - 1) * 0.3 + (e.restHeal - 1) * 0.1;
  return fought + road;
}

/** One of the two Run Omens of an old act; none elsewhere. */
export function chooseRunOmen(state: GameState, data: GameData, actId: string): string[] {
  const offer = omenOffer(state, data, actId);
  if (offer.length === 0) return [];
  let best = offer[0] ?? "";
  let bestScore = -Infinity;
  for (const id of offer) {
    const score = trial(state, data, actId, [id]);
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return [best];
}

/**
 * Wildfire Omens for a tier: just its minimum Peril, from the Omens that cost the build the
 * least per point of Peril.
 */
export function chooseWildfireOmens(
  state: GameState,
  data: GameData,
  actId: string,
  tier: number,
): string[] {
  const need = minPeril(tier);
  if (need <= 0) return [];
  const base = trial(state, data, actId, [], tier);
  const ranked = (data.omens ?? [])
    .filter((o) => o.kind === "wildfire")
    .map((o) => ({
      id: o.id,
      peril: o.peril ?? 1,
      cost: Math.max(0, base - trial(state, data, actId, [o.id], tier)) / (o.peril ?? 1),
    }))
    .sort((a, b) => a.cost - b.cost || b.peril - a.peril);
  const chosen: string[] = [];
  let peril = 0;
  for (const o of ranked) {
    if (peril >= need) break;
    chosen.push(o.id);
    peril += o.peril;
  }
  return chosen;
}

/** The Ember Flask works on this trip (Parched takes it away). */
export function flaskWorks(state: GameState, data: GameData): boolean {
  return (state.run?.omens ?? []).every((id) => getOmen(data, id).flaskHeal !== 0);
}
