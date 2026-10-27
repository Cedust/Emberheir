import type { EnemyDefinition } from "../combat/monsters";
import type { CombatRules, Element, StatBonuses } from "../combat/types";

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
  /**
   * An element Draught is learned the first time the hero beats a foe that hits with this
   * element (draughts-einfuehrung-v1.md); without one it comes with the first Prestige.
   */
  readonly element?: Element;
}

/** Draughts open with the first Prestige, when the Ember Penalty starts to bite (Liora brews). */
export const DRAUGHT_FROM_PRESTIGE = 1;

/** Flask charges one Draught costs for the trip. */
export const DRAUGHT_FLASK_COST = 1;

/** Acorns a brewed Draught costs on top of its Flask charge, in normal kills at the run's boss level. */
export const DRAUGHT_ACORN_KILLS = 3;

/** Whether a foe hits with an element: its Default Attack, a skill or a telegraphed blow. */
export function enemyHitsWith(enemy: EnemyDefinition, element: Element): boolean {
  if (enemy.weapon.damageType === element) return true;
  const skills = [...enemy.skills, ...(enemy.telegraphs ?? []).map((t) => t.skill)];
  return skills.some((skill) =>
    skill.hits.some((hit) => (hit.damageType ?? enemy.weapon.damageType) === element),
  );
}
