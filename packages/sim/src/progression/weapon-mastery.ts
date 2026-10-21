import { COMBAT, MIGHTY_SHARE } from "../combat/constants";
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
 * Weapon Mastery (docs/design/waffe-als-system-v1.md, weapon-mastery-v2.md): the weapon is chosen
 * with the class and never changes. Instead of weapon drops it grows with the hero: its Weapon
 * Rank follows the hero's level and raises its damage, and every Rank gives a point for its own
 * tree at Kaelen (Refine, Heat Form, Innate Form, three paths, one Keystone).
 *
 * A path (v2): Technique I (3 ranks) → Fork 1 (one of two Notables) → Technique II (3 ranks) →
 * Fork 2 (one of two) → Path Master.
 */

export type MasteryNodeKind =
  "refine" | "technique" | "notable" | "master" | "keystone" | "heatForm" | "innateForm";

/** Exclusive groups: one node of a group is chosen at a time. */
export type MasteryGroup = "heatForm" | "innateForm" | "keystone";

/** What a node does (per rank for multi-rank nodes). */
export interface MasteryEffect {
  readonly bonuses?: StatBonuses;
  /** + Precision (0.05 = +5 percentage points). */
  readonly precision?: number;
  /** + Minimum / Maximum of the Damage Range (0.1 = +10 percentage points of Weapon Damage). */
  readonly rangeMin?: number;
  readonly rangeMax?: number;
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
  /** Extra ailment chances of the Default Attack. */
  readonly ailmentChances?: readonly AilmentChance[];
  /** The Innate Form: replaces the weapon's Innate skill. */
  readonly innate?: SkillDefinition;
  /** Changes the Innate skill: more damage (adds up), Heat Cost, always Mighty. */
  readonly innatePatch?: InnatePatch;
  /** No more Glancing Blows; Precision above `above` becomes Crit Chance (Master of the Edge). */
  readonly precisionToCrit?: { readonly above: number };
}

/** How a node changes the weapon's Innate skill. */
export interface InnatePatch {
  /** More damage (0.1 = +10 %), adds up across ranks and nodes. */
  readonly damage?: number;
  /** Heat Cost change (−4 = 4 less). */
  readonly cost?: number;
  /** Its weapon hits are always Mighty Hits. */
  readonly mighty?: boolean;
}

export interface MasteryNode {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: MasteryNodeKind;
  /** Path id (technique, notable and master nodes). */
  readonly path?: string;
  /** Fork of a path: of the nodes with the same fork id only one can be learned. */
  readonly fork?: string;
  readonly maxRanks?: number;
  /** Nodes one of which must be learned first. Nodes without links are open from the start. */
  readonly links?: readonly string[];
  /** The node needs a point in Refine instead of a linked node. */
  readonly requiresRefine?: boolean;
  /** Exclusive group (Heat Form, Innate Form, Keystone). */
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

/**
 * A Heirloom path's Infusion (klassengeruest-v1.md 4): the damage type of the weapon's hits and
 * the ailment they apply. Stun is the Mace's core instead of an ailment.
 */
export interface Infusion {
  readonly damageType: DamageType;
  readonly ailment: AilmentType | "stun";
  /** Chance of the Default Attack to apply the ailment (none for Stun). */
  readonly chance: number;
}

/** One of the weapon's three builds: its first point sets the Infusion. */
export interface MasteryPath {
  readonly id: string;
  readonly name: string;
  readonly theme: string;
  /** Colour of the path's engraving (0xRRGGBB). */
  readonly color: number;
  readonly infusion: Infusion;
}

/** One weapon's Mastery tree. */
export interface WeaponMasteryTree {
  readonly weaponId: string;
  /** Precision at Rank 0 (0..1). */
  readonly precision: number;
  /** Damage Range at Rank 0, as shares of Weapon Damage. */
  readonly rangeMin: number;
  readonly rangeMax: number;
  /**
   * Weapon Damage factor that keeps the weapon's average hit when its Damage Range changed
   * (v2 ranges are wider; the range sets the style, not the strength). Default 1.
   */
  readonly damageScale?: number;
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
  /**
   * Hero level at which each Weapon Rank is reached (index = Rank). The run's boss levels
   * (10, 20, 30, 45, 60, 75, 90) give Ranks 4, 7, 10, 13, 16, 18 and 20.
   */
  rankLevels: [1, 2, 4, 7, 10, 13, 16, 20, 23, 26, 30, 35, 40, 45, 50, 55, 60, 68, 75, 83, 90],
  /**
   * Highest Rank per run (index = Prestige): farming past a wall gives Weapon Damage (it follows
   * the level), but no extra Mastery Points (level-v2.md section 5).
   */
  rankCaps: [4, 7, 10, 13, 16, 18, 20],
  /** Weapon Damage factor on the weapon's base damage (balance CLI). */
  damageFactor: 1.15,
  /** Precision, Damage Range and Parry caps. */
  maxPrecision: 0.95,
  maxRangeMin: 1,
  maxRangeMax: 2.2,
  maxParry: 0.3,
  /** Rank that opens the Heat Form and the Innate Form. */
  heatFormRank: 3,
  innateFormRank: 5,
  /** Points spent that open the Keystone ring. */
  keystonePoints: 12,
  maxEchoStage: 7,
  /** Acorns to reset the tree at Kaelen. */
  respecAcorns: 50,
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

/** Weapon Rank at a hero level, capped by the run (`MASTERY.rankCaps`) when a Prestige is given. */
export function weaponRank(level: number, prestige?: number): number {
  let rank = 0;
  MASTERY.rankLevels.forEach((l, r) => {
    if (level >= l) rank = r;
  });
  if (prestige === undefined) return rank;
  const caps = MASTERY.rankCaps;
  return Math.min(rank, caps[Math.min(prestige, caps.length - 1)] ?? MAX_WEAPON_RANK);
}

/** Index of the Weapon Grade at a Rank (0 = Crude): the Innate gains a level per Grade. */
export function weaponGradeIndex(rank: number): number {
  return WEAPON_GRADES.reduce((index, g, i) => (rank >= g.from ? i : index), 0);
}

export function weaponGrade(rank: number): string {
  let grade: string = WEAPON_GRADES[0].name;
  for (const g of WEAPON_GRADES) if (rank >= g.from) grade = g.name;
  return grade;
}

/** Weapon Damage growth at a hero level (level-v2.md section 5): +3 % per level, compounding. */
export function levelGrowth(level: number): number {
  return (1 + COMBAT.heroLevelGrowth.damage) ** (Math.max(1, level) - 1);
}

/** Weapon Damage growth at the level a Rank is reached. */
export function rankGrowth(rank: number): number {
  return levelGrowth(MASTERY.rankLevels[Math.min(rank, MAX_WEAPON_RANK)] ?? 1);
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
    if (node && !node.default) spent += 1;
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
  /** The other side of the fork is learned. */
  | "forkTaken"
  /** Another path is the weapon's build (one path at a time, a reset at Kaelen switches). */
  | "pathTaken"
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
    const paid = current !== undefined && !current.default;
    const costs = !node.default && !paid;
    return costs && free < 1 ? "noPoints" : undefined;
  }
  const ranks = state.learned[id] ?? 0;
  if (ranks >= (node.maxRanks ?? 1)) return "maxed";
  if (ranks === 0 && node.path && learnedPath(tree, state, node.path)) return "pathTaken";
  if (ranks === 0 && forkTaken(tree, state, node)) return "forkTaken";
  if (ranks === 0 && !connected(tree, state, node)) return "notConnected";
  return free < 1 ? "noPoints" : undefined;
}

/** The path whose nodes are learned, if it is not `except`. */
function learnedPath(
  tree: WeaponMasteryTree,
  state: MasteryState,
  except?: string,
): string | undefined {
  for (const n of tree.nodes) {
    if (n.path && n.path !== except && (state.learned[n.id] ?? 0) > 0) return n.path;
  }
  return undefined;
}

/**
 * The weapon's build: the path with learned nodes, or the first path (the class's core) while
 * none is learned.
 */
export function activePath(tree: WeaponMasteryTree, state: MasteryState): MasteryPath | undefined {
  const id = learnedPath(tree, state);
  return tree.paths.find((p) => p.id === id) ?? tree.paths[0];
}

function forkTaken(tree: WeaponMasteryTree, state: MasteryState, node: MasteryNode): boolean {
  if (!node.fork) return false;
  return tree.nodes.some(
    (n) => n.fork === node.fork && n.id !== node.id && (state.learned[n.id] ?? 0) > 0,
  );
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
  /** The Innate skill after Innate Form and Infusion. */
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
  /** Hero level: Weapon Damage follows it. Default: the level the Rank is reached at. */
  level?: number,
): MasteryBuild {
  const growth = level === undefined ? rankGrowth(rank) : levelGrowth(level);
  const weaponDamage =
    ((base.damage.min + base.damage.max) / 2) *
    growth *
    MASTERY.damageFactor *
    (tree.damageScale ?? 1);
  const effects = activeEffects(tree, state, echo, weaponDamage);
  let precision = tree.precision;
  let rangeMin = tree.rangeMin;
  let rangeMax = tree.rangeMax;
  let heatPerHit = 1;
  let heatForm: HeatBehavior = "steady";
  const infusion = activePath(tree, state)?.infusion;
  let innateSkill = innate;
  const bonuses: StatBonuses[] = [];
  const triggers: TriggerSpec[] = [];
  const rules: CombatRules[] = [];
  const weaponRules: MasteryWeaponRules[] = [];
  const ailmentChances: AilmentChance[] = [];
  const patches = new Map<string, number>();
  let minSet: number | undefined;
  const innatePatches: InnatePatch[] = [];
  let toCrit: number | undefined;
  for (const e of effects) {
    if (e.innatePatch) innatePatches.push(e.innatePatch);
    if (e.precisionToCrit) toCrit = Math.min(toCrit ?? 1, e.precisionToCrit.above);
    precision += e.precision ?? 0;
    rangeMin += e.rangeMin ?? 0;
    rangeMax += e.rangeMax ?? 0;
    heatPerHit *= e.heatPerHit ?? 1;
    if (e.heatForm) heatForm = e.heatForm;
    if (e.innate) innateSkill = e.innate;
    if (e.rangeMinSet !== undefined) minSet = e.rangeMinSet;
    if (e.bonuses) bonuses.push(e.bonuses);
    if (e.triggers) triggers.push(...e.triggers);
    if (e.rules) rules.push(e.rules);
    if (e.weaponRules) weaponRules.push(e.weaponRules);
    if (e.ailmentChances) ailmentChances.push(...e.ailmentChances);
    for (const p of e.weaponTriggers ?? []) patches.set(p.id, p.n);
  }
  if (minSet !== undefined) rangeMin = minSet;
  // Master of the Edge: Precision past the mark turns into Crit Chance.
  const rawPrecision = precision;
  if (toCrit !== undefined && rawPrecision > toCrit) {
    bonuses.push({ critChance: rawPrecision - toCrit });
  }
  precision = Math.min(MASTERY.maxPrecision, Math.max(0, precision));
  rangeMax = Math.min(MASTERY.maxRangeMax, rangeMax);
  rangeMin = Math.min(MASTERY.maxRangeMin, rangeMax, Math.max(0, rangeMin));
  const merged = mergeWeaponRules(...weaponRules);
  // Focused Will, Anvil and Master of the Edge: no Glancing Blows at all.
  if (merged.noGlancing || toCrit !== undefined) precision = 1;

  const damageType = infusion?.damageType ?? base.damageType;
  // The Infusion replaces the weapon's own ailments with the path's (Stun has its Stagger).
  const baseAilments: AilmentChance[] = !infusion
    ? [...(base.ailmentChances ?? [])]
    : infusion.ailment === "stun"
      ? []
      : [{ ailment: infusion.ailment, chance: infusion.chance }];
  const weapon: WeaponDefinition = {
    ...base,
    damageType,
    implicit: infuseImplicit(base.implicit, damageType),
    ...(infusion && infusion.ailment !== "stun" ? { ailment: infusion.ailment } : {}),
    damage: { min: weaponDamage * rangeMin, max: weaponDamage * rangeMax },
    spellPower: growth * MASTERY.damageFactor,
    heatBehavior: heatForm,
    heatPerHit:
      heatForm === "warming"
        ? 0
        : Math.round((COMBAT.warmingHeatPerSecond / base.attacksPerSecond) * heatPerHit),
    precision,
    mightyAt: weaponDamage * MIGHTY_SHARE,
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
  const patched = innateSkill ? patchInnate(innateSkill, innatePatches) : undefined;
  const finalInnate = patched && infusion ? infuseSkill(patched, infusion) : patched;
  const fightRules: WeaponRules = {
    ...Object.fromEntries(
      Object.entries(merged).filter(([k]) => k !== "noGlancing" && k !== "sunder"),
    ),
    ...(merged.parry ? { parry: Math.min(MASTERY.maxParry, merged.parry) } : {}),
    ...(finalInnate ? { innateId: finalInnate.id } : {}),
    ...(merged.sunder
      ? {
          sunder: {
            chance: COMBAT.sunder.chance + (merged.sunder.chance ?? 0),
            maxStacks: Math.max(1, COMBAT.sunder.maxStacks + (merged.sunder.maxStacks ?? 0)),
            perStack: Math.max(COMBAT.sunder.perStack, merged.sunder.perStack ?? 0),
            duration: Math.max(COMBAT.sunder.duration, merged.sunder.duration ?? 0),
          },
        }
      : {}),
  };
  return {
    weapon,
    bonuses: sumBonuses(...bonuses),
    triggers: mergeTriggers(triggers),
    rules: mergeRules(...rules),
    weaponRules: fightRules,
    innate: finalInnate,
    precision,
    rangeMin,
    rangeMax,
    weaponDamage,
  };
}

/** Ranks of a trigger node give the same trigger several times: their chances add up. */
function mergeTriggers(triggers: readonly TriggerSpec[]): TriggerSpec[] {
  const out: TriggerSpec[] = [];
  for (const t of triggers) {
    const at = out.findIndex((o) => o.id === t.id);
    const prev = out[at];
    if (!prev) {
      out.push(t);
      continue;
    }
    out[at] = { ...prev, chance: Math.min(1, (prev.chance ?? 1) + (t.chance ?? 1)) };
  }
  return out;
}

/** Applies the Innate patches of the learned nodes (Tempo, Reload, Hooked Rend, Payload). */
export function patchInnate(
  skill: SkillDefinition,
  patches: readonly InnatePatch[],
): SkillDefinition {
  if (patches.length === 0) return skill;
  const more = 1 + patches.reduce((sum, p) => sum + (p.damage ?? 0), 0);
  const cost = patches.reduce((sum, p) => sum + (p.cost ?? 0), 0);
  const mighty = patches.some((p) => p.mighty);
  return {
    ...skill,
    heatCost: Math.max(0, skill.heatCost + cost),
    hits: skill.hits.map((h) =>
      h.kind === "weapon"
        ? { ...h, multiplier: h.multiplier * more, ...(mighty ? { mighty: true } : {}) }
        : { ...h, damage: { min: h.damage.min * more, max: h.damage.max * more } },
    ),
  };
}

const ELEMENT_WORD: Partial<Record<DamageType, string>> = {
  fire: "Fire",
  cold: "Frost",
  lightning: "Shock",
  void: "Void",
};

/** A Physical weapon infused with an element turns its Physical implicit elemental (and back). */
function infuseImplicit(implicit: StatBonuses, damageType: DamageType): StatBonuses {
  const elemental = damageType !== "physical";
  const swap: Record<string, string> = elemental
    ? { physicalDamage: "elementalDamage", physicalPenetration: "elementalPenetration" }
    : { elementalDamage: "physicalDamage", elementalPenetration: "physicalPenetration" };
  return Object.fromEntries(
    Object.entries(implicit).map(([k, v]) => [swap[k] ?? k, v]),
  ) as StatBonuses;
}

/**
 * Infusion (klassengeruest-v1.md 4): the Innate takes the path's damage type and ailment.
 * "Shockbolt" becomes "Voidbolt", "Explosive Bolt" deals Cold and Chills on a Cold Crossbow.
 * Skills that buff an ailment chance (the Dagger's Coats) coat the path's ailment instead.
 */
const AILMENT_VERB: Record<AilmentType, string> = {
  bleed: "Bleeds",
  poison: "Poisons",
  burn: "Burns",
  chill: "Chills",
  shock: "Shocks",
  corruption: "Corrupts",
};
const AILMENT_NOUN: Record<AilmentType, string> = {
  bleed: "Bleed",
  poison: "Poison",
  burn: "Burn",
  chill: "Chill",
  shock: "Shock",
  corruption: "Corruption",
};
const TYPE_WORD: Record<DamageType, string> = {
  physical: "Physical",
  fire: "Fire",
  cold: "Cold",
  lightning: "Lightning",
  void: "Void",
};

/** A skill text after the Infusion: "as Fire. Always Burns." reads "as Cold. Always Chills." */
function infuseText(text: string, infusion: Infusion): string {
  let out = text;
  for (const t of Object.keys(TYPE_WORD) as DamageType[]) {
    out = out
      .split(`as ${TYPE_WORD[t]}`)
      .join(infusion.damageType === "physical" ? "" : `as ${TYPE_WORD[infusion.damageType]}`);
  }
  if (infusion.ailment === "stun") return out.replace(/ +\./g, ".");
  const to = infusion.ailment;
  for (const a of Object.keys(AILMENT_VERB) as AilmentType[]) {
    if (a === to) continue;
    out = out.split(AILMENT_VERB[a]).join(AILMENT_VERB[to]);
    out = out.split(` ${AILMENT_NOUN[a]}`).join(` ${AILMENT_NOUN[to]}`);
  }
  return out.replace(/ +\./g, ".").replace(/\b(\w+) or \1\b/g, "$1");
}

export function infuseSkill(skill: SkillDefinition, infusion: Infusion): SkillDefinition {
  const to = infusion.damageType;
  const ailment = infusion.ailment;
  const from =
    skill.hits.find((h) => h.kind === "spell")?.damageType ??
    skill.hits.find((h) => h.kind === "weapon" && h.damageType)?.damageType;
  const fromWord = from ? (ELEMENT_WORD[from] ?? "") : "";
  const toWord = ELEMENT_WORD[to] ?? "";
  const rename = (text: string) =>
    fromWord && toWord && from !== to ? text.split(fromWord).join(toWord) : text;
  const chances = (list: readonly AilmentChance[] | undefined) => {
    if (!list) return undefined;
    if (ailment === "stun") return [];
    const best = Math.max(0, ...list.map((c) => c.chance));
    return list.length ? [{ ailment, chance: best }] : [];
  };
  const effects = skill.effects?.map((e) =>
    e.kind === "buff" && e.stat.endsWith("Chance") && e.stat !== "critChance" && ailment !== "stun"
      ? { ...e, stat: `${ailment}Chance` as typeof e.stat }
      : e,
  );
  const changed =
    from !== undefined && from !== to
      ? true
      : skill.hits.some((h) => h.ailmentChances?.some((c) => c.ailment !== ailment)) ||
        (effects ?? []).some((e, i) => e !== skill.effects?.[i]);
  if (!changed) return skill;
  return {
    ...skill,
    id: `${skill.id}@${to}-${ailment}`,
    name: rename(skill.name),
    description: infuseText(skill.description, infusion),
    tags: skill.tags.map((t) => (t === from ? to : t)),
    hits: skill.hits.map((h) => {
      const ac = chances(h.ailmentChances);
      const typed =
        h.kind === "spell"
          ? { ...h, damageType: to }
          : h.damageType !== undefined
            ? { ...h, damageType: to }
            : h;
      return ac ? { ...typed, ailmentChances: ac } : typed;
    }),
    ...(effects ? { effects } : {}),
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
  const multiply = new Set(["damageDealt", "stunDuration", "blockMultiplier", "critBleedPower"]);
  const lists = new Set([
    "conditionalDamage",
    "conditionalAttackSpeed",
    "critAfter",
    "refreshOnHit",
    "enemyHeatGain",
    "enemyAttackSpeed",
    "extraAttackAilments",
    "ailmentDamageWhen",
    "heatOnHitWhen",
    "tickAilment",
    "skillDiscountWhen",
  ]);
  const byAilment = new Set(["ailmentDurationBy", "ailmentEffectBy", "ailmentLeech"]);
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
        type Part = NonNullable<MasteryWeaponRules["sunder"]>;
        const a = (prev as Part | undefined) ?? {};
        const b = value as Part;
        out[key] = {
          chance: (a.chance ?? 0) + (b.chance ?? 0),
          maxStacks: (a.maxStacks ?? 0) + (b.maxStacks ?? 0),
          perStack: Math.max(a.perStack ?? 0, b.perStack ?? 0),
          duration: Math.max(a.duration ?? 0, b.duration ?? 0),
        };
      } else if (key === "poisonBurst") {
        // Toxic Bloom and Master of Venom: the stronger burst counts.
        const a = prev as { multiplier: number } | undefined;
        const b = value as { multiplier: number };
        out[key] = a && a.multiplier >= b.multiplier ? a : b;
      } else if (byAilment.has(key)) {
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
