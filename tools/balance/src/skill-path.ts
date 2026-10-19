import {
  applyAction,
  type BuildPlan,
  type GameData,
  type GameState,
  learnAshTree,
  setPlanBattlePlan,
} from "@emberheir/sim";
import { spendMastery } from "./autopilot";

/** The autopilot at Kaelen: Heirloom, Ash Tree and Battle Plan along the build plan. */
export function spendSkillPoints(
  state: GameState,
  data: GameData,
  plan: BuildPlan | undefined,
): GameState {
  if (!plan || state.run) return state;
  const s = fillWebSockets(learnAshTree(spendMastery(state, data, plan), data, plan), data);
  return setPlanBattlePlan(s, data, plan);
}

/**
 * Rune Sockets of the Ash Tree: an empty learned socket takes the highest Rune of which the pouch
 * holds more than two (two stay for Runeword recipes, like the combining rule).
 */
function fillWebSockets(state: GameState, data: GameData): GameState {
  let s = state;
  const sockets = data.skillTree.nodes.filter(
    (n) => n.kind === "socket" && (s.hero.learned[n.id] ?? 0) > 0 && !s.hero.webRunes?.[n.id],
  );
  for (const socket of sockets) {
    const spare = [...data.items.runes.values()]
      .filter((r) => (s.wallet.runes[r.id] ?? 0) > 2)
      .sort((a, b) => b.rank - a.rank)[0];
    if (!spare) break;
    s = applyAction(s, data, { type: "socketWebRune", nodeId: socket.id, runeId: spare.id });
  }
  return s;
}
