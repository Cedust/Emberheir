import { GAME_DATA, echoStageName } from "@emberheir/content";
import {
  type AilmentType,
  type DamageType,
  EMPTY_MASTERY,
  type GameState,
  type HeatBehavior,
  type MasteryBuild,
  type MasteryState,
  type WeaponMasteryTree,
  WEAPON_GRADES,
  activePath,
  buildMasteryWeapon,
  chosen,
  describeBonuses,
  describeTrigger,
  formatPercent,
  heroWeapon,
  heroWeaponName,
  heroWeaponRank,
  knownSkills,
  masteryPointsLeft,
  masteryTree,
  speedValue,
  weaponBase,
  weaponGrade,
  weaponGradeIndex,
  weaponTitle,
  wornEcho,
} from "@emberheir/sim";

/**
 * Everything the weapon tooltip shows (ui/WeaponTooltip.tsx), from the hero's Heirloom: the
 * weapon as the fight sees it, its grade and Rank, path, Heat Form, Innate, Keystone and Echo.
 */

/** Grade colours, Crude to Exalted (the weapon's temperature). */
export const GRADE_COLOR = ["#9a8c78", "#d0803a", "#ff7a2a", "#ffc04a", "#fff0c8"];

export interface WeaponTip {
  readonly weaponId: string;
  /** "Sword". */
  readonly baseName: string;
  /** "Honed Parrying Blade of Ashfall Wrath". */
  readonly name: string;
  readonly rank: number;
  readonly grade: number;
  readonly gradeName: string;
  readonly nextGrade?: { readonly name: string; readonly rank: number };
  readonly melee: boolean;
  /** The Keystone the painting shows, or null for the plain weapon. */
  readonly keystoneId: string | null;
  readonly damage: { readonly min: number; readonly max: number; readonly type: DamageType };
  /** The weapon's own Speed (0.8 attacks per second is 100). */
  readonly speed: number;
  readonly precision: number;
  readonly rangeMin: number;
  readonly rangeMax: number;
  readonly heatForm: HeatBehavior;
  readonly innate?: { readonly name: string; readonly level: number; readonly text: string };
  /** The Heirloom path, once a point is in it. */
  readonly path?: {
    readonly name: string;
    readonly damageType: DamageType;
    readonly ailment: AilmentType | "stun";
    readonly color: number;
  };
  readonly keystone?: { readonly name: string; readonly text: string };
  readonly echo?: {
    readonly name: string;
    readonly stage: string;
    readonly text: string;
    readonly color: number;
  };
  /** Implicit and ailment chances of the Default Attack. */
  readonly lines: readonly string[];
  /** The weapon's own triggers ("When Hit: 15 % chance to strike back"). */
  readonly triggers: readonly string[];
  /** Heirloom Points to spend (only for the hero's own weapon). */
  readonly pointsLeft?: number;
}

const AILMENT_NAMES: Readonly<Record<string, string>> = {
  bleed: "Bleed",
  poison: "Poison",
  burn: "Burn",
  chill: "Chill",
  shock: "Shock",
  corruption: "Corruption",
};

function learnedPath(tree: WeaponMasteryTree, mastery: MasteryState) {
  const path = activePath(tree, mastery);
  const walked = tree.nodes.some((n) => n.path === path?.id && (mastery.learned[n.id] ?? 0) > 0);
  return walked ? path : undefined;
}

function tipOf(
  weaponId: string,
  build: MasteryBuild,
  tree: WeaponMasteryTree,
  mastery: MasteryState,
  rank: number,
  name: string,
  innateLevel: number,
): Omit<WeaponTip, "echo" | "pointsLeft"> {
  const base = weaponBase(GAME_DATA, weaponId);
  const { weapon } = build;
  const grade = weaponGradeIndex(rank);
  const next = WEAPON_GRADES[grade + 1];
  const path = learnedPath(tree, mastery);
  const keystone = mastery.choices.keystone ? chosen(tree, mastery, "keystone") : undefined;
  const ailments = (weapon.ailmentChances ?? []).map(
    (a) => `${formatPercent(a.chance)} % chance to ${AILMENT_NAMES[a.ailment] ?? a.ailment}`,
  );
  return {
    weaponId,
    baseName: base.name,
    name,
    rank,
    grade,
    gradeName: weaponGrade(rank),
    ...(next ? { nextGrade: { name: next.name, rank: next.from } } : {}),
    melee: base.range === "melee",
    keystoneId: keystone?.id ?? null,
    damage: { min: weapon.damage.min, max: weapon.damage.max, type: weapon.damageType },
    speed: speedValue(weapon.attacksPerSecond),
    precision: build.precision,
    rangeMin: build.rangeMin,
    rangeMax: build.rangeMax,
    heatForm: weapon.heatBehavior,
    ...(build.innate
      ? {
          innate: {
            name: build.innate.name,
            level: innateLevel,
            text: build.innate.description,
          },
        }
      : {}),
    ...(path
      ? {
          path: {
            name: path.name,
            damageType: path.infusion.damageType,
            ailment: path.infusion.ailment,
            color: path.color,
          },
        }
      : {}),
    ...(keystone ? { keystone: { name: keystone.name, text: keystone.description } } : {}),
    lines: [...describeBonuses(weapon.implicit ?? {}), ...ailments],
    triggers: (weapon.triggers ?? []).map(describeTrigger),
  };
}

/** The hero's own weapon, as it fights now. */
export function heroWeaponTip(state: GameState): WeaponTip {
  const { weaponId, mastery } = state.hero;
  const tree = masteryTree(GAME_DATA, weaponId);
  const build = heroWeapon(state, GAME_DATA);
  const rank = heroWeaponRank(state);
  const innate = knownSkills(state, GAME_DATA, build.weapon).find((s) => s.startSkill);
  const echo = wornEcho(state, GAME_DATA);
  return {
    ...tipOf(
      weaponId,
      build,
      tree,
      mastery,
      rank,
      heroWeaponName(state, GAME_DATA),
      innate?.level ?? 1,
    ),
    ...(echo
      ? {
          echo: {
            name: echo.def.name,
            stage: echoStageName(echo.stage),
            text: echo.def.description(echo.stage),
            color: echo.def.color,
          },
        }
      : {}),
    pointsLeft: masteryPointsLeft(state, GAME_DATA),
  };
}

/** A weapon as a new hero gets it (class select): Rank 0, nothing learned. */
export function newWeaponTip(weaponId: string): WeaponTip {
  const base = weaponBase(GAME_DATA, weaponId);
  const tree = masteryTree(GAME_DATA, weaponId);
  const build = buildMasteryWeapon(
    base,
    tree,
    EMPTY_MASTERY,
    0,
    GAME_DATA.startSkills[weaponId],
    undefined,
    1,
  );
  const name = weaponTitle(base, tree, EMPTY_MASTERY, 0, undefined);
  return tipOf(weaponId, build, tree, EMPTY_MASTERY, 0, name, 1);
}
