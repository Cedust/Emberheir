import type { ItemSlot } from "@emberheir/sim";
import type { ReactNode } from "react";

/**
 * Painted item icons, drawn in code (hand-painted look without image files, like the Camp):
 * shaded fills from shared gradients, a fine ink outline and a few highlights. One icon per base
 * item, drawn for the base's inventory size (one grid cell = 32 units), so a Sword is tall and a
 * Belt is wide, like in Diablo 2. Bases without their own icon fall back to one of their slot.
 */

const INK = "#1d140e";

/** A painted shape: gradient fill and ink outline. */
function P(props: { d: string; fill: string; w?: number; op?: number }) {
  return (
    <path
      d={props.d}
      fill={props.fill}
      stroke={INK}
      strokeWidth={props.w ?? 1.6}
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity={props.op}
    />
  );
}

/** A line without fill: seams, stitches, highlights. */
function L(props: { d: string; color?: string; w?: number; op?: number; dash?: string }) {
  return (
    <path
      d={props.d}
      fill="none"
      stroke={props.color ?? INK}
      strokeWidth={props.w ?? 1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={props.op}
      strokeDasharray={props.dash}
    />
  );
}

const SHINE = "#fffaf0";
const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

/** Soft glow behind gems and orbs. */
function Glow(props: { cx: number; cy: number; r: number; color?: string }) {
  return (
    <circle
      cx={props.cx}
      cy={props.cy}
      r={props.r}
      fill={`url(#${props.color ?? "ia-glow-ember"})`}
      stroke="none"
    />
  );
}

/** A faceted gem (diamond shape) with a glint. */
function Gem(props: { cx: number; cy: number; r: number; fill: string }) {
  const { cx, cy, r } = props;
  return (
    <>
      <P
        d={`M${cx} ${cy - r}L${cx + r * 0.8} ${cy}L${cx} ${cy + r}L${cx - r * 0.8} ${cy}Z`}
        fill={props.fill}
        w={1.2}
      />
      <L d={`M${cx - r * 0.35} ${cy - r * 0.3}L${cx} ${cy - r * 0.7}`} color={SHINE} w={1} />
    </>
  );
}

interface Art {
  readonly w: number;
  readonly h: number;
  readonly draw: () => ReactNode;
}

const ART: Readonly<Record<string, Art>> = {
  sword: {
    w: 32,
    h: 96,
    draw: () => (
      <>
        <P d="M16 4L21.5 13L21 63H11L10.5 13Z" fill="url(#ia-steel)" />
        <L d="M16 12V58" color="#4b5560" w={1.6} />
        <L d="M12.6 15V60" color={SHINE} w={1} op={0.7} />
        <P
          d="M4 63.5Q4 61 7 61H25Q28 61 28 63.5Q28 66 25 66.5H7Q4 66 4 63.5Z"
          fill="url(#ia-gold)"
        />
        <Gem cx={16} cy={63.7} r={3} fill="url(#ia-ember)" />
        <P d="M13 67H19V85H13Z" fill="url(#ia-leather)" />
        <L d="M13 70L19 72M13 74L19 76M13 78L19 80M13 82L19 84" w={1} op={0.7} />
        <P d={circle(16, 89, 4.6)} fill="url(#ia-gold)" />
        <L d="M14.2 87.2L15.4 86.4" color={SHINE} w={1} />
      </>
    ),
  },
  "fire-wand": {
    w: 32,
    h: 64,
    draw: () => (
      <>
        <Glow cx={16} cy={14} r={15} />
        <P d="M13.8 24H18.2L17.4 60Q16 61.5 14.6 60Z" fill="url(#ia-wood)" />
        <L d="M15 28L15.4 56" color="#e9b984" w={0.8} op={0.6} />
        <P d="M13 28.5H19V31.5H13Z" fill="url(#ia-gold)" w={1.2} />
        <P d="M13.6 50H18.4V52.5H13.6Z" fill="url(#ia-gold)" w={1.2} />
        <P d="M11 18Q10 23 14 25M21 18Q22 23 18 25" fill="none" />
        <P d="M16 3L23 13.5L16 25L9 13.5Z" fill="url(#ia-ember)" />
        <L d="M16 3V25M9 13.5H23" color="#fff3b0" w={0.8} op={0.6} />
        <L d="M12.5 10L15 6" color={SHINE} w={1.2} />
      </>
    ),
  },
  "round-shield": {
    w: 64,
    h: 64,
    draw: () => (
      <>
        <P d={circle(32, 32, 28)} fill="url(#ia-wood)" w={1.8} />
        <L d="M18 9V55M26 5V59M38 5V59M46 9V55" color="#4a2c14" w={1} op={0.7} />
        <circle cx={32} cy={32} r={25.5} fill="none" stroke="url(#ia-iron)" strokeWidth={5} />
        <circle cx={32} cy={32} r={23} fill="none" stroke={INK} strokeWidth={1.2} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = (i * Math.PI) / 4 + Math.PI / 8;
          return (
            <circle
              key={i}
              cx={32 + Math.cos(a) * 25.5}
              cy={32 + Math.sin(a) * 25.5}
              r={1.4}
              fill="#e8edf2"
              stroke={INK}
              strokeWidth={0.8}
            />
          );
        })}
        <P d={circle(32, 32, 8.5)} fill="url(#ia-steel)" />
        <L d="M27.5 28.5Q29 26.5 31.5 26" color={SHINE} w={1.4} />
        <L d="M10 22Q12 14 19 9.5" color={SHINE} w={1.6} op={0.45} />
      </>
    ),
  },
  "ember-focus": {
    w: 64,
    h: 64,
    draw: () => (
      <>
        <Glow cx={32} cy={28} r={26} />
        <P d="M20 58H44L39 46H25Z" fill="url(#ia-iron)" />
        <L d="M24 52H40" color="#e8edf2" w={1} op={0.5} />
        <P d="M25 46Q16 38 19 24Q21 30 26 33Z" fill="url(#ia-gold)" w={1.3} />
        <P d="M39 46Q48 38 45 24Q43 30 38 33Z" fill="url(#ia-gold)" w={1.3} />
        <P d={circle(32, 28, 13.5)} fill="url(#ia-ember)" w={1.8} />
        <L d="M27 34Q30 26 36 22M30 38Q36 31 40 27" color="#fff3b0" w={1} op={0.55} />
        <path
          d="M24 22Q26 17 31 16"
          fill="none"
          stroke={SHINE}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </>
    ),
  },
  "leather-jerkin": {
    w: 64,
    h: 96,
    draw: () => (
      <>
        <P
          d="M14 16L25 10Q32 20 39 10L50 16L55 32Q52 38 50 40V84Q32 89 14 84V40Q12 38 9 32Z"
          fill="url(#ia-leather)"
          w={1.8}
        />
        <P d="M9 32L14 16L22 12Q20 26 17 34Q12 34 9 32Z" fill="url(#ia-darkleather)" w={1.3} />
        <P d="M55 32L50 16L42 12Q44 26 47 34Q52 34 55 32Z" fill="url(#ia-darkleather)" w={1.3} />
        <L d="M32 21V82" w={1.4} />
        <L
          d="M28 26L36 32M36 26L28 32M28 38L36 44M36 38L28 44M28 50L36 56M36 50L28 56"
          color="#e7c48f"
          w={1.1}
        />
        <P d="M14 68Q32 72 50 68V75Q32 79 14 75Z" fill="url(#ia-darkleather)" w={1.3} />
        <L d="M17 44Q16 60 18 80" color="#f0c792" w={1.2} op={0.45} />
        <L d="M44 44V64M20 44V62" dash="2 2" w={0.8} op={0.6} />
      </>
    ),
  },
  "chain-mail": {
    w: 64,
    h: 96,
    draw: () => (
      <>
        <P
          d="M12 15L24 9Q32 16 40 9L52 15L60 35L52 39L50 31V86Q32 90 14 86V31L12 39L4 35Z"
          fill="url(#ia-steel)"
          w={1.8}
        />
        <path
          d="M12 15L24 9Q32 16 40 9L52 15L60 35L52 39L50 31V86Q32 90 14 86V31L12 39L4 35Z"
          fill="url(#ia-chain)"
          opacity={0.75}
        />
        <P d="M24 9Q32 16 40 9L42 13Q32 22 22 13Z" fill="url(#ia-iron)" w={1.3} />
        <P d="M14 70Q32 74 50 70V77Q32 81 14 77Z" fill="url(#ia-darkleather)" w={1.3} />
        <P d="M29 70H35V78H29Z" fill="url(#ia-gold)" w={1} />
        <L d="M18 34Q17 52 18 66" color={SHINE} w={1.6} op={0.5} />
      </>
    ),
  },
  "silk-robe": {
    w: 64,
    h: 96,
    draw: () => (
      <>
        <P
          d="M18 10Q32 18 46 10L56 30L50 34L48 30L55 88Q32 93 9 88L16 30L14 34L8 30Z"
          fill="url(#ia-silk)"
          w={1.8}
        />
        <L d="M32 18L30 90" w={1.3} op={0.8} />
        <P d="M18 10Q32 18 46 10L44 15Q32 24 20 15Z" fill="url(#ia-gold)" w={1.2} />
        <P d="M16 42Q32 46 48 42V48Q32 52 16 48Z" fill="url(#ia-gold)" w={1.2} />
        <P d="M31 48L28 64L33 62L36 48Z" fill="url(#ia-gold)" w={1} />
        <L d="M10.5 84Q32 89 53.5 84" color="#ffd27a" w={1.6} />
        <L d="M19 52Q16 68 14 82" color="#c9b5ff" w={1.4} op={0.5} />
        <L d="M42 54Q45 70 48 84" w={1} op={0.4} />
      </>
    ),
  },
  "leather-cap": {
    w: 64,
    h: 64,
    draw: () => (
      <>
        <P d="M10 42Q10 12 32 12Q54 12 54 42Z" fill="url(#ia-leather)" w={1.8} />
        <L d="M32 12V42M20 16Q17 28 18 42M44 16Q47 28 46 42" w={1} op={0.7} />
        <L d="M24 14Q22 26 23 40" dash="2 2" color="#f0c792" w={0.9} />
        <P d="M7 41Q32 47 57 41V49Q32 55 7 49Z" fill="url(#ia-darkleather)" w={1.5} />
        <L d="M10 46Q32 51 54 46" dash="2 2" color="#e7c48f" w={0.9} />
        <L d="M15 34Q15 22 24 17" color={SHINE} w={1.6} op={0.45} />
      </>
    ),
  },
  "iron-helm": {
    w: 64,
    h: 64,
    draw: () => (
      <>
        <P d="M11 38Q11 8 32 8Q53 8 53 38V56H41V40H23V56H11Z" fill="url(#ia-steel)" w={1.8} />
        <P d="M11 30H53V38H11Z" fill="url(#ia-iron)" w={1.3} />
        <P d="M29.5 26H34.5V50L32 53L29.5 50Z" fill="url(#ia-iron)" w={1.3} />
        <L d="M32 8V26" w={1.4} />
        {[15, 21, 43, 49].map((x) => (
          <circle key={x} cx={x} cy={34} r={1.3} fill="#e8edf2" stroke={INK} strokeWidth={0.8} />
        ))}
        <L d="M16 28Q16 15 26 11" color={SHINE} w={2} op={0.6} />
      </>
    ),
  },
  circlet: {
    w: 64,
    h: 64,
    draw: () => (
      <>
        <ellipse cx={32} cy={34} rx={24} ry={10} fill="none" stroke={INK} strokeWidth={7} />
        <path
          d="M8 34A24 10 0 0 1 56 34"
          fill="none"
          stroke="url(#ia-darkgold)"
          strokeWidth={4.5}
        />
        <path d="M8 34A24 10 0 0 0 56 34" fill="none" stroke="url(#ia-gold)" strokeWidth={4.5} />
        <P d="M26 42L32 33L38 42L32 46Z" fill="url(#ia-gold)" w={1.2} />
        <Glow cx={32} cy={39} r={11} color="ia-glow-sapphire" />
        <Gem cx={32} cy={39} r={5.5} fill="url(#ia-sapphire)" />
        <L d="M12 38Q20 43 26 44" color={SHINE} w={1.2} op={0.7} />
      </>
    ),
  },
  "leather-gloves": {
    w: 64,
    h: 64,
    draw: () => <Glove fill="url(#ia-leather)" cuff="url(#ia-darkleather)" />,
  },
  gauntlets: {
    w: 64,
    h: 64,
    draw: () => (
      <>
        <Glove fill="url(#ia-steel)" cuff="url(#ia-iron)" plates />
      </>
    ),
  },
  "silk-wraps": {
    w: 64,
    h: 64,
    draw: () => (
      <>
        <Glove fill="url(#ia-silk)" cuff="url(#ia-gold)" />
        <L d="M19 30L45 38M19 38L45 46M20 24L44 30" color="#c9b5ff" w={1.2} op={0.7} />
      </>
    ),
  },
  "leather-boots": {
    w: 64,
    h: 64,
    draw: () => (
      <>
        <P
          d="M20 6H40V38L54 44Q59 46 59 52V54H13V48Q18 44 20 38Z"
          fill="url(#ia-leather)"
          w={1.8}
        />
        <P d="M18 5H42V15H18Z" fill="url(#ia-darkleather)" w={1.4} />
        <P d="M13 53H59V59H13Z" fill="url(#ia-darkleather)" w={1.4} />
        <L d="M26 20L34 24M26 26L34 30M34 20L26 24M34 26L26 30" color="#e7c48f" w={1} />
        <L d="M23 17Q22 32 20 40" color="#f0c792" w={1.4} op={0.45} />
      </>
    ),
  },
  greaves: {
    w: 64,
    h: 64,
    draw: () => (
      <>
        <P d="M20 6H40V38L54 44Q59 46 59 52V56H13V48Q18 44 20 38Z" fill="url(#ia-iron)" w={1.8} />
        <P d="M21 7H39V34Q30 38 21 34Z" fill="url(#ia-steel)" w={1.4} />
        <P d={circle(30, 20, 5)} fill="url(#ia-steel)" w={1.2} />
        <L d="M40 44Q46 46 47 54M48 46Q53 48 54 55" w={1.2} />
        <P d="M13 54H59V59H13Z" fill="url(#ia-darkleather)" w={1.3} />
        <L d="M24 11Q23 24 24 32" color={SHINE} w={1.6} op={0.6} />
      </>
    ),
  },
  "silk-slippers": {
    w: 64,
    h: 64,
    draw: () => (
      <>
        <P
          d="M7 46Q10 32 28 33Q44 34 54 40Q62 38 61 32Q66 44 54 50L12 51Q6 50 7 46Z"
          fill="url(#ia-silk)"
          w={1.8}
        />
        <L d="M10 47Q30 46 54 48" color="#ffd27a" w={1.6} />
        <L d="M24 34Q22 40 26 44" w={1} op={0.6} />
        <Gem cx={36} cy={39} r={3.2} fill="url(#ia-ember)" />
        <L d="M12 41Q16 35 24 35" color={SHINE} w={1.4} op={0.5} />
      </>
    ),
  },
  sash: {
    w: 64,
    h: 32,
    draw: () => (
      <>
        <P d="M2 8Q32 3 62 8V21Q32 16 2 21Z" fill="url(#ia-silk)" w={1.6} />
        <L d="M3 14Q32 9 61 14" color="#202660" w={1} op={0.6} />
        <P d="M28 13L21 30L27 31L31 19L35 31L41 30L34 13Z" fill="url(#ia-silk)" w={1.3} />
        <P d={circle(31, 14, 5)} fill="url(#ia-gold)" w={1.3} />
        <L d="M4 10Q32 5 60 10" color="#c9b5ff" w={1.2} op={0.6} />
      </>
    ),
  },
  "heavy-belt": {
    w: 64,
    h: 32,
    draw: () => (
      <>
        <P d="M2 9H62V23H2Z" fill="url(#ia-leather)" w={1.6} />
        <L d="M4 12H60M4 20H60" dash="2 2" color="#e7c48f" w={0.9} />
        <P d="M24 5H40V27H24Z" fill="url(#ia-iron)" w={1.5} />
        <P d="M28 9H36V23H28Z" fill="url(#ia-leather)" w={1.1} />
        <L d="M32 9V17" color="#e8edf2" w={1.6} />
        {[8, 14, 50, 56].map((x) => (
          <circle
            key={x}
            cx={x}
            cy={16}
            r={1.6}
            fill="url(#ia-gold)"
            stroke={INK}
            strokeWidth={0.8}
          />
        ))}
        <L d="M26 7H32" color={SHINE} w={1.2} op={0.7} />
      </>
    ),
  },
  "bone-amulet": {
    w: 32,
    h: 32,
    draw: () => (
      <>
        <L d="M4 1Q7 11 16 11Q25 11 28 1" color="#5a3420" w={1.6} />
        <P
          d="M9.5 12.5Q16 9.5 22.5 12.5Q21 21 17 30Q16 31.5 15 30Q11 21 9.5 12.5Z"
          fill="url(#ia-bone)"
          w={1.4}
        />
        <L d="M12.5 14.5Q13.5 22 15.5 27" color={SHINE} w={1} op={0.8} />
        <L d="M18.5 15Q18 20 17 24" color="#8a7652" w={0.9} />
        <P d={circle(16, 11.5, 2.4)} fill="url(#ia-gold)" w={0.9} />
      </>
    ),
  },
  "ember-pendant": {
    w: 32,
    h: 32,
    draw: () => (
      <>
        <L d="M4 2Q7 12 16 12Q25 12 28 2" color="#8a5a12" w={1.4} />
        <Glow cx={16} cy={20} r={11} />
        <P d={circle(16, 20, 7.5)} fill="url(#ia-gold)" w={1.3} />
        <P d={circle(16, 20, 4.8)} fill="url(#ia-ember)" w={1} />
        <L d="M13.8 17.8L15.4 16.8" color={SHINE} w={1} />
      </>
    ),
  },
  "iron-ring": {
    w: 32,
    h: 32,
    draw: () => (
      <>
        <ellipse cx={16} cy={19} rx={10} ry={9} fill="none" stroke={INK} strokeWidth={6.5} />
        <ellipse
          cx={16}
          cy={19}
          rx={10}
          ry={9}
          fill="none"
          stroke="url(#ia-iron)"
          strokeWidth={4}
        />
        <P d="M11 10L13 6H19L21 10L16 12Z" fill="url(#ia-steel)" w={1.1} />
        <L d="M8.5 15Q10 11.5 13 10.5" color={SHINE} w={1} op={0.7} />
      </>
    ),
  },
  "garnet-ring": {
    w: 32,
    h: 32,
    draw: () => (
      <>
        <ellipse cx={16} cy={20} rx={9.5} ry={8.5} fill="none" stroke={INK} strokeWidth={6} />
        <ellipse
          cx={16}
          cy={20}
          rx={9.5}
          ry={8.5}
          fill="none"
          stroke="url(#ia-gold)"
          strokeWidth={3.6}
        />
        <Glow cx={16} cy={9} r={8} color="ia-glow-garnet" />
        <Gem cx={16} cy={9.5} r={5.5} fill="url(#ia-garnet)" />
      </>
    ),
  },
};

/** A glove pointing up: four fingers, thumb, palm and cuff. */
function Glove(props: { fill: string; cuff: string; plates?: boolean }) {
  const fingers = [
    { x: 19, top: 12 },
    { x: 25, top: 8 },
    { x: 31, top: 7 },
    { x: 37, top: 10 },
  ];
  return (
    <>
      {fingers.map((f) => (
        <P
          key={f.x}
          d={`M${f.x} 28V${f.top + 3}Q${f.x} ${f.top} ${f.x + 3} ${f.top}Q${f.x + 6} ${f.top} ${f.x + 6} ${f.top + 3}V28Z`}
          fill={props.fill}
          w={1.4}
        />
      ))}
      <P d="M43 34L50 25Q54 22 56 26Q57 29 54 32L46 44Z" fill={props.fill} w={1.4} />
      <P d="M18 26H44V46Q31 50 19 46Z" fill={props.fill} w={1.6} />
      {props.plates && <L d="M19 33H44M19 40H44M25 9V26M31 8V26M37 11V26" w={1} op={0.7} />}
      <P d="M15 45Q31 50 48 45L50 58Q31 62 13 58Z" fill={props.cuff} w={1.5} />
      <L d="M22 30Q21 38 22 44" color={SHINE} w={1.4} op={0.45} />
    </>
  );
}

/** Which base draws a slot's icon when a base has none of its own. */
const SLOT_FALLBACK: Readonly<Record<ItemSlot, string>> = {
  mainHand: "sword",
  offHand: "round-shield",
  helm: "iron-helm",
  body: "chain-mail",
  gloves: "leather-gloves",
  boots: "leather-boots",
  belt: "heavy-belt",
  amulet: "bone-amulet",
  ring: "iron-ring",
};

export function hasItemArt(baseId: string): boolean {
  return baseId in ART;
}

/** The painted icon of a base item, scaled to fit its box. */
export function ItemArt(props: { baseId: string; slot: ItemSlot; className?: string }) {
  const art = ART[props.baseId] ?? ART[SLOT_FALLBACK[props.slot]];
  if (!art) return null;
  return (
    <svg
      className={`item-art ${props.className ?? ""}`}
      viewBox={`0 0 ${art.w} ${art.h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {art.draw()}
    </svg>
  );
}

const linear = (id: string, stops: readonly [string, string, string]) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stopColor={stops[0]} />
    <stop offset="0.5" stopColor={stops[1]} />
    <stop offset="1" stopColor={stops[2]} />
  </linearGradient>
);

const radial = (id: string, stops: readonly [string, string, string]) => (
  <radialGradient id={id} cx="0.38" cy="0.32" r="0.75">
    <stop offset="0" stopColor={stops[0]} />
    <stop offset="0.45" stopColor={stops[1]} />
    <stop offset="1" stopColor={stops[2]} />
  </radialGradient>
);

const glow = (id: string, color: string) => (
  <radialGradient id={id}>
    <stop offset="0" stopColor={color} stopOpacity="0.75" />
    <stop offset="0.5" stopColor={color} stopOpacity="0.25" />
    <stop offset="1" stopColor={color} stopOpacity="0" />
  </radialGradient>
);

/** Materials every item icon refers to; rendered once per screen. */
export function ItemArtDefs() {
  return (
    <svg className="paint-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        {linear("ia-steel", ["#f2f5f8", "#a7b1bc", "#4e5863"])}
        {linear("ia-iron", ["#c4bdb2", "#77716a", "#3a3632"])}
        {linear("ia-gold", ["#fff2b0", "#e2aa36", "#8a5a12"])}
        {linear("ia-darkgold", ["#b98a2c", "#7a5414", "#3e2a08"])}
        {linear("ia-leather", ["#d39457", "#91562b", "#4e2b14"])}
        {linear("ia-darkleather", ["#94613f", "#5c3622", "#2e1a0e"])}
        {linear("ia-wood", ["#c08850", "#7f512a", "#4a2c14"])}
        {linear("ia-silk", ["#8a9cf0", "#4a55b0", "#202660"])}
        {linear("ia-bone", ["#fbf3dc", "#d2c09a", "#8a7652"])}
        {radial("ia-ember", ["#fff6c0", "#ff9a3a", "#a82a0c"])}
        {radial("ia-sapphire", ["#d8ecff", "#4f8cff", "#14307a"])}
        {radial("ia-garnet", ["#ffc0c4", "#d02a46", "#5a0a1a"])}
        {glow("ia-glow-ember", "#ff9a3a")}
        {glow("ia-glow-sapphire", "#5b8cff")}
        {glow("ia-glow-garnet", "#ff4a64")}
        <pattern id="ia-chain" width="4" height="3.4" patternUnits="userSpaceOnUse">
          <path d="M0 1.7a2 1.7 0 0 1 4 0" fill="none" stroke="#2a3038" strokeWidth="0.7" />
        </pattern>
      </defs>
    </svg>
  );
}
