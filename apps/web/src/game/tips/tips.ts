import type { GameState } from "@emberheir/sim";
import { z } from "zod";
import { parseStored, storageKey } from "../../storage";

/**
 * First Steps (Release 1.0): Old Nan says one short line the first time a new player reaches
 * each moment. A tip shows once per browser (shared by every character slot), never again.
 * UI only: the sim and the save game know nothing about it.
 */
export const TIP_IDS = ["welcome", "road", "fight", "points", "pick", "death", "camp"] as const;
export type TipId = (typeof TIP_IDS)[number];

export const TIP_LINES: Readonly<Record<TipId, string>> = {
  welcome:
    "Sit, child. Each year the Harvester burns the land, and only an Heir of the Ember can stop it. Set Out when you are ready. I keep the fire.",
  road: "Your Heir fights on their own. You choose the path, the gear and the Battle Plan. Life does not come back between stages, so mind your Flask.",
  fight:
    "Your Heir swings by themselves. Skills in the Battle Plan fire once the Heat orb on the right holds enough.",
  points:
    "Skill Points! Spend them in the Ash Tree (press T). New skills go into your Battle Plan.",
  pick: "Loot! Equip wears it, Take keeps it in your bag. Whatever you leave turns to Ash.",
  death:
    "Fell, did you? Dying costs you the road, not your things. Grow stronger and walk it again.",
  camp: "Back at the fire. Click anyone in the Camp to see what they offer. Thoric forges, the Wagon keeps what you don't wear.",
};

/** What the screen shows right now, as far as tips care. */
export interface TipContext {
  readonly state: GameState;
  /** A window, overlay, Story Blip or Harvest covers the screen: no tip now. */
  readonly covered: boolean;
}

/** The tip for this moment, or null: the first unseen one whose moment it is. */
export function pickTip(ctx: TipContext, seen: ReadonlySet<TipId>): TipId | null {
  const { state } = ctx;
  if (ctx.covered || state.pendingPrestige) return null;
  const run = state.run;
  const due = (id: TipId): boolean => {
    switch (id) {
      case "welcome":
        return !run && !state.notice && state.stats.fights === 0 && state.legacy.prestige === 0;
      case "road":
        return run?.phase === "intermission" && state.stats.fights === 0;
      case "fight":
        return run?.phase === "fight" && state.stats.fights === 0;
      case "points":
        return (
          !!run &&
          run.phase !== "fight" &&
          state.stats.fights > 0 &&
          state.hero.unspentSkillPoints > 0
        );
      case "pick":
        return (
          run?.phase === "rewards" && !!run.rewards?.items.length && run.rewards.itemPick === null
        );
      case "death":
        return state.notice?.kind === "death";
      case "camp":
        return !run && !state.notice && state.stats.fights > 0;
    }
  };
  // The death notice covers the road: only its own tip may show over it.
  if (state.notice) return state.notice.kind === "death" && !seen.has("death") ? "death" : null;
  return TIP_IDS.find((id) => !seen.has(id) && due(id)) ?? null;
}

const SEEN_KEY = storageKey("tipsSeen");
const seenSchema = z
  .array(z.string())
  .transform((ids) => ids.filter((id): id is TipId => (TIP_IDS as readonly string[]).includes(id)));

/**
 * The tips already shown. Under browser automation (the Playwright tests) nothing is stored
 * yet, so every tip counts as seen and no test is stopped by Old Nan; a test that wants the
 * tips stores an empty list first.
 */
export function loadSeenTips(): Set<TipId> {
  try {
    const json = localStorage.getItem(SEEN_KEY);
    if (json === null && navigator.webdriver) return new Set(TIP_IDS);
    return new Set(parseStored(json, seenSchema, []));
  } catch {
    return new Set();
  }
}

export function saveSeenTips(seen: ReadonlySet<TipId>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // Storage can be blocked; the tip just shows again next time.
  }
}
