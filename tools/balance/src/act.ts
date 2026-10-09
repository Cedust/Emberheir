import {
  BOON_GRADES,
  type BoonPick,
  heroBoons,
  type Attributes,
  type GameData,
  type GameState,
  type Item,
  PROGRESSION,
  RARITIES,
  actsInRun,
  applyAction,
  currentFight,
  type LearnedNodes,
  equipBlockReason,
  getNode,
  forkPartner,
  learnBlockReason,
  newGame,
  runFight,
  type SlotModifier,
  battlePlanUnlocks,
  heroSetup,
  knownSkills,
  masteryPointsLeft,
  nodeMaxRanks,
  openBranches,
  targetSlot,
} from "@emberheir/sim";

/**
 * Plays whole acts with a simple autopilot to answer "how long does a fight take" and "how often
 * do you die before the boss" (game-design-document-v1.md section 11).
 */

export interface ActRunReport {
  /** 1 = the first run, 2 = after the first Prestige, ... */
  readonly generation: number;
  /** Act number (1 = Ashen Fields). */
  readonly act: number;
  readonly cleared: boolean;
  /** Deaths before the boss fell. */
  readonly deaths: number;
  /** Enemy id of every death, in order. */
  readonly deathEnemies: readonly string[];
  readonly fights: number;
  readonly levelAtBoss: number;
  readonly fightSeconds: readonly number[];
  readonly bossSeconds: number;
  readonly elites: number;
  /** Ember Thieves met and caught. */
  readonly thieves: number;
  readonly thievesCaught: number;
  /** Stage of every death. */
  readonly deathStages: readonly number[];
  readonly bossDeaths: number;
  /** The very first fight of the generation was lost. */
  readonly firstFightLost: boolean;
}

/** Attribute points per level for each weapon. */
const ATTRIBUTE_PLAN: Record<string, (keyof Attributes)[]> = {
  sword: ["strength", "agility", "vitality"],
  "fire-wand": ["intelligence", "wisdom", "vitality"],
  axe: ["strength", "vitality", "wisdom"],
  dagger: ["dexterity", "agility", "vitality"],
  mace: ["strength", "vitality", "agility"],
  staff: ["intelligence", "wisdom", "vitality"],
  bow: ["dexterity", "agility", "vitality"],
  crossbow: ["strength", "dexterity", "vitality"],
};

const rarityRank = (item: Item) => RARITIES.indexOf(item.rarity);
/** Crude item score: rarity first, then Item Level. */
const score = (item: Item) => rarityRank(item) * 10 + item.itemLevel;

/** Boon choice: a family that fits the weapon (or Hearth) first, then rank-ups, then the grade. */
function bestBoon(state: GameState, data: GameData, offer: readonly BoonPick[]): number {
  const damageType = heroSetup(state, data).setup.weapon.damageType;
  const owned = new Set(heroBoons(state, data).map((b) => b.def.id));
  const value = (pick: BoonPick) => {
    const def = data.boons?.find((b) => b.id === pick.id);
    const family = data.boonFamilies?.find((f) => f.id === def?.family);
    const fits =
      !family || family.damageTypes.length === 0 || family.damageTypes.includes(damageType);
    return (fits ? 10 : 0) + (owned.has(pick.id) ? 3 : 0) + BOON_GRADES.indexOf(pick.grade);
  };
  let best = 0;
  offer.forEach((pick, i) => {
    if (value(pick) > value(offer[best] ?? pick)) best = i;
  });
  return best;
}

function autopilotRewards(state: GameState, data: GameData): GameState {
  let s = state;
  const rewards = s.run?.rewards;
  if (!rewards) return s;
  // Boss Hoard: up to `picks` cards, the best upgrade each time.
  while (s.run?.rewards && !s.run.rewards.itemPick) {
    const taken = new Set((s.run.rewards.taken ?? []).map((t) => t.index));
    let best = -1;
    let bestGain = 0;
    rewards.items.forEach((item, i) => {
      if (taken.has(i) || equipBlockReason(s, data, item, "pick")) return;
      const slot = targetSlot(item, data, s.hero.equipment);
      const current = slot ? s.hero.equipment[slot] : undefined;
      const gain = score(item) - (current ? score(current) : -1);
      if (gain > bestGain) {
        best = i;
        bestGain = gain;
      }
    });
    s =
      best >= 0
        ? applyAction(s, data, { type: "pickItem", index: best, mode: "equip" })
        : applyAction(s, data, { type: "salvageAll" });
  }
  // Old items are never needed again by the autopilot: Thoric salvages them in the Camp, so on
  // the road they wait in the inventory (thrown away only to make room).
  for (const placed of s.inventory.slice(0, Math.max(0, s.inventory.length - 4))) {
    s = applyAction(s, data, { type: "discard", itemId: placed.item.id });
  }
  if (rewards.spoils.length) {
    const flask = rewards.spoils.findIndex((c) => c.kind === "flaskCharge");
    const stones = rewards.spoils.findIndex((c) => c.kind === "reforgeStones");
    const pick = s.flaskCharges < PROGRESSION.flaskStartCharges ? flask : stones;
    s = applyAction(s, data, { type: "pickSpoils", index: Math.max(0, pick) });
  }
  const offer = s.run?.rewards?.boonOffer;
  if (offer?.length)
    s = applyAction(s, data, { type: "pickBoon", index: bestBoon(s, data, offer) });
  return applyAction(s, data, { type: "continue" });
}

function spendPoints(state: GameState, data: GameData, weaponId: string): GameState {
  const plan = ATTRIBUTE_PLAN[weaponId] ?? ["vitality"];
  let s = state;
  let i = 0;
  while (s.hero.unspentAttributePoints > 0) {
    const attribute = plan[i++ % plan.length] ?? "vitality";
    s = applyAction(s, data, { type: "allocateAttributes", points: { [attribute]: 1 } });
  }
  return s;
}

/**
 * Autopilot builds (level-v2.md section 7): three clearly different builds per class, each with
 * its weapon, Skill Tree goals in order ("@branches" = the owned Prestige branches at that point),
 * Rotation skills (slot 1 is the weapon's Innate), Prestige branches by preference and a Reaction
 * skill once one is unlocked. Keystones are left out (Harvester's Ember).
 */
export interface BuildPlan {
  readonly id: string;
  readonly classId: string;
  readonly weapon: string;
  readonly nodes: readonly string[];
  readonly rotation: readonly string[];
  readonly branches: readonly string[];
  readonly reaction?: { readonly skillId: string; readonly conditionId: string };
}

const GUARD = { skillId: "iron-bastion", conditionId: "life-50" };
const NOVA = { skillId: "frost-nova", conditionId: "enemy-windup" };

export const BUILDS: readonly BuildPlan[] = [
  {
    id: "unbroken",
    classId: "warrior",
    weapon: "sword",
    nodes: ["might-unbroken", "might-brutal-force", "rupture-might-execute", "@branches"],
    rotation: ["flurry", "feint", "execute"],
    branches: ["duelist", "warden", "tactician", "butcher"],
    reaction: GUARD,
  },
  {
    id: "smasher",
    classId: "warrior",
    weapon: "mace",
    nodes: ["might-brutal-force", "might-colossus", "@branches", "might-arcana-arcane-edge"],
    rotation: ["crushing-blow", "feint", "flurry"],
    branches: ["warden", "duelist", "tactician", "butcher"],
    reaction: GUARD,
  },
  {
    id: "bleeder",
    classId: "warrior",
    weapon: "sword",
    nodes: ["might-brutal-force", "rupture-might-serrations", "rupture-exsanguinate", "@branches"],
    rotation: ["rend", "cleave", "feint"],
    branches: ["butcher", "duelist", "tactician", "warden"],
    reaction: GUARD,
  },
  {
    id: "bleed",
    classId: "reaver",
    weapon: "axe",
    nodes: ["rupture-exsanguinate", "rupture-butcher", "@branches", "affliction-rupture-iron-will"],
    rotation: ["rend", "cleave", "serrated-edge"],
    branches: ["butcher", "duelist", "venomancer", "tactician"],
    reaction: GUARD,
  },
  {
    id: "poison",
    classId: "reaver",
    weapon: "dagger",
    nodes: [
      "rupture-venomancer",
      "affliction-rupture-bloodthirst",
      "@branches",
      "affliction-rupture-leeching-rot",
    ],
    rotation: ["toxic-burst", "plague-cloud", "envenom"],
    branches: ["venomancer", "tactician", "duelist", "butcher"],
    reaction: GUARD,
  },
  {
    id: "assassin",
    classId: "reaver",
    weapon: "dagger",
    nodes: ["rupture-might-killers-eye", "rupture-might-execute", "@branches", "might-whirlwind"],
    rotation: ["execute", "feint", "flurry"],
    branches: ["duelist", "venomancer", "tactician", "butcher"],
    reaction: GUARD,
  },
  {
    id: "marksman",
    classId: "hunter",
    weapon: "crossbow",
    nodes: [
      "rupture-might-killer-instinct",
      "rupture-might-execute",
      "@branches",
      "rupture-might-killers-eye",
      "rupture-might-coup-de-grace",
    ],
    rotation: ["piercing-shot", "execute"],
    branches: ["marksman", "venomancer", "tactician", "warden"],
    reaction: GUARD,
  },
  {
    id: "venom",
    classId: "hunter",
    weapon: "bow",
    nodes: ["rupture-venomancer", "@branches", "affliction-rupture-toxic-burst"],
    rotation: ["envenom", "toxic-burst", "plague-cloud"],
    branches: ["venomancer", "marksman", "tactician", "warden"],
    reaction: GUARD,
  },
  {
    id: "barbs",
    classId: "hunter",
    weapon: "bow",
    nodes: [
      "rupture-exsanguinate",
      "rupture-serrated-edge",
      "@branches",
      "rupture-might-opportunist",
    ],
    rotation: ["rend", "serrated-edge", "piercing-shot"],
    branches: ["marksman", "venomancer", "warden", "tactician"],
    reaction: GUARD,
  },
  {
    id: "storm",
    classId: "sorcerer",
    weapon: "fire-wand",
    nodes: ["arcana-tempest", "arcana-storm-weaver", "@branches", "arcana-kindled-mind"],
    rotation: ["chain-lightning", "thunderstrike", "meteor"],
    branches: ["stormcaller", "frostbinder", "tactician", "warden"],
    reaction: NOVA,
  },
  {
    id: "frost",
    classId: "sorcerer",
    weapon: "fire-wand",
    nodes: [
      "arcana-kindled-mind",
      "arcana-glacier",
      "@branches",
      "arcana-affliction-heart-of-embers",
    ],
    rotation: ["ice-lance", "chain-lightning"],
    branches: ["frostbinder", "stormcaller", "warden", "tactician"],
    reaction: NOVA,
  },
  {
    id: "fire",
    classId: "sorcerer",
    weapon: "fire-wand",
    nodes: ["arcana-affliction-pyroclasm", "arcana-affliction-firestarter", "@branches"],
    rotation: ["meteor", "thunderstrike", "ice-lance"],
    branches: ["stormcaller", "tactician", "frostbinder", "warden"],
    reaction: NOVA,
  },
  {
    id: "void",
    classId: "warlock",
    weapon: "staff",
    nodes: ["affliction-void-lord", "affliction-hungering-void", "@branches"],
    rotation: ["corrupt", "void-rift", "soul-harvest"],
    branches: ["void-lord", "pyromancer", "tactician", "warden"],
    reaction: NOVA,
  },
  {
    id: "pyre",
    classId: "warlock",
    weapon: "staff",
    nodes: [
      "affliction-pyromancer",
      "affliction-cinder-heart",
      "@branches",
      "arcana-affliction-firestarter",
    ],
    rotation: ["immolate", "inferno", "soul-harvest"],
    branches: ["pyromancer", "void-lord", "tactician", "warden"],
    reaction: NOVA,
  },
  {
    id: "rot",
    classId: "warlock",
    weapon: "staff",
    nodes: [
      "affliction-rupture-leeching-rot",
      "affliction-rupture-iron-will",
      "@branches",
      "affliction-void-lord",
    ],
    rotation: ["wither", "corrupt", "void-rift"],
    branches: ["void-lord", "warden", "pyromancer", "tactician"],
    reaction: NOVA,
  },
];

/** A build by id, or the first build that starts with the weapon. */
export function findBuild(weaponId: string, buildId?: string): BuildPlan | undefined {
  if (buildId) return BUILDS.find((b) => b.id === buildId);
  return BUILDS.find((b) => b.weapon === weaponId);
}

/**
 * Weapon Mastery plan per weapon: Heat Form (the weapon's old behavior), Innate Form, Keystone
 * and the paths in order. Refine is spread between them.
 */
interface MasteryPlan {
  readonly heat?: string;
  readonly innate: string;
  readonly keystone: string;
  readonly paths: readonly string[];
}

const MASTERY_PLAN: Record<string, MasteryPlan> = {
  sword: {
    heat: "heat-cooling",
    innate: "rising-strike",
    keystone: "final-verdict",
    paths: ["edge", "tempo", "riposte"],
  },
  mace: {
    heat: "heat-cooling",
    innate: "bone-breaker",
    keystone: "siege",
    paths: ["crush", "quake", "bulwark"],
  },
  axe: {
    heat: "heat-cooling",
    innate: "gutting-lacerate",
    keystone: "rampage",
    paths: ["butcher", "frenzy", "cleave"],
  },
  dagger: {
    heat: "heat-cooling",
    innate: "virulent-coat",
    keystone: "toxic-bloom",
    paths: ["venom", "assassin", "flurry"],
  },
  bow: { innate: "hooked-arrow", keystone: "hunters-mark", paths: ["barbs", "volley", "toxin"] },
  crossbow: {
    innate: "ballista-bolt",
    keystone: "siege-engine",
    paths: ["payload", "pierce", "reload"],
  },
  "fire-wand": {
    heat: "heat-warming",
    innate: "barrage",
    keystone: "glass-cannon",
    paths: ["storm", "pyre", "rime"],
  },
  staff: {
    heat: "heat-warming",
    innate: "void-lance",
    keystone: "endless-night",
    paths: ["hollow", "channel", "smolder"],
  },
};

/** The order the autopilot learns Weapon Mastery nodes in (a node id per point). */
export function masteryOrder(data: GameData, weaponId: string): string[] {
  const plan = MASTERY_PLAN[weaponId];
  const tree = data.weaponMastery[weaponId];
  if (!plan || !tree) return [];
  const path = (id: string | undefined) =>
    id ? tree.nodes.filter((n) => n.path === id).map((n) => n.id) : [];
  return [
    ...(plan.heat ? [plan.heat] : []),
    plan.innate,
    plan.keystone,
    "precision",
    "steady-hand",
    "precision",
    ...path(plan.paths[0]),
    "steady-hand",
    "precision",
    ...path(plan.paths[1]),
    "steady-hand",
    "full-swing",
    "full-swing",
    "full-swing",
    "balance",
    "balance",
    ...path(plan.paths[2]),
  ];
}

/** Kaelen: learns Weapon Mastery along the plan and wears the strongest Echo. */
function spendMastery(state: GameState, data: GameData): GameState {
  let s = state;
  const order = masteryOrder(data, s.hero.weaponId);
  for (let guard = 0; guard < 64 && masteryPointsLeft(s, data) > 0; guard++) {
    let learned = false;
    const counts = new Map<string, number>();
    for (const id of order) {
      const want = (counts.get(id) ?? 0) + 1;
      counts.set(id, want);
      const tree = data.weaponMastery[s.hero.weaponId];
      if (!tree) break;
      const node = tree.nodes.find((n) => n.id === id);
      const have = node?.group
        ? s.hero.mastery.choices[node.group] === id
          ? 1
          : 0
        : (s.hero.mastery.learned[id] ?? 0);
      if (have >= want) continue;
      try {
        s = applyAction(s, data, { type: "learnMastery", nodeId: id });
        learned = true;
        break;
      } catch {
        // Not yet (Rank, Keystone ring): try the next step.
      }
    }
    if (!learned) break;
  }
  const echoes = Object.entries(s.legacy.echoes).sort((a, b) => b[1].stage - a[1].stage);
  const best = echoes[0]?.[0];
  if (best && s.hero.mastery.echo !== best) {
    s = applyAction(s, data, { type: "setEcho", echoId: best });
  }
  return s;
}

const adjacency = new WeakMap<GameData["skillTree"], Map<string, string[]>>();

/** Neighbours of every node, built once per tree (the web is too big for `neighbours`). */
function links(tree: GameData["skillTree"]): Map<string, string[]> {
  let map = adjacency.get(tree);
  if (!map) {
    const built = new Map<string, string[]>(tree.nodes.map((n) => [n.id, []]));
    for (const node of tree.nodes) {
      for (const l of node.links) {
        built.get(node.id)?.push(l);
        built.get(l)?.push(node.id);
      }
    }
    map = built;
    adjacency.set(tree, map);
  }
  return map;
}

/** Shortest list of nodes to learn so that `target` gets a rank (breadth-first search). */
function pathTo(data: GameData, learned: LearnedNodes, target: string): string[] {
  const tree = data.skillTree;
  const known = (id: string) => id === tree.startNodeId || (learned[id] ?? 0) > 0;
  if (known(target)) return [target];
  const graph = links(tree);
  const from = new Map<string, string | null>();
  const queue = tree.nodes.filter((n) => known(n.id)).map((n) => n.id);
  for (const id of queue) from.set(id, null);
  while (queue.length) {
    const id = queue.shift() ?? "";
    for (const next of graph.get(id) ?? []) {
      if (from.has(next)) continue;
      const node = getNode(tree, next);
      if (node.kind === "keystone" || forkPartner(tree, learned, node)) continue;
      from.set(next, id);
      if (next === target) {
        const path = [next];
        let back = from.get(next) ?? null;
        while (back && !known(back)) {
          path.unshift(back);
          back = from.get(back) ?? null;
        }
        return path;
      }
      queue.push(next);
    }
  }
  return [];
}

/** Learns one node after the other along the shortest path; stops when points run out. */
function learnTowards(s: GameState, data: GameData, target: string): GameState {
  for (const id of pathTo(data, s.hero.learned, target)) {
    if (s.hero.unspentSkillPoints <= 0) break;
    try {
      s = applyAction(s, data, { type: "learnNodes", nodeIds: [id] });
    } catch {
      break;
    }
  }
  return s;
}

/** Puts points into a node until it is maxed or the points run out. */
function fillNode(s: GameState, data: GameData, id: string): GameState {
  const node = getNode(data.skillTree, id);
  while (
    s.hero.unspentSkillPoints > 0 &&
    (s.hero.learned[id] ?? 0) < nodeMaxRanks(node, s.legacy.branches)
  ) {
    const before = s;
    s = learnTowards(s, data, id);
    if (s === before) break;
  }
  return s;
}

/**
 * Kaelen: spends Skill Points on the build's goals in order (the owned Prestige branches where the
 * plan says "@branches"), then on the nearest open nodes (no Keystones). Fills the Rotation, a
 * Reaction and the Slot Modifiers.
 */
function spendSkillPoints(
  state: GameState,
  data: GameData,
  plan: BuildPlan | undefined,
): GameState {
  if (!plan || state.run) return state;
  let s = spendMastery(state, data);
  const tree = data.skillTree;
  for (const target of plan.nodes) {
    if (target !== "@branches") {
      s = fillNode(s, data, target);
      continue;
    }
    const branchNodes = plan.branches
      .filter((b) => s.legacy.branches.includes(b))
      .flatMap((b) => tree.nodes.filter((n) => n.prestigeBranch === b && n.kind !== "keystone"));
    for (const node of branchNodes) s = fillNode(s, data, node.id);
  }
  // The rest: the cheapest open neighbour, again and again (Skill nodes and Notables first).
  const graph = links(tree);
  const order = { skill: 0, notable: 1, minor: 2, keystone: 3 } as const;
  while (s.hero.unspentSkillPoints > 0) {
    const learned = s.hero.learned;
    const open = tree.nodes.filter(
      (n) =>
        n.kind !== "keystone" &&
        learnBlockReason(
          tree,
          learned,
          n.id,
          { skillPoints: 1, harvesterEmber: 0 },
          s.legacy.branches,
        ) === undefined &&
        ((learned[n.id] ?? 0) > 0 || (graph.get(n.id) ?? []).some((l) => (learned[l] ?? 0) > 0)),
    );
    const next = open.sort((a, b) => order[a.kind] - order[b.kind])[0];
    if (!next) break;
    s = applyAction(s, data, { type: "learnNodes", nodeIds: [next.id] });
  }
  const weapon = heroSetup(s, data).setup.weapon;
  const known = new Set(knownSkills(s, data, weapon).map((k) => k.skill.id));
  const rotation = plan.rotation.filter((id) => known.has(id));
  for (let slot = 1; slot < s.progress.rotationSlots; slot++) {
    const skillId = rotation[slot - 1];
    if (skillId && s.hero.rotation[slot] !== skillId) {
      s = applyAction(s, data, { type: "setRotationSkill", slot, skillId });
    }
  }
  const unlocks = battlePlanUnlocks(s.legacy.prestige);
  const mods = (first: SlotModifier): SlotModifier[] =>
    ([unlocks.rareModifiers ? "reverb" : "overcharge", first] as SlotModifier[]).slice(
      2 - unlocks.modifiers,
    );
  const reaction =
    unlocks.reactionSlots > 0 && plan.reaction && known.has(plan.reaction.skillId)
      ? plan.reaction
      : null;
  try {
    s = applyAction(s, data, {
      type: "setBattlePlan",
      plan: {
        ...s.hero.plan,
        modifiers: Array.from({ length: s.progress.rotationSlots }, (_, i) =>
          mods(i === 0 ? "thrifty" : "empowered"),
        ),
        reactions: reaction ? [reaction] : [],
        reactionModifiers: reaction ? [mods("thrifty")] : [],
        capstone: unlocks.capstone ? (s.hero.plan.capstone ?? { id: "crescendo", slot: 0 }) : null,
        openingMove: unlocks.openingMove ? (rotation[0] ?? null) : null,
      },
    });
  } catch {
    // Keep the old plan.
  }
  return s;
}

/**
 * Prestiges with the first new branch the weapon's tree plan prefers; once all of them are owned,
 * deepens them in plan order. All items stay.
 */
function autopilotPrestige(
  state: GameState,
  data: GameData,
  build: BuildPlan | undefined,
): GameState {
  const open = openBranches(state, data).map((b) => b.id);
  const plan = build?.branches ?? [];
  const preferred =
    plan.find((b) => open.includes(b) && !state.legacy.branches.includes(b)) ??
    plan.find((b) => open.includes(b)) ??
    open[0];
  const s = applyAction(state, data, {
    type: "prestige",
    ...(preferred ? { branchId: preferred } : {}),
  });
  return applyAction(s, data, { type: "dismissNotice" });
}

/**
 * Plays the run act by act, from Act 1 up to `upToAct`, until each boss falls or `maxAttempts`
 * attempts per act are used up. With `generations` above 1 it prestiges after the final boss and
 * plays the acts again: one report per act and generation.
 */
export function playGenerations(
  data: GameData,
  options: {
    readonly seed: number;
    readonly starterWeapon: string;
    /** Autopilot build id (`BUILDS`); default: the first build with the weapon. */
    readonly build?: string;
    /** Last act to play (its number). */
    readonly upToAct: number;
    readonly maxAttempts: number;
    readonly generations: number;
    /** After the last generation: the final Prestige and The Last Ember (report act = 8). */
    readonly finale?: boolean;
  },
): ActRunReport[] {
  // Every start weapon belongs to one class (klassen-v2.md); the hero plays that class.
  const heroClass = data.classes.find((c) => c.weapons.includes(options.starterWeapon));
  if (!heroClass) throw new Error(`No class starts with "${options.starterWeapon}"`);
  let s = newGame(data, {
    seed: options.seed,
    classId: heroClass.id,
    weapon: options.starterWeapon,
  });
  const build = findBuild(options.starterWeapon, options.build);
  const reports: ActRunReport[] = [];
  for (let generation = 1; generation <= options.generations; generation++) {
    let allCleared = true;
    // Run n has acts 1..n (prestige-acts-v1.md); the newest act's boss brings The Harvest.
    const acts = actsInRun(data, s.legacy.prestige).filter((a) => a.number <= options.upToAct);
    for (const act of acts) {
      const before = s.stats;
      const fightSeconds: number[] = [];
      let bossSeconds = 0;
      let levelAtBoss = 0;
      let elites = 0;
      let thieves = 0;
      let thievesCaught = 0;
      const deathStages: number[] = [];
      const deathEnemies: string[] = [];
      let bossDeaths = 0;
      let firstFightLost = false;
      let cleared = false;
      for (let attempt = 0; attempt < options.maxAttempts && !cleared; attempt++) {
        for (const placed of s.inventory) {
          s = applyAction(s, data, { type: "salvage", itemId: placed.item.id });
        }
        s = spendSkillPoints(s, data, build);
        s = applyAction(s, data, { type: "setOut", actId: act.id });
        while (s.run) {
          s = spendPoints(s, data, options.starterWeapon);
          if ((s.run?.lifeFraction ?? 1) < 0.5 && s.flaskCharges > 0) {
            s = applyAction(s, data, { type: "useFlask" });
          }
          s = applyAction(s, data, { type: "startStage" });
          const fight = currentFight(s, data);
          const result = runFight(fight.hero, fight.enemy, fight.seed);
          const encounter = s.run?.encounter;
          if (encounter?.boss) {
            bossSeconds = result.duration;
            levelAtBoss = s.hero.level;
          } else {
            fightSeconds.push(result.duration);
            if (encounter?.eliteModifiers.length) elites++;
            if (encounter?.thief) {
              thieves++;
              if (result.winner === "hero") thievesCaught++;
            }
          }
          const stage = s.run?.stage ?? 0;
          const first = s.stats.fights === before.fights;
          s = applyAction(s, data, { type: "resolveFight" });
          if (!s.run && s.notice?.kind === "death") {
            if (first) firstFightLost = true;
            deathStages.push(stage);
            if (encounter) deathEnemies.push(encounter.enemyId);
            if (encounter?.boss) bossDeaths++;
          }
          if (s.run?.phase === "rewards") s = autopilotRewards(s, data);
        }
        cleared = s.pendingPrestige !== null || s.notice?.kind === "actCleared";
        if (!s.pendingPrestige) s = applyAction(s, data, { type: "dismissNotice" });
      }
      reports.push({
        generation,
        act: act.number,
        cleared,
        deaths: s.stats.deaths - before.deaths,
        deathEnemies,
        fights: s.stats.fights - before.fights,
        levelAtBoss,
        fightSeconds,
        bossSeconds,
        elites,
        thieves,
        thievesCaught,
        deathStages,
        bossDeaths,
        firstFightLost,
      });
      if (!cleared) {
        allCleared = false;
        break;
      }
    }
    if (!allCleared || generation === options.generations || !s.pendingPrestige) break;
    s = autopilotPrestige(s, data, build);
  }
  if (options.finale && data.finale && s.pendingPrestige) {
    s = autopilotPrestige(s, data, build);
    if (s.legacy.prestige >= PROGRESSION.finalPrestige) {
      reports.push(playFinale(s, data, options.generations + 1, options.maxAttempts));
    }
  }
  return reports;
}

/** The Last Ember with the autopilot: attempts until the Core falls (best Boon after each win). */
function playFinale(
  state: GameState,
  data: GameData,
  generation: number,
  maxAttempts: number,
): ActRunReport {
  let s = state;
  const before = s.stats;
  const fightSeconds: number[] = [];
  const deathStages: number[] = [];
  const deathEnemies: string[] = [];
  let bossSeconds = 0;
  let cleared = false;
  for (let attempt = 0; attempt < maxAttempts && !cleared; attempt++) {
    s = applyAction(s, data, { type: "enterFinale" });
    while (s.run) {
      if ((s.run?.lifeFraction ?? 1) < 0.5 && s.flaskCharges > 0) {
        s = applyAction(s, data, { type: "useFlask" });
      }
      s = applyAction(s, data, { type: "startStage" });
      const fight = currentFight(s, data);
      const result = runFight(fight.hero, fight.enemy, fight.seed);
      const stage = s.run?.stage ?? 0;
      const enemyId = s.run?.encounter?.enemyId ?? "";
      if (stage === data.finale?.stages) bossSeconds = result.duration;
      else fightSeconds.push(result.duration);
      s = applyAction(s, data, { type: "resolveFight" });
      if (!s.run && s.notice?.kind === "death") {
        deathStages.push(stage);
        deathEnemies.push(enemyId);
      }
      const offer = s.run?.rewards?.boonOffer;
      if (offer?.length) {
        s = applyAction(s, data, { type: "pickBoon", index: bestBoon(s, data, offer) });
      }
      if (s.run?.phase === "rewards") s = applyAction(s, data, { type: "continue" });
    }
    cleared = s.notice?.kind === "ending";
    s = applyAction(s, data, { type: "dismissNotice" });
  }
  return {
    generation,
    act: data.finale?.number ?? 8,
    cleared,
    deaths: s.stats.deaths - before.deaths,
    deathEnemies,
    fights: s.stats.fights - before.fights,
    levelAtBoss: s.hero.level,
    fightSeconds,
    bossSeconds,
    elites: 0,
    thieves: 0,
    thievesCaught: 0,
    deathStages,
    bossDeaths: deathStages.filter((st) => st === data.finale?.stages).length,
    firstFightLost: false,
  };
}

/** Plays one generation up to one act (see `playGenerations`). The report of that act. */
export function playAct(
  data: GameData,
  options: {
    readonly seed: number;
    readonly starterWeapon: string;
    readonly upToAct: number;
    readonly maxAttempts: number;
  },
): ActRunReport {
  const reports = playGenerations(data, { ...options, generations: 1 });
  const report = reports[reports.length - 1];
  if (!report) throw new Error("No report");
  return report;
}

export interface ActSummary {
  readonly runs: number;
  readonly clearRate: number;
  readonly avgDeaths: number;
  readonly avgLevelAtBoss: number;
  readonly avgFightSeconds: number;
  /** 90th percentile and longest normal fight. */
  readonly p90FightSeconds: number;
  readonly maxFightSeconds: number;
  readonly avgBossSeconds: number;
  /** Share of runs that lost their very first fight. */
  readonly firstFightLossRate: number;
  readonly avgElites: number;
  /** Ember Thieves per run and the share caught before they ran. */
  readonly avgThieves: number;
  readonly thiefCatchRate: number;
  /** Share of deaths that happened at the boss. */
  readonly bossDeathShare: number;
  /** The enemy that killed the hero most often, e.g. "storm-caller (42 %)". */
  readonly topKiller: string;
}

const avg = (values: readonly number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export function summarizeActRuns(reports: readonly ActRunReport[]): ActSummary {
  const cleared = reports.filter((r) => r.cleared);
  const fights = reports.flatMap((r) => r.fightSeconds).sort((a, b) => a - b);
  return {
    runs: reports.length,
    clearRate: reports.length ? cleared.length / reports.length : 0,
    avgDeaths: avg(cleared.map((r) => r.deaths)),
    avgLevelAtBoss: avg(cleared.map((r) => r.levelAtBoss)),
    avgFightSeconds: avg(fights),
    p90FightSeconds: fights[Math.floor(fights.length * 0.9)] ?? 0,
    maxFightSeconds: fights[fights.length - 1] ?? 0,
    firstFightLossRate: reports.length
      ? reports.filter((r) => r.firstFightLost).length / reports.length
      : 0,
    avgBossSeconds: avg(cleared.map((r) => r.bossSeconds)),
    avgElites: avg(reports.map((r) => r.elites)),
    avgThieves: avg(reports.map((r) => r.thieves)),
    thiefCatchRate:
      reports.reduce((n, r) => n + r.thievesCaught, 0) /
      Math.max(
        1,
        reports.reduce((n, r) => n + r.thieves, 0),
      ),
    bossDeathShare:
      reports.reduce((n, r) => n + r.bossDeaths, 0) /
      Math.max(
        1,
        reports.reduce((n, r) => n + r.deathStages.length, 0),
      ),
    topKiller: topKiller(reports.flatMap((r) => r.deathEnemies)),
  };
}

function topKiller(ids: readonly string[]): string {
  if (!ids.length) return "-";
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const [id, n] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? ["-", 0];
  return `${id} (${Math.round((n / ids.length) * 100)} %)`;
}
