import { GAME_DATA, SKILL_TREE } from "@emberheir/content";
import type { Page } from "@playwright/test";
import {
  type GameState,
  type Item,
  newGame,
  rollItem,
  rollUnique,
  Rng,
  serializeGame,
} from "@emberheir/sim";

/** A save right after Gorrak fell in the first run (the harvest boss): an Epic Body Armor to seal. */
export function saveAfterHarvestBoss(): string {
  const base = newGame(GAME_DATA, { seed: 42, starterWeapon: "sword" });
  const rng = new Rng(7);
  const armor = rollItem(
    GAME_DATA.items,
    { baseId: "chain-mail", itemLevel: 4, rarity: "epic" },
    rng,
  );
  const state: GameState = {
    ...base,
    hero: {
      ...base.hero,
      level: 10,
      attributes: { ...base.hero.attributes, strength: 12, vitality: 9 },
      unspentSkillPoints: 5,
      equipment: { ...base.hero.equipment, body: armor },
    },
    wallet: { ...base.wallet, gold: 240, dust: 380, reforgeStones: 6, ascensionShards: 1 },
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
  const base = newGame(GAME_DATA, { seed: 42, starterWeapon: "sword" });
  const state: GameState = {
    ...base,
    hero: { ...base.hero, level: 24, unspentSkillPoints: 5 },
    progress: { ...base.progress, actsCleared: ["ashen-fields"], trainerUnlocked: true },
    legacy: { ...base.legacy, prestige: 1 },
  };
  return serializeGame(state);
}

/** A Camp save after the first trip into the Rotwood: Eldrin has joined, three Ash Runes in the pouch. */
export function saveWithRunes(): string {
  const base = newGame(GAME_DATA, { seed: 42, starterWeapon: "sword" });
  const state: GameState = {
    ...base,
    hero: { ...base.hero, level: 24 },
    wallet: { ...base.wallet, gold: 400, runes: { ash: 3 } },
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
  const base = newGame(GAME_DATA, { seed: 42, starterWeapon: "sword" });
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
    wallet: { ...base.wallet, dust: 400, kindling: 2 },
    inventory: [{ item: ring, x: 0, y: 0 }],
    progress: { ...base.progress, actsCleared: ["ashen-fields"], trainerUnlocked: true },
    legacy: {
      ...base.legacy,
      prestige: 1,
      codex: { conditions: { "on-crit": 2, "when-hit": 1 }, effects: { burn: 2, barrier: 3 } },
    },
  };
  return serializeGame(state);
}

/** The Rotwood's boss just fell in run 3: a Boss Hoard of six cards, one of them a new trophy. */
export function saveBossHoard(): string {
  const base = newGame(GAME_DATA, { seed: 42, starterWeapon: "sword" });
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
        gold: 120,
        dust: 40,
        reforgeStones: 4,
        ascensionShards: 1,
        runes: ["moss"],
        levelsGained: 0,
        items,
        picks: 2,
        itemPick: null,
        salvagedDust: 0,
        spoils: [],
        spoilsPick: null,
        newTrophies: ["thornsong"],
      },
    },
  };
  return serializeGame(state);
}

/** A save at the Ember Shrine after Stage 5 of the first run, items and spoils already taken. */
export function saveShrine(): string {
  const base = newGame(GAME_DATA, { seed: 42, starterWeapon: "sword" });
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
        gold: 12,
        dust: 4,
        reforgeStones: 0,
        ascensionShards: 0,
        runes: [],
        levelsGained: 0,
        items: [],
        itemPick: { kind: "salvageAll" },
        salvagedDust: 0,
        spoils: [],
        spoilsPick: null,
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
  const base = newGame(GAME_DATA, { seed: 42, starterWeapon: "sword" });
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

/** The tenth run: every act cleared, nine branches taken. */
function lateGame(prestige: number): GameState {
  const base = newGame(GAME_DATA, { seed: 42, starterWeapon: "sword" });
  const branches = (SKILL_TREE.prestigeBranches ?? []).map((b) => b.id).slice(0, prestige);
  return {
    ...base,
    hero: { ...base.hero, level: 200 },
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

/** The Ashen Harvester fell in the tenth run: the final Prestige waits. */
export function saveBeforeFinalPrestige(): string {
  const state = lateGame(9);
  return serializeGame({
    ...state,
    pendingPrestige: { actId: "emberfall", stage: 15, enemyName: "The Ashen Harvester" },
  });
}

/** After the final Prestige: the Camp with The Last Ember open. */
export function saveFinaleCamp(): string {
  return serializeGame(lateGame(10));
}

/** The Harvester's Core is out: the ending. */
export function saveEnding(): string {
  const state = lateGame(10);
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
