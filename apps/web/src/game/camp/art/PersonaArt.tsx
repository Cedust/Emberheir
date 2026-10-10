import type { CSSProperties } from "react";
import { Eye, F, INK, L, S, circ } from "./paint";

/**
 * The camp personas as animals of a fable forest (Humblewood style, design/fabelwelt-v1.md):
 * Old Nan the owl, Thoric the boar, Marisha the raccoon, Liora the moon hare, Kaelen the wolf,
 * Nyssa the squirrel, Eldrin the raven and the Heir, an otter. Every figure stands in a
 * 100 × 175 box with its feet at y ≈ 166 and faces right; the camp mirrors the ones standing
 * right of the Hearthfire, so everybody looks at the fire and the fire light always falls on the
 * near side. Little idle motions (blinks, a swaying tail, a twitching ear, glowing trinkets) are
 * CSS animations that switch off with reduced motion.
 */
export const FIGURE_W = 100;
export const FIGURE_H = 175;

/** The part of each figure the persona card shows as a portrait (viewBox). */
export const PORTRAIT: Record<string, string> = {
  heir: "33 18 48 48",
  nan: "27 14 56 56",
  thoric: "30 12 60 60",
  marisha: "33 14 50 50",
  liora: "34 12 50 50",
  kaelen: "35 10 54 54",
  nyssa: "34 16 48 48",
  eldrin: "36 16 54 54",
};

export interface HeirGear {
  readonly weapon: "sword" | "wand";
  readonly offHand?: "shield" | "focus";
}

const shadow = (rx: number) => (
  <ellipse cx="50" cy="167" rx={rx} ry="5" fill="#000" opacity="0.32" />
);

/** A part that moves on its own (tail, ear, glow), turning around `origin` in figure units. */
function Move(props: {
  kind: "sway" | "twitch" | "pulse" | "bob";
  origin?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  const style: CSSProperties = {
    ...(props.origin ? { transformOrigin: props.origin } : {}),
    ...(props.delay ? { animationDelay: `${-props.delay}s` } : {}),
  };
  return (
    <g className={props.kind} style={style}>
      {props.children}
    </g>
  );
}

/** A few whiskers fanning out from a muzzle at (x, y). */
function Whiskers(props: { x: number; y: number; color?: string; len?: number }) {
  const { x, y } = props;
  const n = props.len ?? 10;
  return (
    <L
      d={`M${x} ${y} q${n * 0.5} -2 ${n} -3.5 M${x} ${y + 2} q${n * 0.5} 0 ${n} 0.5 M${x - 1} ${y + 4} q${n * 0.45} 1.5 ${n * 0.85} 3.5`}
      color={props.color ?? "#f6ecd8"}
      w={0.6}
      op={0.85}
    />
  );
}

/** A small blush on a cheek. */
const blush = (x: number, y: number, rx = 3, color = "#e0705a") => (
  <ellipse cx={x} cy={y} rx={rx} ry={rx * 0.55} fill={color} opacity="0.4" />
);

// --- The Heir: an otter -------------------------------------------------------------------------

function Heir(props: { gear: HeirGear }) {
  const fur = "#7a4c2a";
  const furDark = "#5a361c";
  const cream = "#ecd2a8";
  const cloak = "#a8401a";
  const tunic = "#c9a06a";
  const trim = "#e8c07a";
  const { weapon, offHand } = props.gear;
  return (
    <g>
      {shadow(30)}
      {/* The thick otter tail, resting on the ground behind. */}
      <Move kind="sway" origin="44px 132px" delay={1.2}>
        <F
          d="M46 122 C34 130 20 144 5 152 C3 155 8 158 16 157 C28 155 38 148 44 140 C48 134 50 128 49 124 Z"
          fill={fur}
          tex="fur"
        />
        <L d="M12 154 C22 152 32 147 40 140" color="#9a6a42" w={1} op={0.7} />
      </Move>
      <S d="M40 68 C30 90 26 126 26 158 C34 162 44 161 50 158 L54 74 Z" fill={cloak} />
      {/* Short legs and webbed hind paws. */}
      <F d="M42 124 L41 150 L51 150 L52 124 Z" fill={furDark} />
      <F d="M36 148 C35 158 37 165 44 165 L55 165 C56 159 53 152 51 148 Z" fill={furDark} />
      <L d="M44 165 l1 -4 M49 165 l0.5 -4" color="#2a1a10" w={0.8} />
      <F d="M54 124 L57 150 L66 150 L63 124 Z" fill={furDark} />
      <F d="M55 148 C55 158 57 165 63 165 L74 165 C75 160 71 153 66 148 Z" fill={furDark} />
      <L d="M64 165 l1 -4 M69 165 l0.5 -4" color="#2a1a10" w={0.8} />
      {offHand === "shield" && (
        <>
          <S d={circ(32, 104, 15)} fill="#8a5a32" w={2.5} />
          <circle cx="32" cy="104" r="12" fill="none" stroke="#9a9aa2" strokeWidth="3" />
          <L d="M22 98 C28 94 36 94 42 98" color="#c9c2b8" w={1} op={0.6} />
          <S d={circ(32, 104, 4)} fill="#c9c2b8" />
        </>
      )}
      <S d="M40 70 C33 82 32 96 34 108 L40 108 C40 96 42 86 46 76 Z" fill={tunic} />
      <F d={circ(37, 110, 4.4)} fill={fur} />
      {offHand === "focus" && (
        <>
          <Move kind="pulse">
            <circle cx="36" cy="113" r="12" fill="url(#ember-glow)" />
          </Move>
          <S d={circ(36, 113, 4.5)} fill="#ffb13b" />
        </>
      )}
      <S
        d="M38 66 C35 86 35 106 38 126 L64 126 C67 106 67 86 62 66 C56 62 44 62 38 66 Z"
        fill={tunic}
      />
      <L d="M38 119 L64 119" color={trim} w={2.5} />
      <L
        d="M44 70 C42 86 42 104 44 118 M57 72 C59 84 60 100 59 116"
        color="#8a6a3e"
        w={0.8}
        op={0.6}
      />
      <S d="M37 102 L65 102 L65 109 L37 109 Z" fill="#5e3a20" />
      <S d="M48 101 h7 v9 h-7 Z" fill={trim} w={1.4} />
      {/* The cream bib of an otter under the collar. */}
      <S d="M44 64 L51 80 L58 64 Z" fill={cream} />
      <S d="M36 70 C40 60 60 58 66 68 C60 66 50 66 44 70 C42 74 40 80 38 84 Z" fill={cloak} />
      {/* Head: broad and flat, small round ears, a big whiskered muzzle. */}
      <F d={circ(60, 29, 3.8)} fill={furDark} />
      <F d="M46 54 L46 65 L57 65 L57 54 Z" fill={fur} />
      <F
        d="M36 44 C35 32 43 25 54 25 C63 25 69 30 70 37 C74 39 77 43 77 47 C77 53 71 57 63 58 C51 60 38 57 36 44 Z"
        fill={fur}
        tex="fur"
      />
      <F d={circ(40, 33, 4.6)} fill={fur} />
      <circle cx="40" cy="33" r="2" fill="#2a1a10" />
      <F
        d="M50 49 C53 43 61 41 69 42 C74 43 78 46 77 50 C76 55 70 58 62 58 C55 58 50 55 50 49 Z"
        fill={cream}
        w={1.6}
      />
      <path d="M41 50 C44 55 50 57 56 57 C52 54 50 51 50 48 Z" fill={cream} opacity="0.7" />
      <Eye x={52.5} y={40} r={2.9} lid={fur} blink={0.4} />
      <Eye x={63} y={39.5} r={3.4} lid={fur} blink={0.4} />
      <L d="M60 35.4 q3 -1.4 6 -0.2" w={1.2} />
      <path
        d="M71.5 44 C73 41.5 77.5 41.5 78.5 44 C78.8 47 75.5 48.6 73.6 48 C71.8 47.4 71 45.6 71.5 44 Z"
        fill={INK}
      />
      <ellipse cx="76" cy="43.6" rx="1.2" ry="0.7" fill="#fff" opacity="0.6" />
      <L d="M75 48.4 L75 51 M71 52.6 q2 1.8 4 -1.6 q2 3.4 4 1.6" w={1.1} />
      <circle cx="70" cy="50" r="0.6" fill="#5a361c" />
      <circle cx="72" cy="51.6" r="0.6" fill="#5a361c" />
      <Whiskers x={72} y={50} len={11} />
      {blush(66, 50)}
      {/* The bandana every Heir ties on. */}
      <S d="M37 34 C45 28 57 27 65 30 L65.5 34 C57 31.5 46 32 38.5 38.5 Z" fill={trim} w={1.6} />
      <Move kind="sway" origin="38px 38px" delay={2.4}>
        <S d="M38 36 L28 40 L30 45.5 L39 40 Z" fill={trim} w={1.4} />
      </Move>
      <S d="M57 68 C65 74 69 86 69 100 L63 102 C63 92 60 84 54 76 Z" fill={tunic} />
      {weapon === "sword" ? (
        <>
          <S d="M66 98 L87 55 L91 57 L70 100 Z" fill="#e2ddd4" />
          <L d="M68 97 L88 57" color="#8a8a92" w={1} />
          <S d="M59 95 L74 103 L72 107 L57 99 Z" fill="#c9a063" w={1.6} />
          <S d="M63 104 L60 113 L64 114 L67 105 Z" fill="#5e3a20" w={1.4} />
          <S d={circ(61, 115, 2.6)} fill="#e8c07a" w={1.2} />
        </>
      ) : (
        <>
          <S d="M63 108 L80 73 L83 74 L67 109 Z" fill="#7a4a28" w={1.6} />
          <Move kind="pulse">
            <circle cx="82" cy="71" r="12" fill="url(#ember-glow)" />
          </Move>
          <S d={circ(82, 71, 3.6)} fill="#ffb13b" w={1.4} />
        </>
      )}
      <F d={circ(66, 104, 4.8)} fill={fur} />
    </g>
  );
}

// --- Old Nan: an old owl, the Hearthkeeper ------------------------------------------------------

function Nan() {
  const plume = "#8a6a48";
  const plumeDark = "#5e4630";
  const disc = "#ecdcbc";
  const belly = "#d9c49c";
  const shawl = "#7a3a4e";
  return (
    <g>
      {shadow(28)}
      <S d="M30 138 L18 160 L32 159 L40 146 Z" fill={plumeDark} />
      <L d="M24 156 L33 144 M29 158 L37 146" color="#3b2a1e" w={0.8} />
      {/* A round, soft body with a pale, streaked belly. */}
      <F
        d="M52 52 C34 52 25 80 25 112 C25 142 34 162 52 162 C70 162 79 142 79 112 C79 80 70 52 52 52 Z"
        fill={plume}
        tex="feather"
      />
      <F
        d="M53 96 C43 96 38 114 38 132 C38 150 45 159 55 159 C65 159 71 148 71 130 C71 110 63 96 53 96 Z"
        fill={belly}
        w={1.6}
      />
      <L
        d="M46 114 l2 3 l2 -3 M57 108 l2 3 l2 -3 M50 126 l2 3 l2 -3 M61 122 l2 3 l2 -3 M45 140 l2 3 l2 -3 M56 142 l2 3 l2 -3 M62 134 l2 3 l2 -3"
        color="#8a6a42"
        w={1}
      />
      {/* Folded wing on the far side. */}
      <F d="M28 94 C21 112 23 138 32 154 C37 142 39 120 37 100 Z" fill={plumeDark} tex="feather" />
      <L d="M27 110 C29 120 30 132 32 144 M31 104 C33 116 34 128 34 138" color="#3b2a1e" w={0.8} />
      {/* Talons peeking out. */}
      <S d="M40 158 C38 166 52 167 51 159 Z" fill="#c9a86a" w={1.6} />
      <S d="M56 158 C55 166 69 167 67 159 Z" fill="#c9a86a" w={1.6} />
      <L d="M44 161 l-0.5 5 M48 161 l0 5 M60 161 l-0.5 5 M64 161 l0 5" w={0.9} />
      {/* A knitted shawl over the shoulders. */}
      <F
        d="M24 94 C28 74 41 66 54 66 C67 66 77 74 81 92 C74 100 64 106 56 116 C46 106 34 100 24 94 Z"
        fill={shawl}
      />
      <L
        d="M30 88 C40 82 48 80 54 80 C62 80 70 82 76 88 M36 96 C44 92 50 92 55 100 C60 92 66 90 72 94"
        color="#c9a063"
        w={1.2}
        op={0.7}
      />
      <L
        d="M28 96 l-1 6 M33 99 l-1 6 M38 102 l-1 6 M43 105 l-1 6 M48 109 l-1 6 M53 114 l0 6 M59 112 l1 6 M64 107 l1 6 M69 103 l1 6 M74 99 l1 6"
        color="#7a3a4e"
        w={1.6}
      />
      {/* The crooked staff with the ember lantern: a spark of the Hearthfire she carries. */}
      <path
        d="M84 166 C82 140 84 120 82 100 C81 90 83 82 81 72 C80 66 84 62 89 64"
        fill="none"
        stroke={INK}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <path
        d="M84 166 C82 140 84 120 82 100 C81 90 83 82 81 72 C80 66 84 62 89 64"
        fill="none"
        stroke="#8a5a32"
        strokeWidth={3.4}
        strokeLinecap="round"
      />
      <L d="M89 64 L90 71" w={1.2} />
      <Move kind="pulse">
        <circle cx="90" cy="80" r="15" fill="url(#ember-glow)" />
      </Move>
      <S d="M85.5 73 L94.5 73 L93 71 L87 71 Z" fill="#3b3430" w={1.3} />
      <S d="M86 74 h8 v11 h-8 Z" fill="#ffcf7a" w={1.4} flat />
      <Move kind="bob" origin="90px 84px">
        <path d="M90 76 C92.5 79 92.5 82 90 84 C87.5 82 87.5 79 90 76 Z" fill="#ff8a1f" />
        <path d="M90 79 C91 80.5 91 82 90 83 C89 82 89 80.5 90 79 Z" fill="#fff2c0" />
      </Move>
      <L d="M88.5 74 L88.5 85 M91.5 74 L91.5 85" color="#3b3430" w={0.9} />
      <S d="M85 85 h10 v2.4 h-10 Z" fill="#3b3430" w={1.2} />
      <F d="M70 86 C80 90 85 100 84 112 L77 114 C77 104 73 98 66 94 Z" fill={plume} tex="feather" />
      <L d="M78 110 l3 4 M80 108 l3.5 3.5" w={1} />
      {/* The head: no neck, a heart-shaped face, soft tufts and spectacles on the beak. */}
      <Move kind="twitch" origin="40px 28px" delay={3}>
        <F d="M37 34 C32 25 35 17 41 13 C41 19 43 25 46 29 Z" fill={plume} />
      </Move>
      <F d="M61 27 C64 19 70 15 76 15 C73 20 72 26 70 31 Z" fill={plume} />
      <F d={circ(55, 47, 24)} fill={plume} tex="feather" />
      <F
        d="M38 49 C38 37 48 32 57 37 C64 32 77 35 77 47 C77 60 67 68 58 68 C47 68 38 61 38 49 Z"
        fill={disc}
        w={1.8}
      />
      <L d="M57 37 C57 44 58 52 58 60" color="#b89a72" w={1} op={0.8} />
      <L d="M41 44 C43 40 47 38 51 39 M64 38 C69 37 73 40 75 44" color="#b89a72" w={1} op={0.8} />
      <Eye
        x={49.5}
        y={49}
        r={6}
        iris="#e89a2a"
        lid={disc}
        half={0.27}
        blink={2.2}
        look={[0.1, 0.22]}
      />
      <Eye
        x={66}
        y={48}
        r={6.6}
        iris="#e89a2a"
        lid={disc}
        half={0.27}
        blink={2.2}
        look={[0.1, 0.22]}
      />
      <circle cx="49.5" cy="49" r="8" fill="none" stroke="#c9a063" strokeWidth="1.3" />
      <circle cx="66" cy="48" r="8.6" fill="none" stroke="#c9a063" strokeWidth="1.3" />
      <L d="M57.5 48 q0.5 -2 0 -0.4" color="#c9a063" w={1.3} />
      <circle cx="68" cy="45" r="2.4" fill="#fff" opacity="0.18" />
      {blush(45, 58, 3.4)}
      {blush(71, 57, 3.4)}
      <S
        d="M56 55 C60 55 63 58 61 63 C60 65.5 58.6 66 57.6 64 C56.4 61.6 55.8 58 56 55 Z"
        fill="#d8a85a"
        w={1.4}
      />
      <L d="M57.2 58 q1.6 0.5 2.6 2" color="#8a6a32" w={0.7} />
    </g>
  );
}

// --- Thoric: a boar, the Blacksmith -------------------------------------------------------------

function Thoric() {
  const hide = "#5e3c2a";
  const hideDark = "#3e2618";
  const bristle = "#8e3c1c";
  const snout = "#c08a78";
  const shirt = "#4a4a4e";
  return (
    <g>
      {shadow(33)}
      <Move kind="sway" origin="28px 120px" delay={0.7}>
        <path
          d="M30 118 c-6 -3 -10 2 -7 6 c3 4 7 -1 4 -4 c-2 -2 -5 0 -6 2"
          fill="none"
          stroke={INK}
          strokeWidth={3.6}
          strokeLinecap="round"
        />
        <path
          d="M30 118 c-6 -3 -10 2 -7 6 c3 4 7 -1 4 -4 c-2 -2 -5 0 -6 2"
          fill="none"
          stroke={hide}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Move>
      {/* Stout legs ending in cloven hooves. */}
      <S d="M37 126 L35 154 L47 154 L48 126 Z" fill="#3b3430" />
      <S d="M33 152 L32 165 C32 167 48 167 48 165 L47 152 Z" fill="#241c18" />
      <L d="M40 157 L40 166" color="#5a4a40" w={1} />
      <S d="M54 126 L58 154 L70 154 L65 126 Z" fill="#3b3430" />
      <S d="M56 152 L56 165 C56 167 75 167 74 163 C73 159 71 156 70 152 Z" fill="#241c18" />
      <L d="M64 157 L65 166" color="#5a4a40" w={1} />
      {/* Far arm: rolled sleeve, a bristly forearm. */}
      <S d="M30 72 C21 84 21 98 26 108 L34 105 C32 96 32 86 36 78 Z" fill={shirt} />
      <F d="M26 104 L37 114 L42 108 L33 100 Z" fill={hide} tex="fur-light" />
      <F d={circ(41, 112, 5.2)} fill={hideDark} />
      {/* A barrel of a body under a scorched apron. */}
      <S
        d="M29 70 C22 90 25 114 31 130 L69 130 C75 114 78 90 71 70 C62 61 38 61 29 70 Z"
        fill={shirt}
      />
      <F d="M36 84 L64 84 L69 144 L31 144 Z" fill="#8a5a32" />
      <L d="M36 84 L32 69 M64 84 L68 69" color="#5e3a20" w={3} />
      <S d="M42 106 h16 v12 h-16 Z" fill="#7a4a28" w={1.5} />
      <L d="M45 104 L44 95 M48 104 L50 94" color="#3b3430" w={2} />
      <ellipse cx="57" cy="96" rx="5" ry="3" fill="#2a1f17" opacity="0.3" />
      <ellipse cx="40" cy="132" rx="4" ry="2.5" fill="#2a1f17" opacity="0.3" />
      <ellipse cx="62" cy="126" rx="2.5" ry="1.6" fill="#2a1f17" opacity="0.3" />
      {/* Head: a long snout with a flat disc, tusks, a grumpy brow and a bristle mane. */}
      <F d="M50 30 C48 21 51 14 56 12 C58 18 59 24 58 30 Z" fill={hide} />
      <path d="M53 26 C53 21 54.5 17 56 15 C56.8 19 57 23 56.4 27 Z" fill="#c08a78" opacity="0.8" />
      <F
        d="M33 50 C31 34 41 24 54 24 C62 24 68 28 72 35 C78 39 84 45 87 51 C88 57 85 62 80 62 C74 64 66 66 58 68 C45 70 35 63 33 50 Z"
        fill={hide}
        tex="fur-light"
      />
      <path
        d="M52 25 L47 16 L45 25 L38 19 L38 28 L31 25 L33 34 L25 33 L30 41 L23 43 L30 48 L24 53 L32 55 L35 47 C36 36 42 29 52 25 Z"
        fill={bristle}
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M52 25 L47 16 L45 25 L38 19 L38 28 L31 25 L33 34 Z" fill="url(#vol)" />
      <F d="M45 32 C42 23 45 17 50 14 C52 20 53 26 51 32 Z" fill={hide} />
      <path
        d="M47 29 C46 24 47 20 49.5 17 C50.5 21 50.8 25 49.6 29 Z"
        fill="#c08a78"
        opacity="0.8"
      />
      <F
        d="M66 42 C72 42 80 45 86 50 C86 55 82 58 76 58 C70 58 66 52 66 42 Z"
        fill="#7a5040"
        w={1.2}
      />
      <S
        d="M83 46 C86 45 89 49 89 54 C89 59 86 62 83 61 C81 58 81 50 83 46 Z"
        fill={snout}
        w={1.8}
      />
      <ellipse cx="85.6" cy="51" rx="0.9" ry="1.6" fill={INK} />
      <ellipse cx="85.8" cy="56.6" rx="0.9" ry="1.6" fill={INK} />
      <L d="M66 63 q7 2.5 13 -1.5" w={1.4} />
      <S d="M75 62 C77 56 80 52 83 50 C82 56 80 61 78 64 Z" fill="#f0e6cc" w={1.4} />
      <S d="M69 64 C70 60 72 58 74 56 C74 60 73 63 71.5 65 Z" fill="#e0d4b4" w={1.2} />
      <Eye x={56} y={41} r={1.9} lid={hide} blink={1.5} />
      <Eye x={65} y={40} r={2.2} lid={hide} blink={1.5} />
      <L d="M52 36 l6 1.4 M61 35 l8 2.4" w={2.4} />
      <L d="M60 52 C62 56 66 58 70 58" color="#3e2618" w={0.9} op={0.7} />
      {blush(60, 55, 3, "#d06050")}
      <L d="M44 44 l4 6" color="#c08a78" w={1} op={0.7} />
      {/* Near arm, propped on the hammer. */}
      <S d="M64 70 C72 76 76 88 76 98 L68 100 C68 90 66 82 60 76 Z" fill={shirt} />
      <F d="M68 98 L76 96 L78 112 L70 114 Z" fill={hide} tex="fur-light" />
      <path d="M74 112 L80 152" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <path d="M74 112 L80 152" stroke="#7a4a28" strokeWidth={3.4} strokeLinecap="round" />
      <S d="M69 147 L90 144 L92 160 L71 163 Z" fill="#5a5a62" w={2.2} />
      <L d="M72 149 L88 147" color="#c9c2b8" w={1.4} />
      <ellipse cx="81" cy="156" rx="5" ry="2" fill="#ff8a3a" opacity="0.25" />
      <F d={circ(74, 114, 5.8)} fill={hideDark} />
      <L d="M71 115 l5 -2 M72 117.5 l5 -1.6" color="#1a100a" w={0.8} />
    </g>
  );
}

// --- Marisha: a raccoon, the Black Market -------------------------------------------------------

function Marisha() {
  const fur = "#8f8a86";
  const light = "#ece6dc";
  const mask = "#2c2622";
  const coat = "#6a4a2a";
  const scarf = "#ffd84a";
  return (
    <g>
      {shadow(30)}
      {/* The ringed tail curls out from under the coat. */}
      <Move kind="sway" origin="36px 132px" delay={2}>
        <F
          d="M38 134 C22 140 9 130 10 114 C11 103 19 97 27 101 C22 108 22 120 34 124 Z"
          fill={fur}
          tex="fur"
        />
        <path
          d="M12 109 C15 111 19 111 22 108 L24 101 C21 99 17 99 14 102 Z M10 121 C14 122 19 121 21 117 L21 112 C18 114 14 114 10 113 Z M14 131 C18 130 22 128 24 124 L27 122 C23 121 19 121 15 123 Z"
          fill={mask}
          opacity="0.9"
        />
        <path
          d="M10 114 C11 103 19 97 27 101 C22 108 22 120 34 124 L38 134 C22 140 9 130 10 114 Z"
          fill="none"
          stroke={INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </Move>
      {/* The pack with everything a merchant might sell after the end of the world. */}
      <S d="M17 72 C13 92 15 116 21 128 L42 128 L44 74 Z" fill="#7a4a28" />
      <L d="M18 96 L42 96" color="#5e3a20" w={2} />
      <S d="M12 64 h37 v11 h-37 Z" fill="#a8401a" w={1.8} />
      <L d="M14 68 L47 68 M14 71 L47 71" color="#e8c07a" w={0.8} op={0.7} />
      <S d="M22 62 C22 56 30 54 33 58 L33 63 Z" fill="#5a5a62" w={1.6} />
      <S d="M33 57 L37 54 L38 56 L34 59 Z" fill="#5a5a62" w={1.2} />
      <S d="M36 63 L40 53 L45 53 L43 63 Z" fill="#3d6ee0" w={1.4} />
      <S d={circ(17, 120, 6)} fill="#5a5a62" w={1.6} />
      <L d="M17 114 L17 106" w={1.2} />
      {/* Long patchwork coat. */}
      <S
        d="M36 70 C32 100 30 140 30 160 L71 160 C70 140 68 100 64 70 C58 64 42 64 36 70 Z"
        fill={coat}
      />
      <S d="M36 128 h10 v10 h-10 Z" fill="#a8401a" w={1.2} />
      <S d="M58 112 h8 v9 h-8 Z" fill="#3d6ee0" w={1.2} />
      <L
        d="M37 129 l2 2 M44 129 l-2 2 M59 113 l1.6 1.6 M65 113 l-1.6 1.6"
        color="#e8c07a"
        w={0.7}
      />
      <L d="M51 72 L51 158" color="#4a3018" w={1.4} />
      <S d="M35 100 L66 100 L66 108 L35 108 Z" fill={scarf} w={1.6} />
      <S d="M42 108 C40 116 48 118 50 110 Z" fill="#7a4a28" w={1.4} />
      <circle cx="45.5" cy="110.5" r="1.2" fill={scarf} />
      {/* Little black hand-paws and feet. */}
      <S d="M36 158 C34 165 46 166 46 159 Z" fill={mask} w={1.6} />
      <S d="M56 158 C55 165 68 166 66 159 Z" fill={mask} w={1.6} />
      <L d="M40 72 L44 100" color="#4a3018" w={3} />
      {/* Head: masked, pointed, one eye winking. */}
      <F d="M58 31 C60 22 64 17 69 17 C70 22 68 28 64 33 Z" fill={fur} />
      <F d="M45 63 L45 70 L59 70 L59 63 Z" fill={fur} />
      <F
        d="M36 48 C35 36 44 28 54 28 C64 28 70 33 72 40 C76 43 81 47 82 50 C82 54 78 56 74 56 C70 60 62 62 54 62 C44 62 37 58 36 48 Z"
        fill={fur}
        tex="fur"
      />
      <Move kind="twitch" origin="44px 32px" delay={1.1}>
        <F d="M40 35 C35 25 39 18 46 17 C49 22 49 28 47 33 Z" fill={fur} />
        <path d="M41.5 31 C39 25 41 21 45 20 C46.5 24 46.4 28 45 31 Z" fill={mask} />
        <L d="M38.5 30 C37 24 40 19 45.5 17.6" color={light} w={1.4} />
        <circle cx="42" cy="34" r="2.6" fill="none" stroke="#ffd84a" strokeWidth="1.2" />
      </Move>
      <path d="M57 50 C63 46 74 45 81 49 C82 54 78 57 72 58 C65 59 59 56 57 50 Z" fill={light} />
      <path d="M44 38 C50 33 58 34 61 38 C55 37 50 38 46 41 Z" fill={light} />
      <path d="M62 37 C66 35 70 36 72 39 C69 38 66 38 63 39 Z" fill={light} />
      <path
        d="M39 45 C43 39 52 39 58 43 C62 40 68 40 73 44 C71 49 66 51 62 50 C58 49 56 51 52 52 C45 53 41 50 39 45 Z"
        fill={mask}
      />
      <path
        d="M45 48 q3.6 -2.8 7.2 0"
        fill="none"
        stroke={light}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Eye x={66} y={45} r={2.8} iris="#c8902a" />
      <L d="M62 40 q4 -2.4 8 -0.6" color={light} w={1.2} />
      <path
        d="M79 47.5 C80.5 46 83.5 46.2 84 48.4 C84.2 50.6 82 51.6 80.6 51.2 C79.2 50.8 78.6 49 79 47.5 Z"
        fill={INK}
      />
      <ellipse cx="82" cy="47.6" rx="0.9" ry="0.5" fill="#fff" opacity="0.6" />
      <L d="M67 57 q5 2.6 10 -2.4" w={1.3} />
      <path d="M71 57.6 l1 2.4 l1.4 -2.6 Z" fill="#fff" stroke={INK} strokeWidth="0.6" />
      <Whiskers x={76} y={53} len={9} />
      {blush(60, 55, 2.6)}
      <S d="M44 66 C50 70 58 70 64 66 L66 72 C58 76 48 76 42 72 Z" fill={scarf} w={1.6} />
      {/* The near paw flips a coin. */}
      <S d="M58 72 C66 78 70 86 72 92 L66 96 C62 88 58 82 54 78 Z" fill={coat} />
      <Move kind="bob" origin="75px 86px" delay={0.6}>
        <S d={circ(75, 85, 3.6)} fill="#ffd84a" w={1.4} />
        <L d="M74 83 L74 87 M76 83 L76 87" color="#c8902a" w={0.7} />
        <path d="M80 78 l0.8 2 2 0.8 -2 0.8 -0.8 2 -0.8 -2 -2 -0.8 2 -0.8 Z" fill="#fff6c0" />
      </Move>
      <S d={circ(70, 94, 4)} fill={mask} />
      <L d="M71 90.5 l2 -2.6 M73 92 l2.6 -1.8" color={mask} w={1.6} />
    </g>
  );
}

// --- Liora: a moon hare, the Mystic -------------------------------------------------------------

function Liora() {
  const fur = "#e6e2ee";
  const furShade = "#b8b2cc";
  const pink = "#e8a8b8";
  const robe = "#2d5bd0";
  const rim = "#3d6ee0";
  return (
    <g>
      {shadow(30)}
      <S
        d="M34 66 C28 96 24 136 20 164 L78 164 C76 136 72 96 66 66 C58 60 42 60 34 66 Z"
        fill={robe}
      />
      <S d="M48 92 L58 92 C62 116 64 140 66 164 L46 164 C46 140 46 116 48 92 Z" fill="#4a7ae0" />
      <path
        d="M52 120 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5 Z M58 146 l1.2 2.8 2.8 1.2 -2.8 1.2 -1.2 2.8 -1.2 -2.8 -2.8 -1.2 2.8 -1.2 Z M32 132 l1 2.4 2.4 1 -2.4 1 -1 2.4 -1 -2.4 -2.4 -1 2.4 -1 Z"
        fill="#e8f6ff"
      />
      <path d="M38 104 a3 3 0 1 0 3 4 a2.4 2.4 0 1 1 -3 -4 Z" fill="#e8f6ff" opacity="0.85" />
      <L d="M20 164 C40 160 60 160 78 164" color="#6fd3ff" w={2} />
      {/* Long hare feet under the hem. */}
      <F d="M53 160 C57 157 71 157 76 161 C77 166 56 167 52 164 Z" fill={fur} />
      <L d="M70 161 l0 4 M73 161 l0 4" color={furShade} w={0.8} />
      {/* The hood, down around the shoulders, so the ears are free. */}
      <S d="M31 72 C29 60 38 54 50 56 C62 54 72 58 70 72 C62 66 42 66 31 72 Z" fill="#244aa8" />
      {/* Ears: one up, one flopped over (she never quite noticed). */}
      <Move kind="twitch" origin="52px 32px" delay={2.6}>
        <F d="M49 34 C42 20 40 7 45 2 C52 -1 57 12 57 31 Z" fill={fur} tex="fur" />
        <path d="M48.5 29 C45 19 44 10 46.8 6 C50.4 6 53.4 15 53.6 28 Z" fill={pink} />
      </Move>
      <F
        d="M58 34 C59 24 62 15 66 12 C72 9 81 13 84 20 C77 20 71 18 67 21 C65 25 65 30 65 35 Z"
        fill={fur}
        tex="fur"
      />
      <path
        d="M62 30 C62.6 23 64.4 17 67 15 C72 13 78 15 80.6 18.4 C75 18 70 17.4 66.4 20.4 C65 24 64.8 27 64.8 31 Z"
        fill={pink}
        opacity="0.9"
      />
      <F
        d="M40 46 C40 34 48 28 56 28 C66 28 72 35 72 43 C75 45 78 49 77 53 C75 58 69 60 62 60 C50 62 40 56 40 46 Z"
        fill={fur}
        tex="fur"
      />
      <path d="M57 51 C62 49 71 49 76 53 C74 58 67 60 61 58 C58 56 57 54 57 51 Z" fill="#fbf8ff" />
      <path d="M42 50 C44 56 50 59 56 59 C52 56 50 52 50 49 Z" fill={furShade} opacity="0.5" />
      {/* The moon mark on her brow. */}
      <Move kind="pulse">
        <circle cx="57" cy="34" r="6" fill="url(#moon-glow)" />
      </Move>
      <path
        d="M55 31 a3.4 3.4 0 1 0 4 5 a2.6 2.6 0 1 1 -4 -5 Z"
        fill="#cfe2ff"
        stroke="#6f8ad0"
        strokeWidth="0.6"
      />
      <Eye x={52} y={44} r={2.9} iris="#6a6ad8" lid={fur} blink={3.4} look={[0.18, -0.2]} />
      <Eye x={64} y={43} r={3.9} iris="#6a6ad8" lid={fur} blink={3.4} look={[0.18, -0.2]} />
      <path
        d="M74.6 49.4 l2.8 0 l-1.4 2 Z"
        fill={pink}
        stroke={INK}
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <L d="M76 51.4 L76 53.4 M76 53.4 q-1.6 1.6 -3.4 0.6 M76 53.4 q1.2 1.4 2.4 0.8" w={0.9} />
      <path d="M74.2 54.4 h2.6 v2.8 h-2.6 Z" fill="#fff" stroke={INK} strokeWidth="0.6" />
      <Whiskers x={74} y={52} color="#9a94b4" len={9} />
      {blush(65, 52, 3, "#e87a9a")}
      {/* A crescent pendant and the orb she reads the future in. */}
      <L d="M48 64 C52 70 60 70 64 64" color="#c8d6ff" w={0.9} />
      <path
        d="M55 69 a3 3 0 1 0 3.4 3.6 a2.2 2.2 0 1 1 -3.4 -3.6 Z"
        fill="#e8f0ff"
        stroke="#6f8ad0"
        strokeWidth="0.6"
      />
      <S d="M40 70 C44 84 52 94 62 100 L66 92 C58 88 52 80 50 70 Z" fill={robe} />
      <Move kind="pulse">
        <circle cx="71" cy="93" r="24" fill="url(#orb-glow)" />
      </Move>
      <S d={circ(71, 93, 7.2)} fill="#dff4ff" w={1.6} />
      <path d="M69 87 a6.4 6.4 0 1 0 6 10.4 a5 5 0 1 1 -6 -10.4 Z" fill="#9ab4e8" opacity="0.7" />
      <circle cx="68.6" cy="90.6" r="2.2" fill="#fff" />
      <Move kind="bob" origin="80px 80px" delay={1.4}>
        <path
          d="M80 78 l0.7 1.8 1.8 0.7 -1.8 0.7 -0.7 1.8 -0.7 -1.8 -1.8 -0.7 1.8 -0.7 Z M84 92 l0.5 1.3 1.3 0.5 -1.3 0.5 -0.5 1.3 -0.5 -1.3 -1.3 -0.5 1.3 -0.5 Z"
          fill="#fff"
        />
      </Move>
      <S d="M58 70 C66 78 72 88 72 98 L64 102 C64 92 62 84 56 78 Z" fill={rim} />
      <F d={circ(64, 101, 3.8)} fill={fur} w={1.5} />
      <F d={circ(76, 100, 3.8)} fill={fur} w={1.5} />
    </g>
  );
}

// --- Kaelen: a wolf, the Trainer ---------------------------------------------------------------

function Kaelen() {
  const fur = "#8a8e96";
  const furDark = "#5a5e68";
  const light = "#dcd8d0";
  const red = "#6a2a20";
  const steel = "#9a9aa2";
  return (
    <g>
      {shadow(30)}
      <Move kind="sway" origin="40px 124px" delay={0.3}>
        <F
          d="M40 118 C26 126 16 142 18 158 C25 154 32 147 36 140 C40 133 43 126 43 120 Z"
          fill={furDark}
          tex="fur-light"
        />
        <path d="M18 158 C21 152 25 148 28 146 C27 151 24 155 18 158 Z" fill={light} />
      </Move>
      <S d="M36 64 C26 90 22 130 22 162 L50 162 L52 70 Z" fill={red} />
      <S d="M42 124 L40 154 L50 154 L51 124 Z" fill="#4a3e30" />
      <S d="M38 151 L37 165 C37 167 52 167 52 165 L51 151 Z" fill="#5a5a62" />
      <L d="M40 156 L50 156" color="#c9c2b8" w={0.9} />
      <S d="M54 124 L56 154 L66 154 L63 124 Z" fill="#4a3e30" />
      <S d="M54 151 L54 165 C54 167 71 167 70 163 C69 159 67 156 66 151 Z" fill="#5a5a62" />
      <L d="M56 156 L67 156" color="#c9c2b8" w={0.9} />
      <S
        d="M38 66 C35 88 35 108 38 128 L64 128 C67 108 67 88 62 66 C56 62 44 62 38 66 Z"
        fill={red}
      />
      <path d="M44 112 l7 -6 l7 6 l-7 6 Z" fill="#c9a063" opacity="0.8" />
      <S
        d="M38 68 C36 82 38 96 42 104 L60 104 C64 96 66 82 62 68 C56 64 44 64 38 68 Z"
        fill={steel}
      />
      <L d="M50 70 L51 102" color="#5a5a62" w={1.4} />
      <L d="M56 72 C60 80 60 90 58 98" color="#e2e2ea" w={1.6} op={0.7} />
      <S d="M37 104 L65 104 L65 111 L37 111 Z" fill="#3b2a1e" />
      <S d="M48 103 h7 v9 h-7 Z" fill="#c9a063" w={1.4} />
      <S d="M30 76 C30 64 40 62 45 67 C41 71 36 73 30 76 Z" fill={steel} />
      <S d="M40 72 C42 86 52 94 62 96 L64 90 C56 88 50 82 48 72 Z" fill={red} />
      {/* The planted sword, both paws on the pommel. */}
      <S d="M64 106 L70 106 L69 158 L67 164 L65 158 Z" fill="#e2ddd4" />
      <L d="M67 108 L67 156" color="#8a8a92" w={1} />
      <S d="M58 102 L76 102 L76 106 L58 106 Z" fill="#c9a063" w={1.6} />
      <S d="M65 90 L69 90 L69 102 L65 102 Z" fill="#5e3a20" w={1.4} />
      <S d={circ(67, 88, 3)} fill="#e8c07a" w={1.2} />
      <S d="M58 70 C66 76 70 86 70 96 L62 98 C62 90 60 82 56 76 Z" fill={red} />
      <S d={circ(63, 96, 4.8)} fill="#5a5a62" />
      <S d={circ(71, 97, 4.8)} fill="#5a5a62" />
      <L d="M60 95 l3 2 M68 96 l3 2" color="#c9c2b8" w={0.8} />
      <S d="M53 66 C61 61 70 65 71 75 C65 73 59 73 54 76 Z" fill={steel} />
      {/* A thick ruff of fur over the gorget. */}
      <F
        d="M36 54 C36 64 44 70 54 70 C62 70 68 66 68 60 C64 58 60 60 56 58 C48 60 42 58 36 54 Z"
        fill={light}
        tex="fur"
      />
      <L d="M40 62 l2 4 M46 64 l1 4 M52 65 l0 4 M58 64 l-1 4" color="#a8a49c" w={0.9} />
      {/* Head: long muzzle, tall ears, an old scar and a stern amber eye. */}
      <Move kind="twitch" origin="54px 28px" delay={4}>
        <F d="M51 30 L57 9 L66 29 Z" fill={furDark} />
        <path d="M54.6 27 L57.4 15 L62.4 27 Z" fill="#3a2e2c" />
      </Move>
      <F
        d="M38 45 C36 32 44 24 54 24 C62 24 68 29 70 35 C76 37 82 41 86 45 C87 49 85 52 80 53 C74 56 66 58 58 58 C46 58 39 54 38 45 Z"
        fill={fur}
        tex="fur"
      />
      <F d="M40 32 L39 10 L52 25 Z" fill={fur} />
      <path d="M42 28 L41.4 15 L49 25 Z" fill="#3a2e2c" />
      <path d="M57 45 C66 41 78 41 86 45 C86 50 81 53 72 55 C64 56 58 52 57 45 Z" fill={light} />
      <path d="M38 47 C37 56 43 62 51 61 C47 59 45 55 47 51 Z" fill={light} />
      <L d="M40 52 l-3 3 M42 56 l-3 2" color={light} w={1.2} />
      <path d="M46 32 C52 28 60 28 66 33 C60 32 54 33 48 36 Z" fill={furDark} opacity="0.6" />
      <Eye x={54} y={38} r={2.2} iris="#e8a030" lid={fur} half={0.28} blink={0.9} />
      <Eye x={64} y={37.4} r={2.6} iris="#e8a030" lid={fur} half={0.28} blink={0.9} />
      <L d="M51 33.5 l5 1.6 M60 32.6 l8 2.2" w={2} />
      <L d="M60 29 l7 13" color="#d8b0a8" w={1.3} />
      <path
        d="M83 42.6 C85 41.4 88 42.4 88 45 C88 47.4 85.6 48.4 84 47.8 C82.4 47.2 82 44 83 42.6 Z"
        fill={INK}
      />
      <ellipse cx="86" cy="43.6" rx="1" ry="0.6" fill="#fff" opacity="0.6" />
      <L d="M66 53.6 q8 2 17 -2" w={1.3} />
      <circle cx="74" cy="49" r="0.6" fill={furDark} />
      <circle cx="77" cy="50" r="0.6" fill={furDark} />
    </g>
  );
}

// --- Nyssa: a red squirrel, the Runesmith -------------------------------------------------------

function Nyssa() {
  const fur = "#c8622a";
  const furDark = "#9a4418";
  const cream = "#f4dcb6";
  const tunic = "#4f7a3a";
  return (
    <g>
      {shadow(26)}
      {/* The great plume of a tail, curling up behind her head. */}
      <Move kind="sway" origin="42px 132px" delay={1.7}>
        <F
          d="M44 136 C22 136 10 118 14 96 C18 76 33 70 29 54 C27 45 19 42 12 44 C15 30 33 25 43 36 C52 47 47 66 38 80 C31 92 31 108 42 120 Z"
          fill={fur}
          tex="fur"
        />
        <path
          d="M14 96 C18 76 33 70 29 54 C27 45 19 42 12 44 C15 30 33 25 43 36"
          fill="none"
          stroke="#f0a060"
          strokeWidth="1.6"
          opacity="0.7"
        />
        <L
          d="M22 110 C20 98 24 86 32 76 M36 50 C38 44 36 38 30 34 M22 124 C26 128 32 130 38 130"
          color={furDark}
          w={0.9}
          op={0.7}
        />
      </Move>
      {/* Hind feet. */}
      <F d="M38 158 C35 166 51 167 51 159 Z" fill={furDark} />
      <F d="M54 158 C53 166 69 167 67 159 Z" fill={furDark} />
      <F d="M38 140 C36 150 38 158 44 160 L51 160 L52 142 Z" fill={fur} tex="fur" />
      <F d="M52 142 L54 160 L64 160 C68 156 68 148 65 140 Z" fill={fur} tex="fur" />
      {/* A short furry neck tucked into the collar. */}
      <F d="M40 54 C37 64 37 72 38 80 L66 80 C67 72 66 63 63 54 Z" fill={fur} tex="fur" />
      <path d="M46 60 C45 68 47 74 52 78 C58 75 60 68 59 60 Z" fill={cream} opacity="0.85" />
      {/* A moss-green tunic and a leather apron full of rune pockets. */}
      <S
        d="M39 78 C33 100 32 128 35 148 L67 148 C70 128 69 100 63 78 C57 73 45 73 39 78 Z"
        fill={tunic}
      />
      <L d="M36 140 L67 140" color="#c9a063" w={2} />
      <S d="M42 104 L62 104 L64 146 L40 146 Z" fill="#8a5a32" />
      <S d="M44 118 h8 v8 h-8 Z" fill="#7a4a28" w={1.2} />
      <S d="M54 116 h8 v8 h-8 Z" fill="#7a4a28" w={1.2} />
      <S d="M46 114 l2 -3 l3 1.4 l-1 3.2 Z" fill="#8fd06a" w={0.8} />
      <S d="M56 112 l2.6 -2.4 l2.4 2.4 l-2 2.6 Z" fill="#e8c07a" w={0.8} />
      <L d="M42 82 L62 104" color="#5e3a20" w={2.6} />
      <S d="M38 84 C33 92 32 102 35 110 L41 108 C40 100 41 92 44 86 Z" fill={tunic} />
      <F d={circ(38, 110, 3.8)} fill={fur} />
      <S d="M41 72 C49 77 57 77 65 72 L65 80 C56 84 48 84 40 80 Z" fill={cream} w={1.4} />
      {/* Head: big and round, tufted ears, bright eyes, glasses pushed up. */}
      <Move kind="twitch" origin="60px 30px" delay={0.8}>
        <F d="M56 31 C58 22 62 18 65 16 C67 22 65 28 62 33 Z" fill={fur} />
        <L d="M65 16 l0 -6 M65 16 l3 -5 M65 16 l-2 -5" color={furDark} w={1.4} />
      </Move>
      <F
        d="M37 50 C36 36 45 29 55 29 C65 29 72 36 72 45 C75 47 78 51 77 55 C75 61 69 64 60 65 C48 66 38 61 37 50 Z"
        fill={fur}
        tex="fur"
      />
      <Move kind="twitch" origin="47px 34px" delay={3.2}>
        <F d="M43 36 C40 27 42 20 47 17 C50 22 51 29 50 35 Z" fill={fur} />
        <path
          d="M45 32 C43.6 27 44.4 22.6 47 20.4 C48.4 24 48.8 28 48.2 32 Z"
          fill="#e89a8a"
          opacity="0.8"
        />
        <L d="M47 17 l-2 -6 M47 17 l1 -7 M47 17 l3.6 -5" color={furDark} w={1.4} />
      </Move>
      <path d="M55 55 C61 51 71 51 77 55 C75 62 66 65 58 63 C56 61 55 58 55 55 Z" fill={cream} />
      <path d="M40 52 C41 58 46 62 52 63 C49 60 48 57 48 54 Z" fill={cream} opacity="0.65" />
      <Eye x={54.5} y={45} r={3.2} lid={fur} blink={2.8} />
      <Eye x={66} y={44.4} r={3.8} lid={fur} blink={2.8} />
      <circle
        cx="51.5"
        cy="35.4"
        r="4.2"
        fill="#dff4ff"
        fillOpacity="0.25"
        stroke="#c9a063"
        strokeWidth="1.2"
      />
      <circle
        cx="62.4"
        cy="34.4"
        r="4.4"
        fill="#dff4ff"
        fillOpacity="0.25"
        stroke="#c9a063"
        strokeWidth="1.2"
      />
      <L d="M55.7 35 q1.2 -1 2.5 -0.6" color="#c9a063" w={1.1} />
      <path
        d="M75 52 C76.4 51 78.4 51.4 78.4 53 C78.4 54.6 76.6 55.2 75.6 54.8 C74.6 54.4 74.4 52.8 75 52 Z"
        fill="#5a2a1a"
      />
      <path
        d="M67 58 q5 5 10 -0.6 q-5 2 -10 0.6 Z"
        fill="#8a2a2a"
        stroke={INK}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M71 59 h2.6 v2.8 h-2.6 Z" fill="#fff" stroke={INK} strokeWidth="0.6" />
      <Whiskers x={74} y={56} color="#5a2a1a" len={8} />
      {blush(66, 53, 3.2)}
      {/* Both paws hold up the rune she just found. Isn't it marvellous? */}
      <S d="M58 80 C64 84 70 88 74 90 L71 96 C65 94 60 90 55 86 Z" fill={tunic} />
      <Move kind="pulse">
        <circle cx="79" cy="88" r="16" fill="url(#rune-glow)" />
      </Move>
      <S
        d="M73 82 C77 79 84 80 86 84 C88 89 86 95 81 96 C76 97 72 93 72 88 C72 86 72 84 73 82 Z"
        fill="#8a8478"
        w={1.6}
      />
      <path
        d="M73 82 C77 79 84 80 86 84 C88 89 86 95 81 96 C76 97 72 93 72 88 Z"
        fill="url(#vol)"
      />
      <L d="M79 83 L79 93 M79 86 L83 84 M79 89 L75 87" color="#fff2c0" w={1.5} />
      <F d={circ(74, 92, 3.6)} fill={fur} />
      <F d={circ(84, 93, 3.6)} fill={fur} />
    </g>
  );
}

// --- Eldrin: a raven, the Scout ----------------------------------------------------------------

function Eldrin() {
  const black = "#1d1f2b";
  const blackLight = "#2e3244";
  const beak = "#3e3e46";
  const leather = "#6b5038";
  const cloak = "#2e4a2a";
  return (
    <g>
      {shadow(26)}
      {/* Bow and quiver on his back. */}
      <path
        d="M33 54 C18 76 18 120 32 142"
        fill="none"
        stroke={INK}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d="M33 54 C18 76 18 120 32 142"
        fill="none"
        stroke="#8a5a32"
        strokeWidth={2.8}
        strokeLinecap="round"
      />
      <L d="M33 54 L32 142" color="#e8e4dc" w={0.9} />
      <S d="M37 62 L46 58 L54 100 L45 104 Z" fill="#7a4a28" />
      <L d="M40 60 L35 49 M43 59 L41 47 M46 58 L47 47" w={1.6} />
      <S d="M32 47 l5 -4 2 6 Z M38 44 l5 -4 1 6 Z M44 44 l5 -3 0 6 Z" fill="#e5484d" w={1} />
      {/* A wedge of tail feathers. */}
      <F d="M40 128 L23 156 L33 158 L48 134 Z" fill={black} />
      <L d="M31 142 L27 154 M37 140 L31 156" color="#4a4e66" w={0.8} />
      {/* Short scaly legs and talons. */}
      <path
        d="M46 144 L45 160 M58 144 L59 160"
        stroke={INK}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d="M46 144 L45 160 M58 144 L59 160"
        stroke={beak}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <L
        d="M45 160 L38 165 M45 160 L45 166 M45 160 L51 165 M59 160 L53 165 M59 160 L60 166 M59 160 L66 165"
        w={2.2}
      />
      {/* The far wing, folded. */}
      <F d="M39 72 C29 92 29 120 35 140 C40 130 43 106 45 82 Z" fill={black} />
      <L d="M34 110 C35 120 35 128 35 136 M38 100 C39 112 39 122 38 132" color="#4a4e66" w={0.8} />
      {/* A plump, glossy body under a leather harness. */}
      <F
        d="M41 64 C31 82 31 118 38 144 C45 151 60 151 66 144 C72 120 72 84 62 64 C56 59 47 59 41 64 Z"
        fill={black}
      />
      <L
        d="M44 84 q3 3 6 0 q3 3 6 0 q3 3 6 0 M41 96 q3 3 6 0 q3 3 6 0 q3 3 6 0 M42 108 q3 3 6 0 q3 3 6 0"
        color="#4a5070"
        w={0.8}
        op={0.8}
      />
      <path
        d="M41 64 C31 82 31 118 38 144 C45 151 60 151 66 144 C72 120 72 84 62 64 C56 59 47 59 41 64 Z"
        fill="url(#sheen)"
      />
      <L d="M42 70 L64 120" color="#3b2a1e" w={4.4} />
      <L d="M42 70 L64 120" color={leather} w={2.4} />
      <S d="M36 120 C46 124 58 124 69 120 L68 127 C57 131 46 131 37 127 Z" fill={leather} w={1.6} />
      <S d="M44 124 h7 v9 h-7 Z" fill="#7a4a28" w={1.2} />
      <S d="M55 124 h4 v4 h-4 Z" fill="#c9a063" w={1} />
      {/* A hooded capelet, the hood half up. */}
      <S
        d="M33 76 C36 64 48 58 57 58 C66 58 71 64 71 74 C65 81 54 84 44 83 C39 81 35 79 33 76 Z"
        fill={cloak}
      />
      <L d="M38 77 C46 80 58 80 68 74" color="#4a6a3a" w={0.9} />
      <S d={circ(56, 70, 2.6)} fill="#c9a063" w={1.1} />
      <S
        d="M36 52 C34 34 44 23 56 23 C64 23 69 27 71 32 C63 30 51 32 47 40 C45 46 45 52 47 58 Z"
        fill={cloak}
      />
      {/* Head: a heavy beak, shaggy throat, a narrowed silver-ringed eye. */}
      <F
        d="M41 47 C39 35 46 29 55 29 C63 29 69 35 69 43 C69 51 63 57 55 57 C47 57 42 53 41 47 Z"
        fill={black}
      />
      <path
        d="M41 47 C39 35 46 29 55 29 C63 29 69 35 69 43 C69 51 63 57 55 57 C47 57 42 53 41 47 Z"
        fill="url(#sheen)"
      />
      <Move kind="twitch" origin="54px 32px" delay={2.1}>
        <path
          d="M50 31 l-3 -6 l5 3 l0 -6 l4 5"
          fill="none"
          stroke={INK}
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M50 31 l-3 -6 l5 3 l0 -6 l4 5"
          fill="none"
          stroke={blackLight}
          strokeWidth="1"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Move>
      <path
        d="M58 52 C62 58 58 64 51 63 C53 60 52 58 50 57 C48 59 45 60 43 58 C46 56 48 54 49 52 Z"
        fill={black}
        stroke={INK}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <S d="M64 38 C72 35 82 39 88 46 C82 46.4 72 46.4 64 46 Z" fill={beak} w={1.8} />
      <L d="M67 39.6 C74 38.6 81 41 86 45" color="#7a7a88" w={0.9} />
      <S d="M64 46 C72 46 80 46.6 85 47.6 C79 51 70 51.4 64 50 Z" fill="#2e2e36" w={1.6} />
      <L d="M62 38 l4 2 M62 41 l4 1" color={blackLight} w={1.2} />
      <circle
        cx="59"
        cy="40"
        r="3.8"
        fill="none"
        stroke="#b8c2d8"
        strokeWidth="0.9"
        opacity="0.8"
      />
      <Eye x={59} y={40} r={2.7} iris="#2a2230" lid={black} half={0.34} blink={1.9} />
      <L d="M55 35 l8 2" w={1.8} />
      {/* The near wing holds the spyglass: he has seen what's ahead. */}
      <F d="M62 70 C73 80 75 98 71 112 L64 116 C64 100 62 88 56 78 Z" fill={blackLight} />
      <path d="M62 70 C73 80 75 98 71 112 L64 116 C64 100 62 88 56 78 Z" fill="url(#sheen)" />
      <S d="M60 112 L80 100 L83.5 105 L63.5 117 Z" fill="#c9a063" w={1.6} />
      <S d="M79 99 L85 95.5 L88 101 L82.5 104.6 Z" fill="#a8741c" w={1.4} />
      <L d="M66 107.6 L69.6 113.4 M73 103.4 L76.6 109.2" color="#7a5a24" w={1} />
      <circle cx="86" cy="98" r="1.6" fill="#dff4ff" opacity="0.8" />
      <path
        d="M64 114 l-5 2 l3 -4 l-5 -1 l5 -2 l-3 -3 l5 1 Z"
        fill={blackLight}
        stroke={INK}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** One persona's drawing, facing right. */
export function PersonaArt(props: { id: string; gear?: HeirGear }) {
  switch (props.id) {
    case "heir":
      return <Heir gear={props.gear ?? { weapon: "sword" }} />;
    case "nan":
      return <Nan />;
    case "thoric":
      return <Thoric />;
    case "marisha":
      return <Marisha />;
    case "liora":
      return <Liora />;
    case "kaelen":
      return <Kaelen />;
    case "nyssa":
      return <Nyssa />;
    case "eldrin":
      return <Eldrin />;
    default:
      return null;
  }
}

/** A persona's painted head for a round portrait (the screen must render `PaintDefs` once). */
export function PersonaPortrait(props: { id: string; gear?: HeirGear }) {
  const box = PORTRAIT[props.id];
  if (!box) return null;
  return (
    <svg viewBox={box} width="100%" height="100%" aria-hidden="true">
      <PersonaArt id={props.id} {...(props.gear ? { gear: props.gear } : {})} />
    </svg>
  );
}
