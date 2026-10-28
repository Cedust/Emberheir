import attributeUrl from "../../assets/harvest/attribute-points.webp";
import heirloomUrl from "../../assets/points/heirloom.webp";
import skillUrl from "../../assets/points/skill.webp";
import { useNoteHover } from "../ItemTooltip";

/** Points the hero spends, shown like a currency: icon and amount, the name on hover (Timo). */
export type PointId = "skill" | "heirloom" | "attribute";

interface PointDef {
  readonly name: string;
  readonly explain: string;
}

export const POINTS: Readonly<Record<PointId, PointDef>> = {
  skill: {
    name: "Skill Points",
    explain: "Learn nodes in the Ash Tree. You earn them at Waymarks on the road.",
  },
  heirloom: {
    name: "Heirloom Points",
    explain: "Spend them in your weapon's Mastery tree. Weapon Ranks give more.",
  },
  attribute: {
    name: "Attribute Points",
    explain: "Raise your Attributes in the Character Sheet. Every level gives more.",
  },
};

/** Painted icons: Attribute Points are the Harvest's ember stones (tools/art/cut_points.py). */
const ICONS: Readonly<Record<PointId, string>> = {
  skill: skillUrl,
  heirloom: heirloomUrl,
  attribute: attributeUrl,
};

export function PointIcon(props: { id: PointId; size?: number }) {
  const s = props.size ?? 26;
  return (
    <img
      className={`k-coin k-point k-point-${props.id}`}
      src={ICONS[props.id]}
      width={s}
      height={s}
      alt=""
      draggable={false}
    />
  );
}

const label = (id: PointId, n: number) =>
  `${n} ${n === 1 ? POINTS[id].name.replace(/s$/, "") : POINTS[id].name}`;

/** Unspent points: icon and amount, the name and what they buy on hover. */
export function PointChip(props: {
  id: PointId;
  value: number;
  testId?: string;
  /** Glows while points wait to be spent. */
  glow?: boolean;
}) {
  const def = POINTS[props.id];
  const hover = useNoteHover({
    name: def.name,
    kind: "Points",
    explain: def.explain,
    status: `${props.value} left to spend`,
  });
  return (
    <span
      className={`k-currency k-points${props.glow && props.value > 0 ? " has" : ""}`}
      data-testid={props.testId}
      tabIndex={0}
      aria-label={label(props.id, props.value)}
      {...hover}
    >
      <PointIcon id={props.id} />
      <b className="mono">{props.value}</b>
    </span>
  );
}

/** A point cost inside a button or line ("Learn · [seed] 3"); the name shows on hover. */
export function PointPrice(props: { id: PointId; amount: number }) {
  const text = label(props.id, props.amount);
  return (
    <span className="k-price" aria-label={text} title={text}>
      <PointIcon id={props.id} size={20} />
      <b className="mono">{props.amount}</b>
    </span>
  );
}
