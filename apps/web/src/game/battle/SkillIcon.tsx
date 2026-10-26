import { Icon, type IconName } from "../../ui/Icon";
import { weaponIconUrl } from "../../ui/gameIcons";
import { skillArt, skillIcon } from "./skills";

/** A skill's painted icon; skills without a painting (enemy skills) keep the stroke icon. */
export function SkillIcon(props: { skillId: string; size: number }) {
  const url = skillArt(props.skillId);
  if (!url) return <Icon name={skillIcon(props.skillId)} size={props.size} color="#fff6e4" />;
  // The paintings carry their own glow: drawn larger than the stroke icon they replace, to fill the slot.
  const size = Math.round(props.size * 1.5);
  return (
    <img
      className="skill-art"
      src={url}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

const ATTACK_ART = import.meta.glob<string>("../../assets/attacks/*.webp", {
  eager: true,
  import: "default",
});

/**
 * The Default Attack of a weapon: its painting from Timo's Default Attack sheet, else the painted
 * weapon, the stroke icon only for an unknown weapon.
 */
export function AttackIcon(props: { weaponId: string; fallback: IconName; size: number }) {
  const url =
    ATTACK_ART[`../../assets/attacks/${props.weaponId}.webp`] ?? weaponIconUrl(props.weaponId);
  if (!url) return <Icon name={props.fallback} size={props.size} color="#fff6e4" />;
  const size = Math.round(props.size * 1.5);
  return (
    <img
      className="skill-art"
      src={url}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
