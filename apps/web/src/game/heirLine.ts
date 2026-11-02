import { GAME_DATA } from "@emberheir/content";
import { type GameState, getAct, heroTitle } from "@emberheir/sim";

/** The short line under Continue: class title, level and the act (or the Camp). */
export function continueLine(save: GameState): string {
  const act = save.run ? getAct(GAME_DATA, save.run.actId) : undefined;
  return `${heroTitle(save, GAME_DATA)} · Level ${save.hero.level} · ${act?.name ?? "Camp"}`;
}

/** One line about where a character stands. */
export function whereText(save: GameState): string {
  const act = save.run ? getAct(GAME_DATA, save.run.actId) : undefined;
  return `Harvest ${save.legacy.prestige + 1} · Level ${save.hero.level} · ${
    act && save.run ? `${act.name}, Stage ${save.run.stage}` : "In the Camp"
  }`;
}
