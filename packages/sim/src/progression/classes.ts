import type { Attribute, Attributes, CombatRules, StatBonuses } from "../combat/types";

/**
 * Classes (docs/design/klassengeruest-v1.md 2): who the Heir is. The class picks its main
 * attribute, its weapon family, the start off hand and attributes, the Class Trait, the look and
 * the Masteries it can grow. Items stay open to every class. The class is fixed for the character.
 */
export interface HeroClass {
  readonly id: string;
  readonly name: string;
  /** The main attribute: it gives % damage of every type (klassengeruest-v1.md 3). */
  readonly mainAttribute: Attribute;
  /** What the class is best at, in two or three words ("Strong attacks"). */
  readonly focus: string;
  /** Weapon base ids of the class's weapon family; the first is the default. */
  readonly weapons: readonly string[];
  /** Off hand base the class starts with, if any. */
  readonly offHand?: string;
  /** A different start off hand for single weapons (the Ashstrider's Dagger: no Quiver). */
  readonly offHandFor?: Readonly<Record<string, string>>;
  readonly startingAttributes: Attributes;
  readonly trait: {
    readonly name: string;
    readonly description: string;
    readonly bonuses?: StatBonuses;
    readonly rules?: CombatRules;
  };
  /** The Prestige branches the class can take, its own ones first (klassen-v2.md section 8). */
  readonly branches: readonly string[];
  /** Own title per class branch ("Blademaster"). */
  readonly titles: Readonly<Record<string, string>>;
  /** Shown next to the preview in the class select: what the class fights with. */
  readonly text: string;
  /**
   * The class's Lineage (phase 5, Timo 2026-10-21): once a character of this class wins the
   * finale, every new character of the account may take +1 point in this class's main attribute.
   */
  readonly lineage?: { readonly name: string };
}

/** Every class can win the finale once for the Lineage; all of them = the title "Emberheir". */
export const LINEAGE_STEPS = 3;

export function getClass(classes: readonly HeroClass[], id: string): HeroClass {
  const found = classes.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown class "${id}"`);
  return found;
}

/** The main Mastery: the one picked at the first Harvest (klassengeruest-v1.md 5). */
export function mainBranch(branches: readonly string[]): string | undefined {
  return branches[0];
}

/**
 * The hero's title (klassen-v2.md section 7): the class name until the first Prestige, then the
 * main branch decides. A class branch gives the class its own title; a branch from before the
 * class paths (an old save) adds an epithet ("Warrior of the Storm").
 */
export function classTitle(
  heroClass: HeroClass,
  branches: readonly string[],
  epithets: Readonly<Record<string, string>>,
): string {
  const main = mainBranch(branches);
  if (!main) return heroClass.name;
  const own = heroClass.titles[main];
  if (own) return own;
  const epithet = epithets[main];
  return epithet ? `${heroClass.name} ${epithet}` : heroClass.name;
}
