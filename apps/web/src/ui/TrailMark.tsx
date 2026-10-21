import brand from "../assets/hunts/brand.webp";
import trail0 from "../assets/hunts/trail-0.webp";
import trail1 from "../assets/hunts/trail-1.webp";
import trail2 from "../assets/hunts/trail-2.webp";
import trail3 from "../assets/hunts/trail-3.webp";
import trail4 from "../assets/hunts/trail-4.webp";
import { trailTitle } from "../game/hunts";

/** Timo's painted Trail marks (icon sheet 11, hunts-art-v1.md), by tier (0 = Untracked). */
const MARKS = [trail0, trail1, trail2, trail3, trail4] as const;

/** An enemy's Trail as its painted brass mark. */
export function TrailMark(props: { tier: number; size?: number; className?: string }) {
  const size = props.size ?? 24;
  return (
    <img
      className={`trail-mark trail-${props.tier}${props.className ? ` ${props.className}` : ""}`}
      src={MARKS[Math.max(0, Math.min(4, props.tier))]}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}

/** The Hunt Affix brand: a paw in a brass ring, on the card that carries it. */
export function HuntBrand(props: { size?: number }) {
  const size = props.size ?? 18;
  return (
    <img className="hunt-brand" src={brand} width={size} height={size} alt="" draggable={false} />
  );
}

/** A Hunt Affix line on an item: the brand, its Trail on hover. */
export function HuntAffixMark(props: { trail: number }) {
  return (
    <span className="hunt-affix-mark" title={`Hunt Affix · rolled at ${trailTitle(props.trail)}`}>
      <HuntBrand size={16} />
    </span>
  );
}
