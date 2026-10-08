import { GAME_DATA } from "@emberheir/content";
import {
  type CraftBlockReason,
  type EquipBlockReason,
  type MoveBlockReason,
  type LearnBlockReason,
  type SpoilsCard,
  type UnequipBlockReason,
  harvestAct,
} from "@emberheir/sim";

export const EQUIP_BLOCK_TEXT: Record<EquipBlockReason, string> = {
  fight: "Not during a fight",
  camp: "The Supply Wagon is in the Camp",
  requirements: "Requirements not met",
  noSlot: "No slot for this item",
  noRoom: "No room for the old item",
};

export const UNEQUIP_BLOCK_TEXT: Record<UnequipBlockReason, string> = {
  fight: "Not during a fight",
  noRoom: "No room",
  empty: "Empty",
};

export const LEARN_BLOCK_TEXT: Record<LearnBlockReason, string> = {
  maxed: "Fully learned",
  notConnected: "Learn a connected node first",
  noSkillPoints: "No Skill Points left",
  noEmber: "Needs Harvester's Ember",
  branchLocked: "Unlock this branch at a Prestige",
};

export const MOVE_BLOCK_TEXT: Record<MoveBlockReason, string> = {
  camp: "The Supply Wagon is in the Camp",
  burned: "The Supply Wagon burned. Thoric patches it on your first return",
  noRoom: "No room",
};

export const CRAFT_BLOCK_TEXT: Record<CraftBlockReason, string> = {
  camp: "Only in the Camp",
  mystic: "Liora joins after the act boss falls",
  noItem: "Choose an item",
  maxTier: "Already at the highest Tier",
  requirements: "You would not meet the new requirements. Unequip it first.",
  noAffixes: "This item has no affixes",
  noAffix: "Choose an affix",
  locked: "Locked: only the locked-in affix can change",
  trigger: "Trigger Affixes cannot be changed",
  unknownEssence: "Choose an Essence",
  affixDoesNotFit: "This Essence does not fit this item",
  duplicateAffix: "The item already has this affix",
  gold: "Not enough Gold",
  dust: "Not enough Salvage Dust",
  reforgeStones: "Not enough Reforge Stones",
  ascensionShards: "Needs an Ascension Shard (bosses, sometimes Elites)",
  essence: "Not enough Essence",
  runesmith: "Eldrin joins after your first trip into the Rotwood",
  notNormal: "Only Normal items take Sockets and Runes",
  maxSockets: "No more Sockets fit this base",
  hasRunes: "Runes are already socketed",
  noSocket: "No free Socket",
  fixed: "This item never changes",
  unknownRune: "Choose a Rune",
  maxRank: "Already the highest Rune",
  sold: "Sold",
  noStock: "Not in stock",
  noRoom: "No room in the inventory",
  runes: "Not enough Runes",
  unknownPart: "Learn both parts first: salvage items with that trigger",
  kindled: "Only one kindled trigger per item",
  notTrigger: "Choose a trigger to replace",
  noTriggerPlace: "Normal items have no trigger place",
  kindling: "Needs Kindling (Elite and boss Spoils)",
};

export function spoilsLabel(card: SpoilsCard, essenceName: string): string {
  switch (card.kind) {
    case "flaskCharge":
      return `+${card.amount} Flask Charge`;
    case "reforgeStones":
      return `${card.amount} Reforge Stones`;
    case "essence":
      return `${card.amount} ${essenceName}`;
    case "kindling":
      return `${card.amount} Kindling`;
  }
}

export function spoilsHint(card: SpoilsCard): string {
  switch (card.kind) {
    case "flaskCharge":
      return "One more heal from the Ember Flask in this act.";
    case "reforgeStones":
      return "Reroll all affixes of an item at the Mystic.";
    case "essence":
      return "Imbue: set one stat affix at the Mystic.";
    case "kindling":
      return "Kindle: build a trigger from the Codex at the Mystic.";
  }
}

/** Short name of the boss whose fall brings The Harvest in a run (the newest act's boss). */
export function harvestBoss(prestige: number): string {
  return harvestAct(GAME_DATA, prestige).boss.name.split(",")[0] ?? "";
}
