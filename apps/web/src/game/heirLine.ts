import { GAME_DATA } from "@emberheir/content";
import { type GameState, getAct } from "@emberheir/sim";

/** Where a character stands: the Harvest it walks toward and the place it waits. */
export function wherePlace(save: GameState): string {
  const act = save.run ? getAct(GAME_DATA, save.run.actId) : undefined;
  return `Harvest ${save.legacy.prestige + 1} · ${
    act && save.run ? `${act.name}, Stage ${save.run.stage}` : "In the Camp"
  }`;
}

/** One line about where a character stands. */
export function whereText(save: GameState): string {
  const act = save.run ? getAct(GAME_DATA, save.run.actId) : undefined;
  return `Harvest ${save.legacy.prestige + 1} · Level ${save.hero.level} · ${
    act && save.run ? `${act.name}, Stage ${save.run.stage}` : "In the Camp"
  }`;
}
