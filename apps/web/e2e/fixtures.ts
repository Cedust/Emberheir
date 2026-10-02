import { GAME_DATA } from "@emberheir/content";
import type { Page } from "@playwright/test";
import { type GameState, type Item, newGame, rollItem, Rng, serializeGame } from "@emberheir/sim";

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
