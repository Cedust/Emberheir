import type { CombatRules, StatBonuses } from "../combat/types";

/**
 * Draughts (balance-grundlagen-v1.md F): before setting out, one charge of the Ember Flask is
 * brewed into a Draught that lasts until the hero is back in the Camp. Defensive only, never
 * damage, so it answers the next wall (its element, Physical or long fights) without making a
 * build stronger in general.
 */
export interface DraughtDefinition {
  readonly id: string;
  readonly name: string;
  /** Short effect line, e.g. "+25 % Armor". */
  readonly description: string;
  /** The effect in plain words, for the tooltip. */
  readonly explain: string;
  /** Colour of the vial and of the hero's aura in the arena. */
  readonly color: number;
  readonly bonuses?: StatBonuses;
  readonly rules?: CombatRules;
}

/** Draughts open with the first Prestige, when the Ember Penalty starts to bite. */
export const DRAUGHT_FROM_PRESTIGE = 1;

/** Flask charges one Draught costs for the trip. */
export const DRAUGHT_FLASK_COST = 1;
