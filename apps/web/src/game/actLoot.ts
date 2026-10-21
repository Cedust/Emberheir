import { GAME_DATA, ITEM_CATALOG } from "@emberheir/content";
import { type ActData, describeBonuses, lootGate, PROGRESSION } from "@emberheir/sim";
import type { NoteHover } from "../ui/ItemTooltip";

/** Act loot (act-beute-entwurf-v1.md): each act's Home Rune and Home Uniques, in plain words. */

const TOP_RUNE_RANK = Math.max(...[...GAME_DATA.items.runes.values()].map((r) => r.rank));

/** The two top Rune ranks (Volt, Dusk) only drop from Elites, Gatekeepers, Bosses and Caches. */
export const isHighRune = (id: string) =>
  (GAME_DATA.items.runes.get(id)?.rank ?? 0) > TOP_RUNE_RANK - PROGRESSION.highRuneRanks;

/** The Home Rune of an act, by the act's id. */
export const homeRuneOf = (actId: string | undefined) =>
  GAME_DATA.acts.find((a) => a.id === actId)?.homeRune;

/** The Home Rune's tooltip: how often it drops here and what it gives. */
export function homeRuneNote(act: ActData): NoteHover | undefined {
  const rune = act.homeRune ? ITEM_CATALOG.runes.get(act.homeRune) : undefined;
  if (!rune) return undefined;
  const high = isHighRune(rune.id);
  const every = Math.round(1 / (high ? PROGRESSION.homeHighRuneShare : PROGRESSION.homeRuneShare));
  return {
    name: `${rune.name} Rune`,
    kind: "Home Rune",
    explain:
      (high
        ? `In ${act.name}, 1 in ${every} Runes from Elites, Gatekeepers, Bosses and Caches is ${rune.name}.`
        : `In ${act.name}, 1 in ${every} Runes is ${rune.name}.`) +
      ` Weapon: ${describeBonuses(rune.bonuses.weapon).join(", ")}.`,
  };
}

/** A Home Unique's tooltip: where it comes from and whether this Heir found one yet. */
export function homeUniqueNote(
  id: string,
  act: ActData,
  found: boolean,
  prestige: number,
): NoteHover {
  const unique = ITEM_CATALOG.uniques.get(id);
  const power = unique?.powerId ? ITEM_CATALOG.powers.get(unique.powerId) : undefined;
  const open = Object.values(lootGate(prestige).legendary).some((c) => c > 0);
  return {
    name: unique?.name ?? id,
    kind: "Home Unique",
    explain: `Drops ${PROGRESSION.homeUniqueWeight}× as often in ${act.name}.${power ? ` ${power.description}` : ""}`,
    status: !open ? "Uniques drop from run 4 on" : found ? "Found" : "Not found yet",
  };
}
