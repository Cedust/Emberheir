import {
  type BuildPlan,
  type CombatantSetup,
  deriveStats,
  Fight,
  type GameData,
  type GameState,
  applyCheat,
  heroSetup,
  newGame,
} from "@emberheir/sim";

/**
 * Damage budget of a build at the end of the game (balancing-neustart-v1.md, step 1): where its
 * damage comes from, and how much each layer (gear, Ash Tree, Mastery, Heirloom, Refine,
 * Keystones) multiplies it. Runes are not in it: the Cheat Panel's hero socket none. The hero is the Cheat Panel's last stage of the plan; damage is
 * measured against a training dummy, like the autopilot's gear picks.
 */

const DUMMY_SECONDS = 30;

/** Share of the damage by where it came from (sums to 1). */
export interface DamageShares {
  /** Default Attacks, including extra attacks. */
  readonly defaultAttack: number;
  /** The weapon's Innate (Battle Plan slot 0). */
  readonly innate: number;
  /** Every other Battle Plan skill, Reaction and free recast, incl. DoT cash-ins. */
  readonly skills: number;
  /** Ailment ticks. */
  readonly dots: number;
  /** Everything else: triggers, Overcharge Nova, bursts, Thorns. */
  readonly other: number;
  /**
   * The weapon (balancing-neustart-v1.md F6): Default Attacks and the Innate, with the ailment
   * ticks they caused, also when a burst (Rend, Cash In) ends them early. Overlaps `dots` and
   * `skills`, so it is not part of the sum.
   */
  readonly weapon: number;
}

/** One layer taken away from the hero to see what it is worth. */
export const LAYERS = ["gear", "ashTree", "mastery", "heirloom", "refine", "keystones"] as const;
export type Layer = (typeof LAYERS)[number];

export interface BudgetRow {
  readonly dps: number;
  readonly life: number;
  readonly barrier: number;
  readonly shares: DamageShares;
  /** Damage with the layer divided by damage without it (×1.5 = the layer adds 50 %). */
  readonly factors: Readonly<Record<Layer, number>>;
}

const REFINE = new Set(["balance", "precision", "steady-hand", "full-swing"]);

/** The hero against a dummy that never hits back: damage per second and its sources. */
export function dummyFight(setup: CombatantSetup): { dps: number; shares: DamageShares } {
  const dummy: CombatantSetup = {
    name: "Training Dummy",
    level: setup.level,
    attributes: { strength: 0, dexterity: 0, agility: 0, intelligence: 0, wisdom: 0, vitality: 0 },
    weapon: { ...setup.weapon, attacksPerSecond: 0, triggers: [], ailmentChances: [] },
    rotation: [],
    baseLife: 1e9,
  };
  const fight = new Fight({ ...setup, lifeFraction: 1 }, dummy, 1);
  fight.advance(DUMMY_SECONDS);
  const innate = setup.rotation[0]?.skill.name;
  const skills = new Set<string>();
  for (const e of fight.events) {
    if (e.type === "skill" && e.side === "hero") skills.add(e.skill);
  }
  const sum = { defaultAttack: 0, innate: 0, skills: 0, dots: 0, other: 0 };
  const weaponSource = (source: string) =>
    source === setup.weapon.defaultAttack || source === innate;
  let weaponDots = 0;
  for (const e of fight.events) {
    if (e.type === "dot" && e.side !== "hero") {
      sum.dots += e.damage;
      for (const [source, share] of Object.entries(e.sources ?? {})) {
        if (weaponSource(source)) weaponDots += e.damage * share;
      }
    }
    if (e.type !== "hit" || e.side !== "hero") continue;
    // A burst that ends DoTs (Rend, Cash In): their own damage stays with whoever applied them.
    if (!weaponSource(e.source)) {
      for (const [source, share] of Object.entries(e.dotSources ?? {})) {
        if (weaponSource(source)) weaponDots += e.damage * share;
      }
    }
    if (e.source === setup.weapon.defaultAttack) sum.defaultAttack += e.damage;
    else if (e.source === innate) sum.innate += e.damage;
    else if (skills.has(e.source) || e.source.endsWith("(Spellblade)")) sum.skills += e.damage;
    else sum.other += e.damage;
  }
  const total = Object.values(sum).reduce((a, b) => a + b, 0);
  const share = (x: number) => (total > 0 ? x / total : 0);
  return {
    dps: Math.max(1, total / DUMMY_SECONDS),
    shares: {
      defaultAttack: share(sum.defaultAttack),
      innate: share(sum.innate),
      skills: share(sum.skills),
      dots: share(sum.dots),
      other: share(sum.other),
      weapon: share(sum.defaultAttack + sum.innate + weaponDots),
    },
  };
}

/**
 * The hero without one layer. Skills stay learned (taking a skill node away would change the
 * Battle Plan, not the layer's power), and the Heirloom keeps one point in its path so the weapon
 * keeps its damage type.
 */
export function withoutLayer(
  state: GameState,
  data: GameData,
  plan: BuildPlan,
  layer: Layer,
): GameState {
  const hero = state.hero;
  const tree = data.skillTree;
  const nodeOf = (id: string) => tree.nodes.find((n) => n.id === id);
  const keepLearned = (keep: (id: string) => boolean) => ({
    ...state,
    hero: {
      ...hero,
      learned: Object.fromEntries(Object.entries(hero.learned).filter(([id]) => keep(id))),
    },
  });
  const weaponTree = data.weaponMastery[hero.weaponId];
  const heirloomNode = (id: string) => weaponTree?.nodes.find((n) => n.id === id);
  switch (layer) {
    case "gear":
      return { ...state, hero: { ...hero, equipment: {} } };
    case "ashTree":
      return keepLearned((id) => {
        const node = nodeOf(id);
        return !node || node.kind === "skill" || node.prestigeBranch !== undefined;
      });
    case "mastery":
      return keepLearned((id) => {
        const node = nodeOf(id);
        return !node || node.kind === "skill" || node.prestigeBranch === undefined;
      });
    case "keystones": {
      const s = keepLearned((id) => nodeOf(id)?.kind !== "keystone");
      const choices = Object.fromEntries(
        Object.entries(hero.mastery.choices).filter(([, id]) => id !== plan.heirloom.keystone),
      );
      return { ...s, hero: { ...s.hero, mastery: { ...hero.mastery, choices } } };
    }
    case "heirloom": {
      const path = plan.heirloom.path;
      const inPath = (id: string) => heirloomNode(id)?.path === path;
      const learned = Object.fromEntries(
        Object.entries(hero.mastery.learned).flatMap(([id, ranks]) =>
          id === `${path}-t1` ? [[id, 1]] : inPath(id) ? [] : [[id, ranks]],
        ),
      );
      const choices = Object.fromEntries(
        Object.entries(hero.mastery.choices).filter(
          ([, id]) => !inPath(id) && id !== plan.heirloom.keystone,
        ),
      );
      return { ...state, hero: { ...hero, mastery: { ...hero.mastery, learned, choices } } };
    }
    case "refine": {
      const learned = Object.fromEntries(
        Object.entries(hero.mastery.learned).filter(([id]) => !REFINE.has(id)),
      );
      return { ...state, hero: { ...hero, mastery: { ...hero.mastery, learned } } };
    }
  }
}

/** The plan's hero at the end of the game (Cheat Panel), seeded for its random gear. */
export function endgameHero(data: GameData, plan: BuildPlan, seed: number): GameState {
  const start = newGame(data, { seed, classId: plan.classId, weapon: plan.weapon });
  return applyCheat(start, data, { kind: "buildPlan", plan });
}

/** Budget of one build at the end of the game. */
export function buildBudget(data: GameData, plan: BuildPlan, seed: number): BudgetRow {
  const state = endgameHero(data, plan, seed);
  const setup = heroSetup(state, data).setup;
  const stats = deriveStats(setup);
  const full = dummyFight(setup);
  const factors = Object.fromEntries(
    LAYERS.map((layer) => {
      const without = dummyFight(heroSetup(withoutLayer(state, data, plan, layer), data).setup);
      return [layer, full.dps / without.dps];
    }),
  ) as Record<Layer, number>;
  return {
    dps: full.dps,
    life: stats.maxLife,
    barrier: stats.barrier,
    shares: full.shares,
    factors,
  };
}

/** Mean of several budgets (one per seed); factors as geometric means. */
export function meanBudget(rows: readonly BudgetRow[]): BudgetRow {
  const n = Math.max(1, rows.length);
  const avg = (f: (r: BudgetRow) => number) => rows.reduce((a, r) => a + f(r), 0) / n;
  const geo = (f: (r: BudgetRow) => number) =>
    Math.exp(rows.reduce((a, r) => a + Math.log(f(r)), 0) / n);
  return {
    dps: avg((r) => r.dps),
    life: avg((r) => r.life),
    barrier: avg((r) => r.barrier),
    shares: {
      defaultAttack: avg((r) => r.shares.defaultAttack),
      innate: avg((r) => r.shares.innate),
      skills: avg((r) => r.shares.skills),
      dots: avg((r) => r.shares.dots),
      other: avg((r) => r.shares.other),
      weapon: avg((r) => r.shares.weapon),
    },
    factors: Object.fromEntries(LAYERS.map((l) => [l, geo((r) => r.factors[l])])) as Record<
      Layer,
      number
    >,
  };
}
