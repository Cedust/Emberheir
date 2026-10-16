import bleedUrl from "../assets/ailments/bleed.webp";
import burnUrl from "../assets/ailments/burn.webp";
import chillUrl from "../assets/ailments/chill.webp";
import corruptionUrl from "../assets/ailments/corruption.webp";
import poisonUrl from "../assets/ailments/poison.webp";
import shockUrl from "../assets/ailments/shock.webp";
import stunUrl from "../assets/ailments/stun.webp";
import coldUrl from "../assets/elements/cold.webp";
import fireUrl from "../assets/elements/fire.webp";
import lightningUrl from "../assets/elements/lightning.webp";
import physicalUrl from "../assets/elements/physical.webp";
import voidUrl from "../assets/elements/void.webp";

/** Painted damage type and ailment icons (Timo's sheet, tools/art/cut_elements_ailments.py). */
export const GAME_ICONS = {
  physical: physicalUrl,
  fire: fireUrl,
  cold: coldUrl,
  lightning: lightningUrl,
  void: voidUrl,
  burn: burnUrl,
  chill: chillUrl,
  shock: shockUrl,
  corruption: corruptionUrl,
  bleed: bleedUrl,
  poison: poisonUrl,
  stun: stunUrl,
} as const;

export type GameIconId = keyof typeof GAME_ICONS;

export function GameIcon(props: { id: GameIconId; size?: number; className?: string }) {
  const size = props.size ?? 20;
  return (
    <img
      className={`game-icon ${props.className ?? ""}`}
      src={GAME_ICONS[props.id]}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}
