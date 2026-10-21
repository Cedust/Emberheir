import { GAME_DATA, ITEM_CATALOG, RUNEWORDS, SKILL_TREE } from "@emberheir/content";
import type { Page } from "@playwright/test";
import {
  type GameState,
  type Item,
  type NodeKind,
  type Rewards,
  type RunState,
  applyAction,
  learnBlockReason,
  learnNodes,
  newGame,
  omenOffer,
  rollItem,
  rollUnique,
  Rng,
  serializeGame,
} from "@emberheir/sim";

/** A save right after Gorrak fell in the first run (the harvest boss), in a Rare Body Armor. */
export function saveAfterHarvestBoss(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  const rng = new Rng(7);
  const armor = rollItem(
    GAME_DATA.items,
    { baseId: "chain-mail", itemLevel: 4, rarity: "rare" },
    rng,
  );
  const state: GameState = {
    ...base,
    hero: {
      ...base.hero,
      level: 5,
      attributes: { ...base.hero.attributes, strength: 7, vitality: 7 },
      unspentAttributePoints: 0,
      unspentSkillPoints: 5,
      equipment: { ...base.hero.equipment, body: armor },
    },
    wallet: { ...base.wallet, acorns: 400, ash: 380, emberCoal: 6, phoenixFeathers: 1 },
    progress: { ...base.progress, actsCleared: ["ashen-fields"], trainerUnlocked: true },
    stats: { fights: 16, wins: 15, deaths: 1, retreats: 0, bossKills: 1 },
    pendingPrestige: { actId: "ashen-fields", stage: 15, enemyName: "Gorrak, the Pit Brute" },
  };
  return serializeGame(state);
}

/** Loads `json` as the save game of slot 1 once (a reload keeps what the game saved since). */
export async function seedSave(page: Page, json: string): Promise<void> {
  await page.addInitScript((save) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("emberheir.slot.0", save);
      localStorage.setItem("emberheir.lastSlot", "0");
      sessionStorage.setItem("seeded", "1");
    }
  }, json);
}

/** A Camp save in the second run: Gorrak fell, the road to the Rotwood is open. */
export function saveAfterAct1(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  const state: GameState = {
    ...base,
    hero: { ...base.hero, level: 15, unspentSkillPoints: 5 },
    progress: { ...base.progress, actsCleared: ["ashen-fields"], trainerUnlocked: true },
    legacy: { ...base.legacy, prestige: 1 },
  };
  return serializeGame(state);
}

/** Back in the Camp after Act 2 with a done bounty that Eldrin has not paid yet. */
export function saveBountyDone(): string {
  const state = JSON.parse(saveAfterAct1()) as GameState;
  return serializeGame({ ...state, bountyDone: { id: "elite-hunt", actId: "rotwood" } });
}

/** A Camp save after the first trip into the Rotwood: Nyssa has joined, three Bark Runes in the pouch. */
export function saveWithRunes(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  const state: GameState = {
    ...base,
    hero: { ...base.hero, level: 15 },
    wallet: { ...base.wallet, acorns: 400, runes: { ash: 3 } },
    progress: {
      ...base.progress,
      actsCleared: ["ashen-fields"],
      trainerUnlocked: true,
      runesmithUnlocked: true,
    },
    legacy: { ...base.legacy, prestige: 1, runesFound: ["ash"] },
  };
  return serializeGame(state);
}

/** A Camp save with a learned Trigger Codex, Kindling and a Magic ring without a trigger. */
export function saveWithCodex(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  const ring: Item = {
    id: "codex-ring",
    baseId: "iron-ring",
    name: "Sturdy Iron Ring",
    rarity: "magic",
    itemLevel: 18,
    tier: 2,
    affixes: [{ affixId: "life", quality: 0.6 }],
  };
  const state: GameState = {
    ...base,
    hero: { ...base.hero, level: 20 },
    wallet: { ...base.wallet, ash: 400, emberCoal: 4 },
    inventory: [{ item: ring, x: 0, y: 0 }],
    progress: { ...base.progress, actsCleared: ["ashen-fields"], trainerUnlocked: true },
    legacy: {
      ...base.legacy,
      prestige: 1,
      codex: { conditions: { "on-crit": 1, "when-hit": 1 }, effects: { burn: 1, barrier: 1 } },
    },
  };
  return serializeGame(state);
}

/** After The Last Ember: a two-affix ring and Cinderglass for Liora's Greater Affixes. */
export function saveGreater(): string {
  const camp = JSON.parse(saveWildfire()) as GameState;
  const ring: Item = {
    id: "greater-ring",
    baseId: "iron-ring",
    name: "Glowing Iron Ring",
    rarity: "rare",
    itemLevel: 98,
    tier: 10,
    affixes: [
      { affixId: "life", quality: 0.4 },
      { affixId: "life", quality: 0.2 },
    ],
  };
  return serializeGame({
    ...camp,
    progress: { ...camp.progress, trainerUnlocked: true },
    wallet: { ...camp.wallet, cinderglass: 10 },
    inventory: [{ item: ring, x: 0, y: 0 }],
  });
}

/** After The Last Ember: a Legendary ring to salvage, Leech Bloom already in the Power Codex. */
export function saveCrucible(): string {
  const camp = JSON.parse(saveWildfire()) as GameState;
  const ring: Item = {
    id: "crucible-ring",
    baseId: "iron-ring",
    name: "Headsman's Band",
    rarity: "legendary",
    itemLevel: 98,
    tier: 10,
    affixes: [{ affixId: "life", quality: 0.4 }],
    powerId: "executioner",
  };
  return serializeGame({
    ...camp,
    progress: { ...camp.progress, trainerUnlocked: true },
    wallet: { ...camp.wallet, ash: 2000, emberCoal: 20 },
    inventory: [{ item: ring, x: 0, y: 0 }],
    powerCodex: { "leech-bloom": 7 },
  });
}

/** The Rotwood's boss just fell in run 3: a Boss Hoard of six cards, one of them a new trophy. */
export function saveBossHoard(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  const rng = new Rng(3);
  const act = GAME_DATA.acts[1];
  if (!act) throw new Error("No Rotwood");
  const roll = (baseId: string, rarity: Item["rarity"]) =>
    rollItem(GAME_DATA.items, { baseId, itemLevel: 20, rarity }, rng);
  const items: Item[] = [
    roll("iron-helm", "epic"),
    roll("leather-boots", "epic"),
    rollUnique(GAME_DATA.items, "thornsong", 20, rng),
    roll("sash", "epic"),
    roll("garnet-ring", "epic"),
    roll("leather-gloves", "epic"),
  ];
  const state: GameState = {
    ...base,
    hero: { ...base.hero, level: 30 },
    progress: { ...base.progress, actsCleared: ["ashen-fields"], trainerUnlocked: true },
    legacy: { ...base.legacy, prestige: 2, trophies: ["thornsong"] },
    run: {
      actId: act.id,
      stage: act.stages,
      lifeFraction: 0.6,
      phase: "rewards",
      encounter: { enemyId: act.boss.id, level: 20, boss: true, eliteModifiers: [], seed: 9 },
      rewards: {
        rank: "boss",
        xp: 400,
        acorns: 120,
        ash: 40,
        emberCoal: 4,
        phoenixFeathers: 1,
        // Thorn is the Rotwood's Home Rune.
        runes: ["moss", "thorn"],
        levelsGained: 0,
        items,
        picks: 2,
        itemPick: null,
        salvagedAsh: 0,
        newTrophies: ["thornsong"],
      },
    },
  };
  return serializeGame(state);
}

/** A save at the Ember Shrine after Stage 5 of the first run, items already taken. */
export function saveShrine(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  const act = GAME_DATA.acts[0];
  if (!act) throw new Error("No Ashen Fields");
  const state: GameState = {
    ...base,
    hero: { ...base.hero, level: 4 },
    boons: { kept: [], fresh: [{ id: "brutality", grade: "spark" }] },
    run: {
      actId: act.id,
      stage: 5,
      lifeFraction: 0.8,
      phase: "rewards",
      encounter: {
        enemyId: act.enemies[0]?.id ?? "",
        level: 3,
        boss: false,
        eliteModifiers: [],
        seed: 5,
      },
      rewards: {
        rank: "normal",
        xp: 40,
        acorns: 12,
        ash: 4,
        emberCoal: 0,
        phoenixFeathers: 0,
        runes: [],
        levelsGained: 0,
        items: [],
        itemPick: { kind: "salvageAll" },
        salvagedAsh: 0,
        boonOffer: [
          { id: "crushing-blow", grade: "spark" },
          { id: "banked-coals", grade: "flame" },
          { id: "brutality", grade: "spark" },
        ],
        boonPick: null,
      },
    },
  };
  return serializeGame(state);
}

/** A save in a fight against the Ember Thief in the Rotwood (second run). */
export function saveThiefFight(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  const act = GAME_DATA.acts[1];
  if (!act || !GAME_DATA.thief) throw new Error("No Rotwood or Thief");
  const state: GameState = {
    ...base,
    hero: { ...base.hero, level: 22 },
    progress: { ...base.progress, actsCleared: ["ashen-fields"] },
    legacy: { ...base.legacy, prestige: 1 },
    run: {
      actId: act.id,
      stage: 3,
      lifeFraction: 1,
      phase: "fight",
      encounter: {
        enemyId: GAME_DATA.thief.id,
        level: 21,
        boss: false,
        eliteModifiers: [],
        seed: 11,
        thief: true,
      },
      rewards: null,
    },
  };
  return serializeGame(state);
}

/** The seventh run: every act cleared, six branches taken. */
function lateGame(prestige: number): GameState {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  const branches = (SKILL_TREE.prestigeBranches ?? []).map((b) => b.id).slice(0, prestige);
  return {
    ...base,
    hero: { ...base.hero, level: 100 },
    progress: {
      ...base.progress,
      actsCleared: GAME_DATA.acts.map((a) => a.id),
      trainerUnlocked: true,
      rotationSlots: 4,
    },
    stats: { fights: 2841, wins: 2790, deaths: 51, retreats: 4, bossKills: 88 },
    legacy: { ...base.legacy, prestige, branches },
  };
}

/** The Ashen Harvester fell in the seventh run: the final Prestige waits. */
export function saveBeforeFinalPrestige(): string {
  const state = lateGame(6);
  return serializeGame({
    ...state,
    pendingPrestige: { actId: "emberfall", stage: 15, enemyName: "The Ashen Harvester" },
  });
}

/** After the final Prestige: the Camp with The Last Ember open. */
export function saveFinaleCamp(): string {
  return serializeGame(lateGame(7));
}

/** The Harvester's Core is out: the ending. */
export function saveEnding(): string {
  const state = lateGame(7);
  return serializeGame({
    ...state,
    legacy: { ...state.legacy, finaleAttempts: 3, finaleWon: true },
    notice: {
      kind: "ending",
      actId: "last-ember",
      stage: 7,
      enemyName: "The Harvester's Core",
    },
  });
}

/**
 * A Camp save in the sixth run with a deep Ash Tree: Vanquisher up to tier III, Berserker and
 * Ravager at tier I, much of the Steel region and the trunk learned (klassengeruest-v1.md).
 */
export function saveDeepTree(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  const branches = ["vanquisher", "berserker", "vanquisher", "ravager", "vanquisher"];
  const wanted = SKILL_TREE.nodes.filter(
    (n) =>
      (n.branch === "steel" || n.branch === "trunk" || n.prestigeBranch === "vanquisher") &&
      !(n.prestigeBranch && n.prestigeBranch !== "vanquisher"),
  );
  let learned: Record<string, number> = { ...base.hero.learned };
  // Keystones cost 3 Skill Points; Prestige 5 has three Keystone places.
  let budget = { skillPoints: 67, keystones: 3 };
  for (let pass = 0; pass < 12; pass++) {
    for (const node of wanted) {
      if (node.id.endsWith("t3b") || node.id.endsWith("t2n")) continue;
      if (!learnBlockReason(SKILL_TREE, learned, node.id, budget, branches)) {
        const r = learnNodes(SKILL_TREE, learned, [node.id], budget, branches);
        learned = { ...r.learned };
        budget = { ...r.budget };
      }
    }
  }
  learned = { ...learned, "pb-ravager-entry": 1, "pb-ravager-a1": 1 };
  const state: GameState = {
    ...base,
    hero: { ...base.hero, level: 75, learned, unspentSkillPoints: 6 },
    progress: { ...base.progress, actsCleared: [], trainerUnlocked: true, rotationSlots: 4 },
    legacy: { ...base.legacy, prestige: 5, branches },
  };
  return serializeGame(state);
}

/** A Camp save with two Rings and a Sword in the inventory and both Ring slots empty. */
export function saveWithRings(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  const rng = new Rng(11);
  const roll = (baseId: string) =>
    rollItem(GAME_DATA.items, { baseId, itemLevel: 3, rarity: "magic" }, rng);
  const state: GameState = {
    ...base,
    inventory: [
      { item: { ...roll("iron-ring"), id: "ring-a" }, x: 0, y: 0 },
      { item: { ...roll("garnet-ring"), id: "ring-b" }, x: 1, y: 0 },
      { item: { ...roll("sword"), id: "spare-sword" }, x: 2, y: 0 },
    ],
  };
  return serializeGame(state);
}

/**
 * A Camp save in the fifth run with a well refined sword (Rank 13): the Edge path walked, Cooling
 * chosen, three Echoes earned and Ashfall Wrath worn. `extra` lists more Heirloom nodes to learn.
 */
export function saveMastery(extra: readonly string[] = []): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  let state: GameState = {
    ...base,
    hero: { ...base.hero, level: 45 },
    wallet: { ...base.wallet, acorns: 500 },
    progress: {
      ...base.progress,
      actsCleared: ["ashen-fields", "rotwood", "ember-wastes"],
      trainerUnlocked: true,
    },
    legacy: {
      ...base.legacy,
      prestige: 4,
      echoes: {
        "ashfall-wrath": { stage: 4, prestige: 3 },
        "whispering-brood": { stage: 3, prestige: 3 },
        "crowned-cinder": { stage: 2, prestige: 3 },
      },
    },
  };
  const learn = [
    "precision",
    "precision",
    "precision",
    "full-swing",
    "full-swing",
    "heat-cooling",
    "edge-t1",
    "edge-t1",
    "edge-t1",
    "edge-keen-edge",
    ...extra,
  ];
  for (const nodeId of learn)
    state = applyAction(state, GAME_DATA, { type: "learnMastery", nodeId });
  state = applyAction(state, GAME_DATA, { type: "setEcho", echoId: "ashfall-wrath" });
  return serializeGame(state);
}

/** A fresh Cinderguard at the Camp with Skill Points and Acorns: the web from its start (level-v2.md). */
export function saveWebTree(runes: Readonly<Record<string, number>> = {}): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  return serializeGame({
    ...base,
    hero: { ...base.hero, level: 12, unspentSkillPoints: 8 },
    wallet: { ...base.wallet, acorns: 5000, runes },
    progress: { ...base.progress, trainerUnlocked: true },
  });
}

/** Class select: the first class, its six free points into Strength and Vitality, Begin. */
export async function createHero(page: Page, onAttributes?: () => Promise<void>): Promise<void> {
  await page.getByRole("button", { name: "Next" }).click();
  await onAttributes?.();
  // The Cinderguard starts at Strength 5 and creation stops at 7: the sixth point goes to Agility.
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Add Vitality" }).click();
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Add Strength" }).click();
  await page.getByRole("button", { name: "Add Agility" }).click();
  await page.getByRole("button", { name: "Begin" }).click();
}

/** On the road into the Rotwood (the newest act of run 2), right before the Gatekeeper of Stage 5. */
export function saveBeforeGatekeeper(): string {
  const camp = JSON.parse(saveAfterAct1()) as GameState;
  const out = applyAction(camp, GAME_DATA, { type: "setOut", actId: "rotwood" });
  return serializeGame(onMap(out, 5));
}

/** In the Camp with every Unique found and every Runeword forged: two banners hang. */
export function saveCollector(): string {
  const camp = JSON.parse(saveAfterAct1()) as GameState;
  return serializeGame({
    ...camp,
    legacy: {
      ...camp.legacy,
      trophies: [...ITEM_CATALOG.uniques.keys()],
      runewords: RUNEWORDS.map((w) => w.id),
    },
  });
}

/** After The Last Ember with Wildfire `best` cleared (III by default): the next tier is open. */
export function saveWildfire(best = 3): string {
  const camp = JSON.parse(saveAfterAct1()) as GameState;
  return serializeGame({
    ...camp,
    hero: { ...camp.hero, level: 100, xp: 0 },
    legacy: { ...camp.legacy, prestige: 7, finaleWon: true, wildfire: best },
  });
}

/** Level 100 with 5 Ashborn Levels, 3 points spent on Life (neuausrichtung-v1.md 7.3). */
export function saveAshborn(): string {
  const camp = JSON.parse(saveWildfire()) as GameState;
  return serializeGame({
    ...camp,
    hero: { ...camp.hero, ashborn: { level: 5, xp: 4000, points: { life: 3 } } },
    wallet: { ...camp.wallet, acorns: 5000 },
  });
}

/**
 * Puts a trip onto its act map at `stage` (act-karte-entwurf-v1.md): the rows up to there are
 * fights on the middle lane, walked already; `kinds` sets the next row's three nodes.
 */
function onMap(
  state: GameState,
  stage: number,
  kinds?: readonly [NodeKind, NodeKind, NodeKind],
  extra: Partial<RunState> = {},
): GameState {
  const run = state.run;
  if (!run?.map) throw new Error("No act map");
  const rows = run.map.rows.map((row, r) => {
    if (r < stage) {
      const open = (lane: number) => r === stage - 1 && kinds !== undefined && lane === 1;
      return row.map((n) => ({
        ...n,
        kind: "fight" as const,
        next: open(n.lane) ? [0, 1, 2] : n.next,
      }));
    }
    if (r === stage && kinds && row.length === 3) {
      return row.map((n, i) => ({ ...n, kind: kinds[i] ?? n.kind }));
    }
    return row;
  });
  return {
    ...state,
    run: {
      ...run,
      stage,
      map: { rows },
      path: Array.from({ length: stage }, () => 1),
      fights: stage - 1,
      ...extra,
    },
  };
}

/** The rewards of a won normal fight, all picked: the road ahead is next. */
function wonFight(state: GameState): Partial<RunState> {
  const act = GAME_DATA.acts.find((a) => a.id === state.run?.actId);
  const rewards: Rewards = {
    rank: "normal",
    xp: 30,
    acorns: 10,
    ash: 4,
    emberCoal: 0,
    phoenixFeathers: 0,
    runes: [],
    levelsGained: 0,
    items: [],
    itemPick: { kind: "salvageAll" },
    salvagedAsh: 12,
  };
  return {
    phase: "rewards",
    rewards,
    encounter: {
      enemyId: act?.enemies[0]?.id ?? "",
      level: 3,
      boss: false,
      eliteModifiers: [],
      seed: 4,
    },
  };
}

/** On the road through the Ashen Fields in the second run (an old act: it burns under an Omen). */
function oldActTrip(): GameState {
  const camp = JSON.parse(saveAfterAct1()) as GameState;
  const omens = omenOffer(camp, GAME_DATA, "ashen-fields").slice(0, 1);
  return applyAction(camp, GAME_DATA, { type: "setOut", actId: "ashen-fields", omens });
}

/** On the road in the Ashen Fields (second run), Stage 2 won: the act map asks where to go. */
export function saveAtFork(): string {
  const out = oldActTrip();
  const kinds = ["hearth", "cache", "event"] as const;
  return serializeGame(onMap(out, 2, kinds, { ...wonFight(out), lifeFraction: 0.55 }));
}

/** On an Event of the act map: the Hedgehog Peddler, and the hero has no Acorns to pay. */
export function saveAtEvent(eventId = "hedgehog-peddler"): string {
  const out = oldActTrip();
  const state = onMap(out, 7, undefined, { visit: { kind: "event", event: eventId } });
  const rows = state.run?.map?.rows.map((row, r) =>
    r === 6 ? row.map((n) => ({ ...n, kind: "event" as const })) : row,
  );
  return serializeGame({
    ...state,
    wallet: { ...state.wallet, acorns: 0 },
    flaskCharges: 1,
    run: state.run && rows ? { ...state.run, map: { rows } } : state.run,
  });
}

/** Marisha on the road: three slots a quarter cheaper. */
export function saveAtMarisha(): string {
  const out = oldActTrip();
  const state = onMap(out, 7, undefined, {
    visit: { kind: "marisha", slots: ["helm", "gloves", "ring"], bought: [] },
  });
  const rows = state.run?.map?.rows.map((row, r) =>
    r === 6 ? row.map((n) => ({ ...n, kind: "marisha" as const })) : row,
  );
  return serializeGame({
    ...state,
    wallet: { ...state.wallet, acorns: 2000 },
    run: state.run && rows ? { ...state.run, map: { rows } } : state.run,
  });
}

/** Run 1 at the Warden's Gate: the boss of the Ashen Fields is next, the hero below its level. */
export function saveAtWardensGate(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  const out = applyAction(base, GAME_DATA, { type: "setOut", actId: "ashen-fields" });
  return serializeGame(onMap(out, 15, undefined, { lifeFraction: 0.7 }));
}

/** A new hero on the road through the Ashen Fields (run 1), Stage 3 ahead: the third fight, an item pick. */
export function saveRun1Stage3(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "cinderguard" });
  const out = applyAction(base, GAME_DATA, { type: "setOut", actId: "ashen-fields" });
  // One way on: the item pick ends in the done card, not in a path choice.
  return serializeGame(
    onMap(out, 3, ["fight", "fight", "fight"], {
      map: {
        rows: (onMap(out, 3, ["fight", "fight", "fight"]).run?.map?.rows ?? []).map((row, r) =>
          r === 2 ? row.map((n) => ({ ...n, next: [n.lane] })) : row,
        ),
      },
    }),
  );
}

/** Kills for the Hunts (hunts-entwurf-v1.md): the Ashen Fields' enemies on different Trails. */
const HUNT_KILLS = { "ashen-brute": 30, "ashen-skirmisher": 9, "cinder-caster": 110, gorrak: 4 };

/** On the road in the Ashen Fields (run 2), Stage 2 won: a Hunt node after the Ashen Prowler ahead. */
export function saveAtHuntFork(prowlerKills = 9): string {
  const out = oldActTrip();
  const state = onMap(out, 2, ["fight", "hunt", "elite"], wonFight(out));
  const rows = state.run?.map?.rows.map((row, r) =>
    r === 2 ? row.map((n) => (n.kind === "hunt" ? { ...n, quarry: "ashen-skirmisher" } : n)) : row,
  );
  return serializeGame({
    ...state,
    legacy: { ...state.legacy, hunts: { ...HUNT_KILLS, "ashen-skirmisher": prowlerKills } },
    run: state.run && rows ? { ...state.run, map: { rows } } : state.run,
  });
}

/** A Camp save in run 2 with hunted Ashen Fields enemies: the Bestiary has pages. */
export function saveHunter(): string {
  const state = JSON.parse(saveAfterAct1()) as GameState;
  return serializeGame({ ...state, legacy: { ...state.legacy, hunts: HUNT_KILLS } });
}
