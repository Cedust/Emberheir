import { Icon } from "../../ui/Icon";
import { skillArt, skillIcon } from "./skills";

/** A skill's painted icon; skills without a painting (enemy skills) keep the stroke icon. */
export function SkillIcon(props: { skillId: string; size: number }) {
  const url = skillArt(props.skillId);
  if (!url) return <Icon name={skillIcon(props.skillId)} size={props.size} color="#fff6e4" />;
  // The paintings carry their own glow: drawn larger than the stroke icon they replace, to fill the slot.
  const size = Math.round(props.size * 1.7);
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
