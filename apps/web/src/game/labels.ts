import { GAME_DATA } from "@emberheir/content";
import {
  type CraftBlockReason,
  type EquipBlockReason,
  type MoveBlockReason,
  type ForgetBlockReason,
  type LearnBlockReason,
  type UnequipBlockReason,
  harvestAct,
} from "@emberheir/sim";

export const EQUIP_BLOCK_TEXT: Record<EquipBlockReason, string> = {
  fight: "Not during a fight",
  camp: "The Supply Wagon is in the Camp",
  requirements: "Requirements not met",
  level: "Your level is too low",
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
  keystoneLimit: "All Keystone places are taken. More open at Prestige 2, 4 and 6",
  branchLocked: "Unlock this branch at a Prestige",
  forkTaken: "The other path of this fork is learned",
};

export const FORGET_BLOCK_TEXT: Record<ForgetBlockReason, string> = {
  notLearned: "Not learned",
  start: "Your class starts here",
  holdsOthers: "Other learned nodes hang on this one",
};

export const MOVE_BLOCK_TEXT: Record<MoveBlockReason, string> = {
  camp: "The Supply Wagon is in the Camp",
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
  gold: "Not enough Gold",
  dust: "Not enough Salvage Dust",
  reforgeStones: "Not enough Reforge Stones",
  ascensionShards: "Needs an Ascension Shard (bosses, sometimes Elites)",
  runesmith: "Nyssa joins after your first trip into the Rotwood",
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
};

/** Short name of the boss whose fall brings The Harvest in a run (the newest act's boss). */
export function harvestBoss(prestige: number): string {
  return harvestAct(GAME_DATA, prestige).boss.name.split(",")[0] ?? "";
}
