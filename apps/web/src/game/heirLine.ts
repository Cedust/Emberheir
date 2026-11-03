import { GAME_DATA } from "@emberheir/content";
import { type GameState, getAct, nextAct } from "@emberheir/sim";

/** The act a character stands in; in the Camp, the act the caravan camps in. */
export function continuePlace(save: GameState): string {
  const act = save.run ? getAct(GAME_DATA, save.run.actId) : nextAct(save, GAME_DATA);
  return act.name;
}

/** One line about where a character stands. */
export function whereText(save: GameState): string {
  const act = save.run ? getAct(GAME_DATA, save.run.actId) : undefined;
  return `Harvest ${save.legacy.prestige + 1} · Level ${save.hero.level} · ${
    act && save.run ? `${act.name}, Stage ${save.run.stage}` : "In the Camp"
  }`;
}
