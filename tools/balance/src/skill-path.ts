import {
  type BuildPlan,
  type GameData,
  type GameState,
  learnAshTree,
  setPlanBattlePlan,
} from "@emberheir/sim";
import { applyAction, link } from "./ledger";
import { spendMastery } from "./autopilot";
import { gearValue } from "./gear-value";

/** A web Rune must add at least this much value (log scale, ~0.5 %) to be socketed. */
const MIN_GAIN = 0.005;

/** The autopilot at Kaelen: Heirloom, Ash Tree and Battle Plan along the build plan. */
export function spendSkillPoints(
  state: GameState,
  data: GameData,
  plan: BuildPlan | undefined,
): GameState {
  if (!plan || state.run) return state;
  const mastered = spendMastery(state, data, plan);
  const s = fillWebSockets(link(mastered, learnAshTree(mastered, data, plan), "kaelen"), data);
  return link(s, setPlanBattlePlan(s, data, plan), "kaelen");
}

/**
 * Rune Sockets of the Ash Tree: an empty learned socket takes the Rune from the pouch that helps
 * the build most (`gearValue`, runen-review-v1.md R5) and is in no other socket yet (each Rune
 * works once). A Rune that adds nothing stays in the pouch.
 */
function fillWebSockets(state: GameState, data: GameData): GameState {
  let s = state;
  const sockets = data.skillTree.nodes.filter(
    (n) => n.kind === "socket" && (s.hero.learned[n.id] ?? 0) > 0 && !s.hero.webRunes?.[n.id],
  );
  for (const socket of sockets) {
    const used = new Set(Object.values(s.hero.webRunes ?? {}));
    const now = gearValue(s, data);
    let best: GameState | null = null;
    let bestGain = MIN_GAIN;
    for (const rune of data.items.runes.values()) {
      if ((s.wallet.runes[rune.id] ?? 0) <= 0 || used.has(rune.id)) continue;
      const next = applyAction(s, data, {
        type: "socketWebRune",
        nodeId: socket.id,
        runeId: rune.id,
      });
      const gain = gearValue(next, data) - now;
      if (gain > bestGain) {
        best = next;
        bestGain = gain;
      }
    }
    if (!best) break;
    s = best;
  }
  return s;
}
