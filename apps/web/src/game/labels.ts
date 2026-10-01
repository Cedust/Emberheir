import type {
  EquipBlockReason,
  LearnBlockReason,
  SpoilsCard,
  UnequipBlockReason,
} from "@emberheir/sim";

export const EQUIP_BLOCK_TEXT: Record<EquipBlockReason, string> = {
  fight: "Not during a fight",
  requirements: "Requirements not met",
  noSlot: "No slot for this item",
  noRoom: "No room for the old item",
};

export const UNEQUIP_BLOCK_TEXT: Record<UnequipBlockReason, string> = {
  fight: "Not during a fight",
  mainHand: "Swap weapons instead",
  noRoom: "No room",
  empty: "Empty",
};

export const LEARN_BLOCK_TEXT: Record<LearnBlockReason, string> = {
  maxed: "Fully learned",
  notConnected: "Learn a connected node first",
  noSkillPoints: "No Skill Points left",
  noEmber: "Needs Harvester's Ember",
};

export function spoilsLabel(card: SpoilsCard, essenceName: string): string {
  switch (card.kind) {
    case "flaskCharge":
      return `+${card.amount} Flask Charge`;
    case "reforgeStones":
      return `${card.amount} Reforge Stones`;
    case "essence":
      return `${card.amount} ${essenceName}`;
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
  }
}
