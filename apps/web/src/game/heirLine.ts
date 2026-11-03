import { GAME_DATA } from "@emberheir/content";
import { type GameState, getAct } from "@emberheir/sim";

/** The act a character stands in, or the Camp. */
export function continuePlace(save: GameState): string {
  const act = save.run ? getAct(GAME_DATA, save.run.actId) : undefined;
  return act?.name ?? "Camp";
}

/** One line about where a character stands. */
export function whereText(save: GameState): string {
  const act = save.run ? getAct(GAME_DATA, save.run.actId) : undefined;
  return `Harvest ${save.legacy.prestige + 1} · Level ${save.hero.level} · ${
    act && save.run ? `${act.name}, Stage ${save.run.stage}` : "In the Camp"
  }`;
}
