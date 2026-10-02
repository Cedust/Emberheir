import { GAME_DATA } from "@emberheir/content";
import type { Page } from "@playwright/test";
import { type GameState, newGame, rollItem, Rng, serializeGame } from "@emberheir/sim";

/** A save right after the Mother of Rot fell (the harvest boss): an Epic Body Armor to seal, loot in inventory and stash. */
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
    progress: { ...base.progress, actsCleared: ["ashen-fields", "rotwood"], trainerUnlocked: true },
    stats: { fights: 22, wins: 19, deaths: 3, retreats: 0, bossKills: 2 },
    pendingPrestige: { actId: "rotwood", stage: 15, enemyName: "Mother of Rot" },
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

/** A save in the Camp after Gorrak fell: the road to the Rotwood is open. */
export function saveAfterAct1(): string {
  const base = newGame(GAME_DATA, { seed: 42, starterWeapon: "sword" });
  const state: GameState = {
    ...base,
    hero: { ...base.hero, level: 6, unspentSkillPoints: 5 },
    progress: { ...base.progress, actsCleared: ["ashen-fields"], trainerUnlocked: true },
  };
  return serializeGame(state);
}
