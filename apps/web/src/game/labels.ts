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
  mystic: "Liora is not here yet",
  noItem: "Choose an item",
  maxTier: "Already at the highest Tier",
  requirements: "Requirements not met",
  noAffixes: "This item has no affixes",
  noAffix: "Choose an affix",
  locked: "Locked: only the locked-in affix can change",
  trigger: "Trigger Affixes cannot be changed",
  acorns: "Not enough Acorns",
  ash: "Not enough Ash",
  emberCoal: "Not enough Ember Coal",
  phoenixFeathers: "Not enough Phoenix Feathers",
  runesmith: "Nyssa is not here yet",
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
  unknownPart: "Part not learned",
  kindled: "Only one kindled trigger per item",
  notTrigger: "Choose a trigger to replace",
  noTriggerPlace: "Normal items have no trigger place",
  greater: "Already has a Greater Affix",
  noGreater: "Awaken a Greater Affix first",
  maxGreater: "Already Greater V",
  noTarget: "No affix here can become Greater",
  cinderglass: "Not enough Cinderglass",
};

/** Short name of the boss whose fall brings The Harvest in a run (the newest act's boss). */
export function harvestBoss(prestige: number): string {
  return harvestAct(GAME_DATA, prestige).boss.name.split(",")[0] ?? "";
}
