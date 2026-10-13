import { GAME_DATA, ITEM_CATALOG } from "@emberheir/content";
import {
  type DerivedStats,
  type GameState,
  type Item,
  type ItemComparison,
  compareItem,
  formatPercent,
  missingRequirements,
} from "@emberheir/sim";
import { preferredSlotFor } from "./ringSlot";

/** How an item compares with the gear the hero wears (tooltips, item cards, the stash). */

const STAT_LABEL: Partial<Record<keyof DerivedStats, string>> = {
  maxLife: "Life",
  armor: "Armor",
  physicalDamage: "Physical Damage",
  elementalDamage: "Elemental Damage",
  critChance: "Crit Chance",
  attackSpeed: "Attack Speed",
  evasion: "Evasion",
  blockChance: "Block",
  resistance: "All Resistance",
  fireResistance: "Fire Resistance",
  coldResistance: "Cold Resistance",
  lightningResistance: "Lightning Resistance",
  voidResistance: "Void Resistance",
  heatGain: "Heat Gain",
  startingHeat: "Starting Heat",
  tenacity: "Tenacity",
  lifesteal: "Lifesteal",
  triggerChance: "Trigger Chance",
  bleedChance: "Chance to Bleed",
  poisonChance: "Chance to Poison",
  ailmentDuration: "Ailment Duration",
};
const FLAT = new Set<keyof DerivedStats>(["maxLife", "armor", "startingHeat"]);

/** "▲ +8 % DPS · ▲ +40 Life" style comparison with the equipped item. */
export function compareSummary(cmp: ItemComparison): { text: string; better: boolean } {
  const parts: string[] = [];
  const dpsDelta = cmp.dps.before > 0 ? cmp.dps.after / cmp.dps.before - 1 : 0;
  let score = dpsDelta * 3;
  if (Math.abs(dpsDelta) >= 0.005) {
    parts.push(`${dpsDelta > 0 ? "▲ +" : "▼ "}${Math.round(dpsDelta * 100)} % DPS`);
  }
  for (const c of cmp.changes) {
    if (c.stat === "attackSpeed" || c.stat === "dps" || parts.length >= 3) continue;
    const label = STAT_LABEL[c.stat as keyof DerivedStats];
    if (!label) continue;
    const delta = c.after - c.before;
    const flat = FLAT.has(c.stat as keyof DerivedStats);
    const value = flat ? `${Math.round(Math.abs(delta))}` : `${formatPercent(Math.abs(delta))} %`;
    if (flat && Math.round(Math.abs(delta)) === 0) continue;
    parts.push(`${delta > 0 ? "▲ +" : "▼ −"}${value} ${label}`);
    score += Math.sign(delta) * 0.5;
  }
  if (cmp.triggerDelta > 0) {
    parts.push("▲ new Trigger Affix");
    score += 1;
  } else if (cmp.triggerDelta < 0) {
    parts.push("▼ loses Trigger Affix");
    score -= 1;
  }
  if (parts.length === 0) return { text: "Same as equipped", better: false };
  const prefix = cmp.replaces ? "" : "Empty slot · ";
  return { text: prefix + parts.join(" · "), better: score >= 0 || !cmp.replaces };
}

/** Compare with the item in the slot it would go to (the Ring shortcut picks the Ring). */
export function compareWithEquipped(state: GameState, item: Item) {
  // Gear with unmet requirements does nothing, so a stat comparison would read "same".
  const missing = missingRequirements(item, ITEM_CATALOG, state.hero.attributes);
  if (missing.length > 0)
    return { text: "Inactive until you meet its requirements", better: false };
  return compareSummary(compareItem(state, GAME_DATA, item, preferredSlotFor(item)));
}
