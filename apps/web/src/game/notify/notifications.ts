import { GAME_DATA, echoStageName } from "@emberheir/content";
import {
  type GameState,
  type Item,
  PROGRESSION,
  getAct,
  getBase,
  hearthEmbers,
  heroWeaponRank,
} from "@emberheir/sim";
import { BOSS_TRAIL_TEXT, TRAIL_TEXT, trailTitle } from "../hunts";

/**
 * In-game notifications (notification-system-v1): small cards top right for moments that
 * happen on the side. Looks only; they never change the game. Currencies, items and Runes have
 * their own drop animations and get none.
 */
export type NotificationArt =
  | { readonly kind: "persona"; readonly id: string }
  | { readonly kind: "weapon"; readonly weaponId: string }
  | { readonly kind: "item"; readonly item: Item }
  | { readonly kind: "echo"; readonly color: string }
  | { readonly kind: "trail"; readonly tier: number }
  | { readonly kind: "waymark" }
  | { readonly kind: "icon"; readonly icon: "fire" | "flame" };

export interface GameNotification {
  /** The same key is shown only once (a reload of the same rewards screen excepted). */
  readonly key: string;
  readonly kind: "bounty" | "waymark" | "hearth" | "hunt" | "ashborn" | "echo" | "trophy" | "rank";
  readonly title: string;
  readonly sub?: string;
  readonly art: NotificationArt;
}

const hex = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

/** A Unique seen for the first time, the moment its card is turned over. */
export function trophyNotification(item: Item): GameNotification {
  return {
    key: `trophy:${item.id}`,
    kind: "trophy",
    title: "New Trophy",
    sub: item.name,
    art: { kind: "item", item },
  };
}

/** The moments of a fight's rewards, in the order they are shown. */
function rewardNotifications(state: GameState): GameNotification[] {
  const run = state.run;
  const rewards = run?.rewards;
  if (!run || !rewards) return [];
  const at = `${run.actId}:${run.stage}:${run.encounter?.seed ?? 0}`;
  const out: GameNotification[] = [];
  if (rewards.bountyDone) {
    out.push({
      key: `bounty:${at}`,
      kind: "bounty",
      title: "Bounty done",
      sub: "Turn in at Eldrin",
      art: { kind: "persona", id: "eldrin" },
    });
  }
  if (rewards.echo) {
    const def = GAME_DATA.echoes.find((e) => e.id === rewards.echo?.id);
    if (def) {
      out.push({
        key: `echo:${at}`,
        kind: "echo",
        title: rewards.echo.stage > 1 ? "Echo grows" : "New Echo",
        sub: `${def.name} ${echoStageName(rewards.echo.stage)}`,
        art: { kind: "echo", color: hex(def.color) },
      });
    }
  }
  if (rewards.waymark) {
    out.push({
      key: `waymark:${at}`,
      kind: "waymark",
      title: "Waymark",
      sub: "+1 Skill Point",
      art: { kind: "waymark" },
    });
  }
  // A won Waymark before the boss heals (neuausrichtung-v1.md 5.4).
  if (hearthEmbers(getAct(GAME_DATA, run.actId), run.stage, run.wildfire)) {
    out.push({
      key: `hearth:${at}`,
      kind: "hearth",
      title: "Hearth Embers",
      sub: `+${Math.round(PROGRESSION.hearthEmbers * 100)} % Life`,
      art: { kind: "icon", icon: "fire" },
    });
  }
  const hunt = rewards.hunt;
  if (hunt?.tierUp) {
    out.push({
      key: `hunt:${at}`,
      kind: "hunt",
      title: `${trailTitle(hunt.tier)}!`,
      sub: (hunt.boss ? BOSS_TRAIL_TEXT : TRAIL_TEXT)[hunt.tier] ?? "",
      art: { kind: "trail", tier: hunt.tier },
    });
  }
  if (rewards.ashbornLevels) {
    const n = rewards.ashbornLevels;
    out.push({
      key: `ashborn:${at}`,
      kind: "ashborn",
      title: `Ashborn ${state.hero.ashborn?.level ?? ""}`.trim(),
      sub: `+${n} Ashborn point${n > 1 ? "s" : ""}`,
      art: { kind: "icon", icon: "flame" },
    });
  }
  return out;
}

/**
 * What changed between two states that deserves a notification. `prev` is null when a save was
 * just loaded: a rewards screen shows its moments again, nothing else.
 */
export function notificationsFor(prev: GameState | null, next: GameState): GameNotification[] {
  const out: GameNotification[] = [];
  const rewards = next.run?.rewards;
  if (rewards && rewards !== prev?.run?.rewards && !prev?.run?.rewards) {
    out.push(...rewardNotifications(next));
  }
  if (prev && prev.hero.weaponId === next.hero.weaponId) {
    const before = heroWeaponRank(prev);
    const rank = heroWeaponRank(next);
    if (rank > before && prev.legacy.prestige === next.legacy.prestige) {
      const gained = rank - before;
      out.push({
        key: `rank:${next.hero.weaponId}:${next.legacy.prestige}:${rank}`,
        kind: "rank",
        title: `${getBase(GAME_DATA.items, next.hero.weaponId).name} Rank ${rank}`,
        sub: `+${gained} Mastery point${gained > 1 ? "s" : ""} at Kaelen`,
        art: { kind: "weapon", weaponId: next.hero.weaponId },
      });
    }
  }
  return out;
}
