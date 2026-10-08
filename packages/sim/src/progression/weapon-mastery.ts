import { COMBAT } from "../combat/constants";
import { mergeRules } from "../combat/rules";
import { sumBonuses } from "../combat/stats";
import type {
  AilmentChance,
  AilmentType,
  CombatRules,
  DamageType,
  HeatBehavior,
  SkillDefinition,
  StatBonuses,
  SunderRule,
  TriggerSpec,
  WeaponDefinition,
  WeaponRules,
} from "../combat/types";

/**
 * Weapon Mastery (docs/design/waffe-als-system-v1.md, weapon-mastery-baeume-v1.md): the weapon is
 * chosen with the class and never changes. Instead of weapon drops it grows with the hero: its
 * Weapon Rank follows the hero's level and raises its damage, and every Rank gives a point for
 * its own tree at Kaelen (Refine, Heat Form, Innate Form, three paths, one Keystone).
 */

export type MasteryNodeKind =
  "refine" | "minor" | "notable" | "keystone" | "heatForm" | "innateForm" | "attunement";

/** Exclusive groups: one node of a group is chosen at a time. */
export type MasteryGroup = "heatForm" | "innateForm" | "keystone" | "attunement";

/** What a node does (per rank for multi-rank nodes). */
export interface MasteryEffect {
  readonly bonuses?: StatBonuses;
  /** + Precision (0.05 = +5 percentage points). */
  readonly precision?: number;
  /** + Minimum / Maximum of the Damage Range (0.1 = +10 percentage points of Weapon Damage). */
  readonly rangeMin?: number;
  readonly rangeMax?: number;
  /** Sets the Damage Range's Maximum to at most this (Thousand Cuts). */
  readonly rangeMaxCap?: number;
  /** Sets the Damage Range's Minimum to exactly this (Gore). */
  readonly rangeMinSet?: number;
  /** Multiplies Heat per Hit (Cooling +25 %, Smoldering 30 %). */
  readonly heatPerHit?: number;
  readonly heatForm?: HeatBehavior;
  readonly rules?: CombatRules;
  readonly weaponRules?: MasteryWeaponRules;
  readonly triggers?: readonly TriggerSpec[];
  /** Changes a weapon trigger by id (Heavy Head: Stagger every 3rd Smash). */
  readonly weaponTriggers?: readonly { readonly id: string; readonly n: number }[];
  /** The Innate Form: replaces the weapon's Innate skill. */
  readonly innate?: SkillDefinition;
  /** Attunement: the element of the Default Attack and the Innate (Wand, Staff). */
  readonly attunement?: { readonly damageType: DamageType; readonly ailment: AilmentType };
  /** Extra ailment chances of the Default Attack. */
  readonly ailmentChances?: readonly AilmentChance[];
}

export interface MasteryNode {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: MasteryNodeKind;
  /** Path id (minor and notable nodes). */
  readonly path?: string;
  readonly maxRanks?: number;
  /** Nodes one of which must be learned first. Nodes without links are open from the start. */
  readonly links?: readonly string[];
  /** The node needs a point in Refine instead of a linked node. */
  readonly requiresRefine?: boolean;
  /** Exclusive group (Heat Form, Innate Form, Keystone, Attunement). */
  readonly group?: MasteryGroup;
  /** The group's starting choice: free, chosen until another one is picked (Steady, Fire). */
  readonly default?: boolean;
  readonly effect: MasteryEffect;
  /** Keystones: the word they give the weapon's name ("Parrying Blade"). */
  readonly form?: string;
  /** Position in the Weapon Mastery view (abstract units, weapon centre at 0/0). */
  readonly x: number;
  readonly y: number;
}

export interface MasteryPath {
  readonly id: string;
  readonly name: string;
  readonly theme: string;
  /** Colour of the path's engraving (0xRRGGBB). */
  readonly color: number;
}

/** One weapon's Mastery tree. */
export interface WeaponMasteryTree {
  readonly weaponId: string;
  /** Precision at Rank 0 (0..1). */
  readonly precision: number;
  /** Damage Range at Rank 0, as shares of Weapon Damage. */
  readonly rangeMin: number;
  readonly rangeMax: number;
  readonly paths: readonly MasteryPath[];
  readonly nodes: readonly MasteryNode[];
}

/** A boss's Echo (section 4 of the trees doc): earned by beating the boss, worn on the weapon. */
export interface EchoDefinition {
  readonly id: string;
  readonly name: string;
  /** The act whose boss leaves it. */
  readonly actId: string;
  readonly color: number;
  /** Rules text at a stage (1..7). */
  readonly description: (stage: number) => string;
  /** What the Echo does at a stage; `weaponDamage` scales its strikes with the weapon. */
  readonly effect: (stage: number, weaponDamage: number) => MasteryEffect;
}

/** The hero's Weapon Mastery: learned ranks and the chosen node per exclusive group. */
export interface MasteryState {
  readonly learned: Readonly<Record<string, number>>;
  readonly choices: Readonly<Partial<Record<MasteryGroup, string>>>;
  /** The Echo worn on the weapon. */
  readonly echo: string | null;
  /** Extra points on top of the Weapon Rank (Cheat Mode only). */
  readonly bonusPoints?: number;
}

export const EMPTY_MASTERY: MasteryState = { learned: {}, choices: {}, echo: null };

/** Echo stages per id, and the Prestige of the last boss kill that raised it. */
export type EchoesState = Readonly<
  Record<string, { readonly stage: number; readonly prestige: number }>
>;

export const MASTERY = {
  /** Hero level at which each Weapon Rank is reached (index = Rank). Run caps give 4/7/10/13/16/18/20. */
  rankLevels: [1, 2, 3, 4, 5, 8, 11, 15, 20, 25, 30, 37, 44, 50, 58, 66, 75, 90, 105, 122, 140],
  /** Weapon Damage factor on the weapon's base damage (balance CLI). */
  damageFactor: 1.15,
  /** Precision and Damage Range caps. */
  maxPrecision: 0.95,
  maxRangeMin: 1,
  maxRangeMax: 2,
  /** Rank that opens the Heat Form and the Innate Form. */
  heatFormRank: 3,
  innateFormRank: 5,
  /** Points spent that open the Keystone ring. */
  keystonePoints: 12,
  maxEchoStage: 7,
  /** Gold to reset the tree at Kaelen. */
  respecGold: 50,
} as const;

/** Grades of the weapon by Rank (Timo, 2026-10-08). */
export const WEAPON_GRADES = [
  { name: "Crude", from: 0 },
  { name: "Honed", from: 4 },
  { name: "Tempered", from: 8 },
  { name: "Ascendant", from: 12 },
  { name: "Exalted", from: 16 },
] as const;

export const MAX_WEAPON_RANK = MASTERY.rankLevels.length - 1;

/** Weapon Rank at a hero level. */
export function weaponRank(level: number): number {
  let rank = 0;
  MASTERY.rankLevels.forEach((l, r) => {
    if (level >= l) rank = r;
  });
  return rank;
}

/** Hero level of the next Weapon Rank, or null at the top. */
export function nextRankLevel(rank: number): number | null {
  return MASTERY.rankLevels[rank + 1] ?? null;
}

export function weaponGrade(rank: number): string {
  let grade: string = WEAPON_GRADES[0].name;
  for (const g of WEAPON_GRADES) if (rank >= g.from) grade = g.name;
  return grade;
}

/** Weapon Damage growth at a Rank: a bit flatter than the old item tiers (balance CLI, 2026-10-08). */
export function rankGrowth(rank: number): number {
  const level = MASTERY.rankLevels[Math.min(rank, MAX_WEAPON_RANK)] ?? 1;
  return 1 + (level - 1) / 16;
}

export function masteryNode(tree: WeaponMasteryTree, id: string): MasteryNode {
  const node = tree.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`Unknown Weapon Mastery node "${id}"`);
  return node;
}

/** Default choice of a group, if the group has one. */
export function groupDefault(
  tree: WeaponMasteryTree,
  group: MasteryGroup,
): MasteryNode | undefined {
  return tree.nodes.find((n) => n.group === group && n.default);
}

/** The node chosen in a group (the default while nothing else is chosen). */
export function chosen(
  tree: WeaponMasteryTree,
  state: MasteryState,
  group: MasteryGroup,
): MasteryNode | undefined {
  const id = state.choices[group];
  return id ? tree.nodes.find((n) => n.id === id) : groupDefault(tree, group);
}

/** Ranks of a node; a chosen group node counts as rank 1. */
export function masteryRanks(tree: WeaponMasteryTree, state: MasteryState, id: string): number {
  const node = tree.nodes.find((n) => n.id === id);
  if (!node) return 0;
  if (node.group) return chosen(tree, state, node.group)?.id === id ? 1 : 0;
  return state.learned[id] ?? 0;
}

/** Points spent: ranks of normal nodes plus one per group with a paid (non-default) choice. */
export function pointsSpent(tree: WeaponMasteryTree, state: MasteryState): number {
  let spent = 0;
  for (const [id, ranks] of Object.entries(state.learned)) {
    if (tree.nodes.some((n) => n.id === id && !n.group)) spent += ranks;
  }
  for (const id of Object.values(state.choices)) {
    const node = tree.nodes.find((n) => n.id === id);
    if (node && !node.default && node.kind !== "attunement") spent += 1;
  }
  return spent;
}

export function pointsAvailable(
  tree: WeaponMasteryTree,
  state: MasteryState,
  rank: number,
): number {
  return Math.max(0, rank + (state.bonusPoints ?? 0) - pointsSpent(tree, state));
}

export type MasteryBlockReason =
  | "maxed"
  | "noPoints"
  | "notConnected"
  /** The Weapon Rank is too low (Heat Form from Rank 3, Innate Form from Rank 5). */
  | "rankLocked"
  /** The Keystone ring opens after 12 points. */
  | "keystoneLocked"
  | "chosen";

/** Why a node cannot be learned (or chosen) right now, or undefined if it can. */
export function masteryBlockReason(
  tree: WeaponMasteryTree,
  state: MasteryState,
  id: string,
  rank: number,
): MasteryBlockReason | undefined {
  const node = masteryNode(tree, id);
  const free = pointsAvailable(tree, state, rank);
  if (node.group) {
    const current = chosen(tree, state, node.group);
    if (current?.id === id) return "chosen";
    if (node.group === "heatForm" && rank < MASTERY.heatFormRank) return "rankLocked";
    if (node.group === "innateForm" && rank < MASTERY.innateFormRank) return "rankLocked";
    if (node.group === "keystone") {
      const spentOutside = pointsSpent(tree, state) - (state.choices.keystone ? 1 : 0);
      if (spentOutside < MASTERY.keystonePoints) return "keystoneLocked";
    }
    // Switching inside a paid group is free; the first paid choice costs a point.
    const paid = current !== undefined && !current.default && node.kind !== "attunement";
    const costs = !node.default && node.kind !== "attunement" && !paid;
    return costs && free < 1 ? "noPoints" : undefined;
  }
  const ranks = state.learned[id] ?? 0;
  if (ranks >= (node.maxRanks ?? 1)) return "maxed";
  if (ranks === 0 && !connected(tree, state, node)) return "notConnected";
  return free < 1 ? "noPoints" : undefined;
}

function connected(tree: WeaponMasteryTree, state: MasteryState, node: MasteryNode): boolean {
  if (node.kind === "refine") return true;
  if (node.requiresRefine) {
    return tree.nodes.some((n) => n.kind === "refine" && (state.learned[n.id] ?? 0) > 0);
  }
  // Nodes without links (path roots) are open from the start.
  if (!node.links?.length) return true;
  return (node.links ?? []).some((l) => (state.learned[l] ?? 0) > 0);
}

/** Learns one rank of a node or makes it the group's choice. Throws if it is blocked. */
export function learnMastery(
  tree: WeaponMasteryTree,
  state: MasteryState,
  id: string,
  rank: number,
): MasteryState {
  const reason = masteryBlockReason(tree, state, id, rank);
  if (reason) throw new Error(`Cannot learn "${id}": ${reason}`);
  const node = masteryNode(tree, id);
  if (node.group) {
    const group = node.group;
    const choices = Object.fromEntries(
      Object.entries(state.choices).filter(([g]) => g !== group),
    ) as Partial<Record<MasteryGroup, string>>;
    return { ...state, choices: node.default ? choices : { ...choices, [group]: id } };
  }
  return { ...state, learned: { ...state.learned, [id]: (state.learned[id] ?? 0) + 1 } };
}

/** All active node effects (multi-rank nodes once per rank), Echo included. */
function activeEffects(
  tree: WeaponMasteryTree,
  state: MasteryState,
  echo: { readonly def: EchoDefinition; readonly stage: number } | undefined,
  weaponDamage: number,
): MasteryEffect[] {
  const effects: MasteryEffect[] = [];
  for (const node of tree.nodes) {
    const ranks = masteryRanks(tree, state, node.id);
    for (let i = 0; i < ranks; i++) effects.push(node.effect);
  }
  if (echo) effects.push(echo.def.effect(echo.stage, weaponDamage));
  return effects;
}

/** Everything the weapon gives the hero's fight setup. */
export interface MasteryBuild {
  readonly weapon: WeaponDefinition;
  readonly bonuses: StatBonuses;
  readonly triggers: readonly TriggerSpec[];
  readonly rules: CombatRules;
  readonly weaponRules: WeaponRules;
  /** The Innate skill after Innate Form and Attunement. */
  readonly innate: SkillDefinition | undefined;
  readonly precision: number;
  readonly rangeMin: number;
  readonly rangeMax: number;
  /** Weapon Damage (100 % of the range) at this Rank. */
  readonly weaponDamage: number;
}

/** Builds the hero's weapon from its type, the Weapon Rank, the tree and the worn Echo. */
export function buildMasteryWeapon(
  base: WeaponDefinition,
  tree: WeaponMasteryTree,
  state: MasteryState,
  rank: number,
  innate: SkillDefinition | undefined,
  echo?: { readonly def: EchoDefinition; readonly stage: number },
): MasteryBuild {
  const growth = rankGrowth(rank);
  const weaponDamage = ((base.damage.min + base.damage.max) / 2) * growth * MASTERY.damageFactor;
  const effects = activeEffects(tree, state, echo, weaponDamage);
  let precision = tree.precision;
  let rangeMin = tree.rangeMin;
  let rangeMax = tree.rangeMax;
  let heatPerHit = 1;
  let heatForm: HeatBehavior = "steady";
  let attunement: MasteryEffect["attunement"];
  let innateSkill = innate;
  const bonuses: StatBonuses[] = [];
  const triggers: TriggerSpec[] = [];
  const rules: CombatRules[] = [];
  const weaponRules: MasteryWeaponRules[] = [];
  const ailmentChances: AilmentChance[] = [];
  const patches = new Map<string, number>();
  let maxCap: number | undefined;
  let minSet: number | undefined;
  for (const e of effects) {
    precision += e.precision ?? 0;
    rangeMin += e.rangeMin ?? 0;
    rangeMax += e.rangeMax ?? 0;
    heatPerHit *= e.heatPerHit ?? 1;
    if (e.heatForm) heatForm = e.heatForm;
    if (e.attunement) attunement = e.attunement;
    if (e.innate) innateSkill = e.innate;
    if (e.rangeMaxCap !== undefined) maxCap = Math.min(maxCap ?? Infinity, e.rangeMaxCap);
    if (e.rangeMinSet !== undefined) minSet = e.rangeMinSet;
    if (e.bonuses) bonuses.push(e.bonuses);
    if (e.triggers) triggers.push(...e.triggers);
    if (e.rules) rules.push(e.rules);
    if (e.weaponRules) weaponRules.push(e.weaponRules);
    if (e.ailmentChances) ailmentChances.push(...e.ailmentChances);
    for (const p of e.weaponTriggers ?? []) patches.set(p.id, p.n);
  }
  if (minSet !== undefined) rangeMin = minSet;
  if (maxCap !== undefined) rangeMax = Math.min(rangeMax, maxCap);
  precision = Math.min(MASTERY.maxPrecision, Math.max(0, precision));
  rangeMax = Math.min(MASTERY.maxRangeMax, rangeMax);
  rangeMin = Math.min(MASTERY.maxRangeMin, rangeMax, Math.max(0, rangeMin));
  const merged = mergeWeaponRules(...weaponRules);
  // Focused Will and Anvil: no Glancing Blows at all.
  if (merged.noGlancing) precision = 1;

  const damageType = attunement?.damageType ?? base.damageType;
  const baseAilments = (base.ailmentChances ?? []).map((c) =>
    attunement && isElementalAilment(c.ailment) ? { ...c, ailment: attunement.ailment } : c,
  );
  const weapon: WeaponDefinition = {
    ...base,
    damageType,
    damage: { min: weaponDamage * rangeMin, max: weaponDamage * rangeMax },
    spellPower: growth * MASTERY.damageFactor,
    heatBehavior: heatForm,
    heatPerHit:
      heatForm === "warming"
        ? 0
        : Math.round((COMBAT.warmingHeatPerSecond / base.attacksPerSecond) * heatPerHit),
    precision,
    ...(baseAilments.length || ailmentChances.length
      ? { ailmentChances: [...baseAilments, ...ailmentChances] }
      : {}),
    ...(base.triggers
      ? {
          triggers: base.triggers.map((t) => {
            const n = patches.get(t.id);
            return n && t.condition.kind === "everyNthAttack"
              ? { ...t, condition: { kind: "everyNthAttack" as const, n } }
              : t;
          }),
        }
      : {}),
  };
  const fightRules: WeaponRules = {
    ...Object.fromEntries(
      Object.entries(merged).filter(([k]) => k !== "noGlancing" && k !== "sunder"),
    ),
    ...(merged.sunder
      ? {
          sunder: {
            chance: COMBAT.sunder.chance + (merged.sunder.chance ?? 0),
            maxStacks: COMBAT.sunder.maxStacks + (merged.sunder.maxStacks ?? 0),
            perStack: Math.max(COMBAT.sunder.perStack, merged.sunder.perStack ?? 0),
            duration: Math.max(COMBAT.sunder.duration, merged.sunder.duration ?? 0),
          },
        }
      : {}),
  };
  return {
    weapon,
    bonuses: sumBonuses(...bonuses),
    triggers,
    rules: mergeRules(...rules),
    weaponRules: fightRules,
    innate: innateSkill && attunement ? attuneSkill(innateSkill, attunement) : innateSkill,
    precision,
    rangeMin,
    rangeMax,
    weaponDamage,
  };
}

const ELEMENTAL_AILMENTS: readonly AilmentType[] = ["burn", "chill", "shock", "corruption"];
const isElementalAilment = (a: AilmentType) => ELEMENTAL_AILMENTS.includes(a);

const ELEMENT_WORD: Partial<Record<DamageType, string>> = {
  fire: "Fire",
  cold: "Frost",
  lightning: "Shock",
  void: "Void",
};

/**
 * Attunement: an elemental Innate takes the weapon's element and its ailment. "Firebolt" becomes
 * "Frostbolt", "Fire Lance" becomes "Frost Lance".
 */
export function attuneSkill(
  skill: SkillDefinition,
  attunement: { readonly damageType: DamageType; readonly ailment: AilmentType },
): SkillDefinition {
  const from = skill.hits.find((h) => h.kind === "spell")?.damageType;
  if (!from || from === "physical" || from === attunement.damageType) return skill;
  const fromWord = ELEMENT_WORD[from] ?? "";
  const toWord = ELEMENT_WORD[attunement.damageType] ?? "";
  const rename = (text: string) => (fromWord ? text.split(fromWord).join(toWord) : text);
  return {
    ...skill,
    id: `${skill.id}@${attunement.damageType}`,
    name: rename(skill.name),
    description: rename(skill.description),
    tags: skill.tags.map((t) => (t === from ? attunement.damageType : t)),
    hits: skill.hits.map((h) =>
      h.kind === "spell" && h.damageType === from
        ? {
            ...h,
            damageType: attunement.damageType,
            ...(h.ailmentChances
              ? {
                  ailmentChances: h.ailmentChances.map((c) =>
                    isElementalAilment(c.ailment) ? { ...c, ailment: attunement.ailment } : c,
                  ),
                }
              : {}),
          }
        : h,
    ),
  };
}

/**
 * WeaponRules as nodes give them: Sunder in parts (they add up onto `COMBAT.sunder`), plus the
 * build-time flag "no Glancing Blows".
 */
export type MasteryWeaponRules = Omit<WeaponRules, "sunder"> & {
  readonly sunder?: Partial<SunderRule>;
  readonly noGlancing?: boolean;
};

/** Combines Weapon Mastery rules: numbers add (multipliers multiply), lists join, flags switch on. */
export function mergeWeaponRules(...sources: readonly MasteryWeaponRules[]): MasteryWeaponRules {
  const out: Record<string, unknown> = {};
  const multiply = new Set([
    "damageDealt",
    "stunDuration",
    "blockMultiplier",
    "critBleedMultiplier",
  ]);
  const lists = new Set([
    "conditionalDamage",
    "conditionalAttackSpeed",
    "critAfter",
    "refreshOnHit",
    "enemyHeatGain",
  ]);
  for (const src of sources) {
    for (const [key, value] of Object.entries(src)) {
      if (value === undefined) continue;
      const prev = out[key];
      if (lists.has(key)) {
        out[key] = [...((prev as unknown[]) ?? []), ...(value as unknown[])];
      } else if (typeof value === "number") {
        out[key] = multiply.has(key)
          ? ((prev as number | undefined) ?? 1) * value
          : ((prev as number | undefined) ?? 0) + value;
      } else if (typeof value === "boolean") {
        out[key] = (prev as boolean | undefined) || value;
      } else if (key === "sunder") {
        // Sunder adds up: more chance and stacks, the longest duration, the strongest stack.
        const a = (prev as Partial<SunderRule> | undefined) ?? {};
        const b = value as Partial<SunderRule>;
        out[key] = {
          chance: (a.chance ?? 0) + (b.chance ?? 0),
          maxStacks: (a.maxStacks ?? 0) + (b.maxStacks ?? 0),
          perStack: Math.max(a.perStack ?? 0, b.perStack ?? 0),
          duration: Math.max(a.duration ?? 0, b.duration ?? 0),
        };
      } else if (key === "ailmentDurationBy") {
        const merged: Record<string, number> = { ...((prev as Record<string, number>) ?? {}) };
        for (const [a, v] of Object.entries(value as Record<string, number>)) {
          merged[a] = (merged[a] ?? 0) + v;
        }
        out[key] = merged;
      } else {
        // Objects (Sunder, streak, ...): the later source wins.
        out[key] = value;
      }
    }
  }
  return out as MasteryWeaponRules;
}

/** The weapon's name from the build: grade + Keystone form (or weapon) + "of" Echo. */
export function weaponTitle(
  base: WeaponDefinition,
  tree: WeaponMasteryTree,
  state: MasteryState,
  rank: number,
  echo: EchoDefinition | undefined,
): string {
  const form = chosen(tree, state, "keystone")?.form ?? base.name;
  return `${weaponGrade(rank)} ${form}${echo ? ` of ${echo.name}` : ""}`;
}
