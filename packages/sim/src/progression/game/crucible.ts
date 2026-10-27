import { resolveTrigger } from "../../items/affixes";
import { scaledFlatBonuses } from "../../items/equipment";
import type { LegendaryPowerDefinition, TriggerAffixDefinition } from "../../items/types";
import type { CombatRules, StatBonuses, TriggerSpec } from "../../combat/types";
import { bossLevel, killPrice } from "../leveling";
import { requireCamp } from "./guards";
import { fail, type GameData, type GameState } from "./state";

/**
 * Ember Crucible (neuausrichtung-v1.md 8): salvaging a Legendary or Unique teaches its Power to
 * the account's Power Codex (at the item's tier, the best one counts). Liora binds learned Powers
 * into three Crucible slots by their kind: Strike (hits), Ward (defense, healing), Ember
 * (ailments, Heat, triggers, rules). Each character opens its own slots.
 */

export const CRUCIBLE_SLOTS = ["strike", "ward", "ember"] as const;
export type CrucibleSlot = (typeof CRUCIBLE_SLOTS)[number];

export const CRUCIBLE = {
  /**
   * What binding a Power costs (every change costs again; emptying a slot is free): the Ash of
   * this many kills at the run's boss level (economy-audit-v1.md E1), and Ember Coal.
   */
  bindAshKills: 20,
  bindEmberCoal: 3,
  /** Ember opens with Wildfire V cleared. */
  emberFromWildfire: 5,
} as const;

/** What binding a Power costs in this run. */
export function crucibleBindCost(prestige: number): {
  readonly ash: number;
  readonly emberCoal: number;
} {
  return {
    ash: killPrice(bossLevel(prestige), { ash: CRUCIBLE.bindAshKills }).ash,
    emberCoal: CRUCIBLE.bindEmberCoal,
  };
}

/** Why a Crucible slot is still closed, or null. */
export function crucibleLock(state: GameState, slot: CrucibleSlot): string | null {
  switch (slot) {
    case "strike":
      return Object.keys(state.powerCodex ?? {}).length > 0 ? null : "Opens with the first Power";
    case "ward":
      return state.legacy.finaleWon ? null : "Opens once The Last Ember is won";
    case "ember":
      return (state.legacy.wildfire ?? 0) >= CRUCIBLE.emberFromWildfire
        ? null
        : "Opens once Wildfire V is cleared";
  }
}

/** The Power Codex after salvaging an item: its Power at the item's tier, if that is better. */
export function learnPower(
  codex: Readonly<Record<string, number>> | undefined,
  powerId: string | undefined,
  tier: number,
): Readonly<Record<string, number>> | undefined {
  if (!powerId || (codex?.[powerId] ?? 0) >= tier) return codex;
  return { ...codex, [powerId]: tier };
}

function getPower(data: GameData, id: string): LegendaryPowerDefinition {
  return data.items.powers.get(id) ?? fail(`Unknown Power "${id}"`);
}

/** Liora: a learned Power into its Crucible slot, or the slot emptied (`null`). */
export function bindPower(
  state: GameState,
  data: GameData,
  slot: CrucibleSlot,
  powerId: string | null,
): GameState {
  requireCamp(state);
  if (!state.progress.trainerUnlocked) return fail("Liora joins after the act boss falls");
  const lock = crucibleLock(state, slot);
  if (lock) return fail(lock);
  const crucible = { ...state.hero.crucible };
  if (powerId === null) {
    const emptied = Object.fromEntries(Object.entries(crucible).filter(([k]) => k !== slot));
    return { ...state, hero: { ...state.hero, crucible: emptied } };
  }
  const power = getPower(data, powerId);
  if (!state.powerCodex?.[powerId]) return fail("Salvage an item with this Power first");
  if (power.crucible !== slot) return fail(`${power.name} belongs in the ${power.crucible} slot`);
  if (crucible[slot] === powerId) return fail("Already bound");
  const cost = crucibleBindCost(state.legacy.prestige);
  if (state.wallet.ash < cost.ash) return fail("Not enough Ash");
  if (state.wallet.emberCoal < cost.emberCoal) return fail("Not enough Ember Coal");
  return {
    ...state,
    hero: { ...state.hero, crucible: { ...crucible, [slot]: powerId } },
    wallet: {
      ...state.wallet,
      ash: state.wallet.ash - cost.ash,
      emberCoal: state.wallet.emberCoal - cost.emberCoal,
    },
  };
}

/**
 * What the bound Powers do, at their learned tier. A Power works once: worn on an item too, the
 * Crucible's copy rests.
 */
export function crucibleEffects(
  state: GameState,
  data: GameData,
): {
  readonly bonuses: StatBonuses[];
  readonly rules: CombatRules[];
  readonly triggers: TriggerSpec[];
} {
  const worn = new Set(
    Object.values(state.hero.equipment).flatMap((item) => (item?.powerId ? [item.powerId] : [])),
  );
  const bonuses: StatBonuses[] = [];
  const rules: CombatRules[] = [];
  const triggers: TriggerSpec[] = [];
  for (const slot of CRUCIBLE_SLOTS) {
    const id = state.hero.crucible?.[slot];
    if (!id || worn.has(id) || crucibleLock(state, slot)) continue;
    const power = data.items.powers.get(id);
    const tier = state.powerCodex?.[id];
    if (!power || !tier) continue;
    bonuses.push(scaledFlatBonuses(power.bonuses, tier));
    if (power.rules) rules.push(power.rules);
    if (power.trigger) {
      const affix = data.items.affixes.get(power.trigger.affixId);
      if (affix?.kind === "trigger") {
        triggers.push(resolveTrigger(affix as TriggerAffixDefinition, tier, power.trigger.quality));
      }
    }
  }
  return { bonuses, rules, triggers };
}
