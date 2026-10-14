import { mergeRules } from "../../combat/rules";
import { sumBonuses } from "../../combat/stats";
import type { CombatRules, StatBonuses } from "../../combat/types";
import type { GameData, GameState, HeroState } from "./state";

/**
 * Rune Sockets of the Skill Web (neuausrichtung-v1.md 4.2): a learned socket node takes a Rune
 * from the pouch and gives the Rune's third effect, its web effect. Taking it out or forgetting
 * the node puts the Rune back into the pouch.
 */

/** Bonuses and rules of the Runes in the hero's web sockets (learned sockets only). */
export function webRuneEffects(
  hero: HeroState,
  data: GameData,
): { readonly bonuses: StatBonuses; readonly rules: CombatRules } {
  const bonuses: StatBonuses[] = [];
  const rules: CombatRules[] = [];
  for (const [nodeId, runeId] of Object.entries(hero.webRunes ?? {})) {
    if ((hero.learned[nodeId] ?? 0) <= 0) continue;
    const web = data.items.runes.get(runeId)?.web;
    if (web?.bonuses) bonuses.push(web.bonuses);
    if (web?.rules) rules.push(web.rules);
  }
  return { bonuses: sumBonuses(...bonuses), rules: mergeRules(...rules) };
}

/**
 * Puts the Runes of sockets that are no longer learned back into the pouch (after a respec or a
 * forgotten node).
 */
export function returnLooseWebRunes(state: GameState): GameState {
  const sockets = state.hero.webRunes;
  if (!sockets) return state;
  const kept: Record<string, string> = {};
  const runes: Record<string, number> = { ...state.wallet.runes };
  for (const [nodeId, runeId] of Object.entries(sockets)) {
    if ((state.hero.learned[nodeId] ?? 0) > 0) kept[nodeId] = runeId;
    else runes[runeId] = (runes[runeId] ?? 0) + 1;
  }
  return {
    ...state,
    hero: { ...state.hero, webRunes: kept },
    wallet: { ...state.wallet, runes },
  };
}
