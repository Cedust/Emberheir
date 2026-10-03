import { GAME_DATA } from "@emberheir/content";
import { type ActData, finaleEchoes, isFinaleAct } from "@emberheir/sim";

/** True for The Last Ember (M11): a gauntlet of Warden echoes, then the Harvester's Core. */
export const inFinale = (act: ActData) => isFinaleAct(GAME_DATA, act.id);

/** The foe at a finale stage: a Warden echo, then the Core on the last stage. */
export function finaleFoe(stage: number): string {
  const finale = GAME_DATA.finale;
  const echo = finaleEchoes(GAME_DATA)[stage - 1];
  if (echo && finale && stage < finale.stages) return `Echo of ${echo.boss.name}`;
  return finale?.boss.name ?? "";
}

/** The act's title in the run header: "Act 3 · Ember Wastes", or just "The Last Ember". */
export const actTitle = (act: ActData) =>
  inFinale(act) ? act.name : `Act ${act.number} · ${act.name}`;
