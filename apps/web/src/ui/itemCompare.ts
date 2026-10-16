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
import type { GameIconId } from "./gameIcons";
import { preferredSlotFor } from "./ringSlot";

/** How an item compares with the gear the hero wears (tooltips, item cards, the stash). */

const STAT_ROW: Partial<Record<keyof DerivedStats, { label: string; icon: GameIconId }>> = {
  maxLife: { label: "Life", icon: "life" },
  armor: { label: "Armor", icon: "armor" },
  barrier: { label: "Barrier", icon: "barrier" },
  physicalDamage: { label: "Physical Damage", icon: "physical" },
  elementalDamage: { label: "Elemental Damage", icon: "elemental" },
  critChance: { label: "Crit Chance", icon: "crit" },
  attackSpeed: { label: "Attack Speed", icon: "speed" },
  evasion: { label: "Evasion", icon: "evasion" },
  blockChance: { label: "Block", icon: "block" },
  resistance: { label: "All Resistance", icon: "elemental" },
  fireResistance: { label: "Fire Resistance", icon: "fire" },
  coldResistance: { label: "Cold Resistance", icon: "cold" },
  lightningResistance: { label: "Lightning Resistance", icon: "lightning" },
  voidResistance: { label: "Void Resistance", icon: "void" },
  heatGain: { label: "Heat Gain", icon: "heat-gain" },
  startingHeat: { label: "Starting Heat", icon: "heat" },
  heatFromHitsTaken: { label: "Heat from Hits Taken", icon: "heat-from-hits" },
  tenacity: { label: "Tenacity", icon: "tenacity" },
  lifesteal: { label: "Lifesteal", icon: "lifesteal" },
  thorns: { label: "Thorns", icon: "thorns" },
  triggerChance: { label: "Trigger Chance", icon: "trigger" },
  physicalPenetration: { label: "Physical Penetration", icon: "physical" },
  elementalPenetration: { label: "Elemental Penetration", icon: "elemental" },
  burnChance: { label: "Chance to Burn", icon: "burn" },
  chillChance: { label: "Chance to Chill", icon: "chill" },
  shockChance: { label: "Chance to Shock", icon: "shock" },
  corruptionChance: { label: "Chance to Corrupt", icon: "corruption" },
  bleedChance: { label: "Chance to Bleed", icon: "bleed" },
  poisonChance: { label: "Chance to Poison", icon: "poison" },
  ailmentEffect: { label: "Ailment Effect", icon: "ailment-effect" },
};
const FLAT = new Set<keyof DerivedStats>([
  "maxLife",
  "armor",
  "barrier",
  "startingHeat",
  "heatFromHitsTaken",
  "thorns",
]);

/** One line of the comparison: an arrow, the change and the stat it changes. */
export interface CompareRow {
  readonly key: string;
  readonly up: boolean;
  /** Signed change, e.g. "+12 %" or "−40". */
  readonly value: string;
  readonly label: string;
  /** Painted stat icon. */
  readonly icon: GameIconId;
}

/** What equipping an item changes, ready to draw: gains first, then losses. */
export interface CompareView {
  readonly rows: readonly CompareRow[];
  /** Nothing is worn in that slot. */
  readonly empty: boolean;
  /** Requirements not met: the item would do nothing. */
  readonly inactive: boolean;
  /** Overall a gain (or an empty slot). */
  readonly better: boolean;
}

/** At most this many stat rows: hover tooltips, loot cards. */
const MAX_ROWS = 6;
const CARD_ROWS = 4;

const signed = (delta: number, text: string) => `${delta > 0 ? "+" : "−"}${text}`;

/** The comparison as rows: the stats that change most, gains before losses. */
export function compareRows(cmp: ItemComparison, maxRows = MAX_ROWS): CompareView {
  let score = 0;
  const stats: CompareRow[] = [];
  for (const c of cmp.changes) {
    const stat = c.stat as keyof DerivedStats;
    const row = STAT_ROW[stat];
    if (!row) continue;
    const delta = c.after - c.before;
    const flat = FLAT.has(stat);
    if (flat && Math.round(Math.abs(delta)) === 0) continue;
    if (!flat && Math.abs(delta) < 0.0005) continue;
    const value = flat ? `${Math.round(Math.abs(delta))}` : `${formatPercent(Math.abs(delta))} %`;
    stats.push({ key: stat, up: delta > 0, value: signed(delta, value), ...row });
    score += Math.sign(delta) * 0.5;
  }
  // A Trigger Affix won or lost always shows.
  if (cmp.triggerDelta !== 0) {
    stats.unshift({
      key: "trigger",
      up: cmp.triggerDelta > 0,
      value: cmp.triggerDelta > 0 ? `+${cmp.triggerDelta}` : `−${-cmp.triggerDelta}`,
      label: Math.abs(cmp.triggerDelta) === 1 ? "Trigger Affix" : "Trigger Affixes",
      icon: "trigger",
    });
    score += Math.sign(cmp.triggerDelta);
  }
  // The biggest changes (compareItem's order), then gains above losses.
  const kept = stats.slice(0, maxRows);
  const rows = [...kept.filter((r) => r.up), ...kept.filter((r) => !r.up)];
  return {
    rows,
    empty: !cmp.replaces,
    inactive: false,
    better: score >= 0 || !cmp.replaces,
  };
}

const INACTIVE: CompareView = { rows: [], empty: false, inactive: true, better: false };

/** Compare with the item in the slot it would go to (the Ring shortcut picks the Ring). */
export function compareWithEquipped(state: GameState, item: Item, card = false): CompareView {
  // Gear with unmet requirements does nothing, so a stat comparison would read "same".
  if (missingRequirements(item, ITEM_CATALOG, state.hero.attributes).length > 0) return INACTIVE;
  return compareRows(
    compareItem(state, GAME_DATA, item, preferredSlotFor(item)),
    card ? CARD_ROWS : MAX_ROWS,
  );
}
