import { GAME_DATA } from "@emberheir/content";
import { enemyPainting } from "../game/battle/enemyPaintings";
import { enemyAct } from "../game/hunts";
import { Icon, type IconName } from "./Icon";

/** Archetype sigils for enemies without a painting yet. */
const ARCHETYPE_ICON: Record<string, IconName> = {
  brute: "brute",
  skirmisher: "skirmisher",
  caster: "caster",
  afflicter: "afflicter",
  warden: "warden",
  thornback: "shell",
  harvester: "harvest",
};

/** Every act's ink for the sigils (the act palettes of the arena, enemyArt.ts). */
const ACT_INK = [
  "#e0314b",
  "#ff8a3c",
  "#9fe04a",
  "#ff6a2b",
  "#9fe0ff",
  "#ffe14d",
  "#a35cff",
  "#ff8a1f",
];

const allEnemies = () => [
  ...GAME_DATA.acts.flatMap((a) => [...a.enemies, a.boss]),
  ...(GAME_DATA.thief ? [GAME_DATA.thief] : []),
];

/**
 * An enemy's face in a round frame: Timo's painting where there is one, else its archetype
 * sigil in its act's ink. `hidden` shows a shadow (an enemy not tracked yet).
 */
export function EnemyPortrait(props: { enemyId: string; size?: number; hidden?: boolean }) {
  const size = props.size ?? 44;
  const enemy = allEnemies().find((e) => e.id === props.enemyId);
  const painting = enemyPainting(props.enemyId);
  const act = enemyAct(props.enemyId);
  const ink = ACT_INK[act] ?? "#f3e6c8";
  return (
    <span
      className={`enemy-portrait${props.hidden ? " hidden" : ""}${painting ? " painted" : ""}`}
      style={{ width: size, height: size, "--ink": ink } as React.CSSProperties}
      aria-hidden="true"
    >
      {painting ? (
        <img src={painting} alt="" draggable={false} />
      ) : (
        <Icon name={ARCHETYPE_ICON[enemy?.archetype ?? ""] ?? "brute"} size={size * 0.56} />
      )}
    </span>
  );
}
