import { COMBAT } from "../combat/constants";
import { PERK } from "../combat/perks";
import { PROGRESSION } from "./constants";

/**
 * Plain-words explanations of the defense mechanics for tooltips (Timo: every new mechanic gets
 * a tooltip in simple words). Numbers come from the tuning constants, so the text never lies.
 */
const pct = (x: number) => `${Math.round(x * 100)} %`;

export const DEFENSE_NOTES = {
  barrier: {
    name: "Barrier",
    kind: "Defense · caster gear",
    explain: `A shield that takes hits before your Life. It comes from caster gear (Silk Robe, Circlet, Silk Wraps, Silk Slippers, Focus, Grimoire); each point of Intelligence raises it by ${pct(COMBAT.heir.barrierPerIntelligence)}. It trickles back all fight and fills up fast after ${COMBAT.barrierRecharge.delay} s without a hit.`,
  },
  armor: {
    name: "Armor",
    kind: "Defense · heavy gear",
    explain:
      "Takes a share off every Physical hit. It comes from heavy gear; each point of Strength raises it.",
  },
  block: {
    name: "Block",
    kind: "Defense · shield",
    explain: `A shield sometimes blocks a Physical hit and stops ${pct(COMBAT.blockReduction)} of it (Stoneguard: ${pct(COMBAT.blockReduction + PERK.stoneguardBlock)}).`,
  },
  resistance: {
    name: "Resistance",
    kind: "Defense · gear only",
    explain: `Takes a share off Fire, Cold, Lightning and Void hits, at most ${pct(COMBAT.maxResistance)}. From the second run on the Ember Penalty takes ${pct(PROGRESSION.resistancePenalty.perPrestige)} per run off every Resistance (at most ${pct(PROGRESSION.resistancePenalty.max)}), so collect Resistance for the element of your next act.`,
  },
} as const;

/** The status line under the Resistance note: this run's Ember Penalty. */
export function emberPenaltyLine(penalty: number): string {
  return penalty > 0
    ? `Ember Penalty this run: −${pct(penalty)} on every Resistance`
    : "No Ember Penalty in the first run";
}
