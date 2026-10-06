import type { Attributes, CombatRules, StatBonuses } from "../combat/types";

/**
 * Classes (docs/design/klassen-v2.md): a starting point and an identity, not a cage. The class
 * picks the start weapon and off hand, the start attributes, a small Class Trait, the look and
 * the Prestige branches it can grow. Every item and weapon stays open to every class. The class
 * is fixed for the character.
 */
export interface HeroClass {
  readonly id: string;
  readonly name: string;
  /** Weapon base ids the class can start with; the first is the default. */
  readonly weapons: readonly string[];
  /** Off hand base the class starts with, if any. */
  readonly offHand?: string;
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
}

export function getClass(classes: readonly HeroClass[], id: string): HeroClass {
  const found = classes.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown class "${id}"`);
  return found;
}

/**
 * The main branch: the Prestige branch with the most tiers. On a tie the branch that got there
 * first stays, so a title does not flip back and forth.
 */
export function mainBranch(branches: readonly string[]): string | undefined {
  const tiers = new Map<string, number>();
  let main: string | undefined;
  for (const id of branches) {
    const tier = (tiers.get(id) ?? 0) + 1;
    tiers.set(id, tier);
    if (main === undefined || tier > (tiers.get(main) ?? 0)) main = id;
  }
  return main;
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
