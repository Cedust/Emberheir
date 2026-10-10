import { GAME_DATA, SKILL_TREE } from "@emberheir/content";
import type { Page } from "@playwright/test";
import {
  type GameState,
  type Item,
  applyAction,
  learnBlockReason,
  learnNodes,
  newGame,
  rollItem,
  rollUnique,
  Rng,
  serializeGame,
} from "@emberheir/sim";

/** A save right after Gorrak fell in the first run (the harvest boss), in a Rare Body Armor. */
export function saveAfterHarvestBoss(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "warrior" });
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

/** Loads `json` as the save game once (a reload keeps what the game saved since). */
export async function seedSave(page: Page, json: string): Promise<void> {
  await page.addInitScript((save) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("emberheir.save", save);
      sessionStorage.setItem("seeded", "1");
    }
  }, json);
}

/** A Camp save in the second run: Gorrak fell, the road to the Rotwood is open. */
export function saveAfterAct1(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "warrior" });
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
  const base = newGame(GAME_DATA, { seed: 42, classId: "warrior" });
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
  const base = newGame(GAME_DATA, { seed: 42, classId: "warrior" });
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

/** The Rotwood's boss just fell in run 3: a Boss Hoard of six cards, one of them a new trophy. */
export function saveBossHoard(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "warrior" });
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
        runes: ["moss"],
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
  const base = newGame(GAME_DATA, { seed: 42, classId: "warrior" });
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
  const base = newGame(GAME_DATA, { seed: 42, classId: "warrior" });
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
  const base = newGame(GAME_DATA, { seed: 42, classId: "warrior" });
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
 * A Camp save in the sixth run with a deep Skill Tree: Duelist up to tier III, Warden and
 * Tactician at tier I, much of the Might side of the web learned (skilltree-v2.md).
 */
export function saveDeepTree(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "warrior" });
  const branches = ["duelist", "warden", "duelist", "tactician", "duelist"];
  const wanted = SKILL_TREE.nodes.filter(
    (n) =>
      (n.branch === "core" || n.branch === "might" || n.prestigeBranch === "duelist") &&
      !(n.prestigeBranch && n.prestigeBranch !== "duelist"),
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
  learned = { ...learned, "pb-warden-entry": 1, "pb-warden-a1": 1 };
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
  const base = newGame(GAME_DATA, { seed: 42, classId: "warrior" });
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
 * A Camp save in the fifth run with a well refined sword (Rank 13): Riposte walked, Cooling
 * chosen, three Echoes earned and Ashfall Wrath worn. `extra` lists more Mastery nodes to learn.
 */
export function saveMastery(extra: readonly string[] = []): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "warrior" });
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
    "riposte-1",
    "riposte-2",
    "riposte-3",
    "riposte-counterweight",
    ...extra,
  ];
  for (const nodeId of learn)
    state = applyAction(state, GAME_DATA, { type: "learnMastery", nodeId });
  state = applyAction(state, GAME_DATA, { type: "setEcho", echoId: "ashfall-wrath" });
  return serializeGame(state);
}

/** A fresh Warrior at the Camp with Skill Points and Acorns: the web from its start (level-v2.md). */
export function saveWebTree(): string {
  const base = newGame(GAME_DATA, { seed: 42, classId: "warrior" });
  return serializeGame({
    ...base,
    hero: { ...base.hero, level: 12, unspentSkillPoints: 8 },
    wallet: { ...base.wallet, acorns: 5000 },
    progress: { ...base.progress, trainerUnlocked: true },
  });
}

/** Class select: the first class, its six free points into Strength and Vitality, Begin. */
export async function createHero(page: Page, onAttributes?: () => Promise<void>): Promise<void> {
  await page.getByRole("button", { name: "Next" }).click();
  await onAttributes?.();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Add Strength" }).click();
    await page.getByRole("button", { name: "Add Vitality" }).click();
  }
  await page.getByRole("button", { name: "Begin" }).click();
}
