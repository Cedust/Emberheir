import boonUrl from "../assets/choices/boon.webp";
import challengeBossUrl from "../assets/choices/challenge-boss.webp";
import challengeUrl from "../assets/choices/challenge.webp";
import flameUrl from "../assets/choices/flame.webp";
import healUrl from "../assets/choices/heal.webp";
import itemUrl from "../assets/choices/item.webp";
import luckyUrl from "../assets/choices/lucky.webp";
import trainUrl from "../assets/choices/train.webp";
import walkUrl from "../assets/choices/walk.webp";
import wanderUrl from "../assets/choices/wander.webp";

/**
 * Timo's painted icons for the choice cards of the act map and the Warden's Gate, and the flame
 * of "Stage X ahead" and the Battle Plan's wait (design/notes/wahlkarten-icons-art-v1.md,
 * tools/art/cut_choices.py).
 */
export type ChoiceIconId =
  | "item"
  | "heal"
  | "walk"
  | "challenge"
  | "challenge-boss"
  | "wander"
  | "boon"
  | "train"
  | "lucky"
  | "flame";

const ICONS: Readonly<Record<ChoiceIconId, string>> = {
  item: itemUrl,
  heal: healUrl,
  walk: walkUrl,
  challenge: challengeUrl,
  "challenge-boss": challengeBossUrl,
  wander: wanderUrl,
  boon: boonUrl,
  train: trainUrl,
  lucky: luckyUrl,
  flame: flameUrl,
};

export function ChoiceIcon(props: { id: ChoiceIconId; size?: number; className?: string }) {
  const s = props.size ?? 48;
  return (
    <img
      className={`choice-icon${props.className ? ` ${props.className}` : ""}`}
      src={ICONS[props.id]}
      width={s}
      height={s}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
