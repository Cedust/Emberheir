import { L, S, circ } from "./paint";

/**
 * The camp personas, drawn in code. Every figure stands in a 100 × 175 box with its feet at
 * y ≈ 166 and faces right; the camp mirrors the ones standing right of the Hearthfire, so
 * everybody looks at the fire and the fire light always falls on the near side.
 */
export const FIGURE_W = 100;
export const FIGURE_H = 175;

/** The part of each figure the persona card shows as a portrait (viewBox). */
export const PORTRAIT: Record<string, string> = {
  heir: "29 22 44 44",
  nan: "44 38 44 44",
  thoric: "28 24 48 48",
  marisha: "28 24 46 46",
  liora: "33 24 46 46",
  kaelen: "28 18 46 46",
  eldrin: "26 18 48 48",
  nyssa: "30 24 46 46",
};

export interface HeirGear {
  readonly weapon: "sword" | "wand";
  readonly offHand?: "shield" | "focus";
}

/** Eyes, nose and mouth of a head facing right (three-quarter view). */
function Face(props: { cx: number; cy: number; r: number; skin: string; brow?: boolean }) {
  const { cx, cy, r } = props;
  return (
    <>
      <ellipse cx={cx - r * 0.12} cy={cy - 1} rx={1.25} ry={1.8} fill="#2a1f17" />
      <ellipse cx={cx + r * 0.42} cy={cy - 1} rx={1.4} ry={2} fill="#2a1f17" />
      {props.brow && (
        <L d={`M${cx - r * 0.3} ${cy - 5} l4 -1 M${cx + r * 0.3} ${cy - 6} l5 0`} w={1.8} />
      )}
      <path
        d={`M${cx + r * 0.86} ${cy - 2} q3.5 3 0 5.5`}
        fill={props.skin}
        stroke="#2a1f17"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <L d={`M${cx + r * 0.18} ${cy + r * 0.48} q3 1.8 6 -0.4`} w={1.3} />
      <ellipse
        cx={cx + r * 0.3}
        cy={cy + r * 0.28}
        rx={2.6}
        ry={1.6}
        fill="#e0705a"
        opacity={0.35}
      />
    </>
  );
}

const shadow = (rx: number) => (
  <ellipse cx="50" cy="167" rx={rx} ry="5" fill="#000" opacity="0.32" />
);

function Heir(props: { gear: HeirGear }) {
  const skin = "#f0c9a0";
  const cloak = "#a8401a";
  const tunic = "#c9a06a";
  const trim = "#e8c07a";
  const { weapon, offHand } = props.gear;
  return (
    <g>
      {shadow(28)}
      <S d="M40 66 C30 84 24 122 22 160 C30 164 40 163 46 160 L52 72 Z" fill={cloak} />
      <S d="M43 120 L41 152 L49 152 L51 120 Z" fill="#5e4a36" />
      <S d="M39 150 L38 164 C38 166 52 166 52 164 L50 150 Z" fill="#3b2a1e" />
      <S d="M53 120 L57 152 L65 152 L61 120 Z" fill="#5e4a36" />
      <S d="M55 150 L55 164 C55 166 71 166 70 162 C69 158 66 156 65 150 Z" fill="#3b2a1e" />
      {offHand === "shield" && (
        <>
          <S d={circ(33, 104, 15)} fill="#8a5a32" w={2.5} />
          <circle cx="33" cy="104" r="12" fill="none" stroke="#9a9aa2" strokeWidth="3" />
          <S d={circ(33, 104, 4)} fill="#c9c2b8" />
        </>
      )}
      <S d="M40 70 C33 82 32 96 34 108 L40 108 C40 96 42 86 46 76 Z" fill={tunic} />
      <S d={circ(37, 110, 4)} fill={skin} />
      {offHand === "focus" && (
        <>
          <circle cx="36" cy="113" r="11" fill="url(#ember-glow)" />
          <S d={circ(36, 113, 4.5)} fill="#ffb13b" />
        </>
      )}
      <S
        d="M39 66 C36 86 36 106 39 124 L63 124 C66 106 66 86 61 66 C55 62 45 62 39 66 Z"
        fill={tunic}
      />
      <L d="M39 117 L63 117" color={trim} w={2.5} />
      <S d="M37 102 L65 102 L65 109 L37 109 Z" fill="#5e3a20" />
      <S d="M48 101 h7 v9 h-7 Z" fill={trim} w={1.4} />
      <S d="M36 70 C40 60 60 58 66 68 C60 66 50 66 44 70 C42 74 40 80 38 84 Z" fill={cloak} />
      <S d="M47 55 L47 64 L55 64 L55 55 Z" fill={skin} flat />
      <S d={circ(51, 46, 13)} fill={skin} />
      <S
        d="M38 47 C35 30 50 26 60 31 C64 33 65 37 64 40 C58 38 52 37 46 40 C43 42 41 46 41 53 Z"
        fill="#6a4024"
      />
      <S d="M39 40 C47 35 58 35 64 38 L64 42 C58 39 47 39 39 45 Z" fill={trim} w={1.6} />
      <S d="M38 42 L29 46 L31 51 L39 46 Z" fill={trim} w={1.4} />
      <Face cx={51} cy={47} r={13} skin={skin} />
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
          <circle cx="82" cy="71" r="12" fill="url(#ember-glow)" />
          <S d={circ(82, 71, 3.6)} fill="#ffb13b" w={1.4} />
        </>
      )}
      <S d={circ(66, 104, 4.5)} fill={skin} />
    </g>
  );
}

function Nan() {
  const skin = "#e3b894";
  const shawl = "#5e4a36";
  return (
    <g>
      {shadow(28)}
      <S d="M30 166 C31 132 36 104 46 88 L66 88 C72 108 74 136 76 166 Z" fill="#7a6a52" />
      <S d="M50 100 L68 100 C70 120 71 142 72 162 L54 164 C53 140 52 120 50 100 Z" fill="#b89768" />
      <L d="M54 130 L70 128 M55 146 L71 144" color="#7a5a24" w={1} op={0.6} />
      <S
        d="M28 114 C24 84 32 54 52 42 C66 36 78 44 78 58 C74 54 66 52 60 56 C52 64 48 78 50 96 C44 100 36 108 28 114 Z"
        fill={shawl}
      />
      <L d="M30 110 L48 92 M34 92 L46 80" color="#c9a063" w={1.2} op={0.55} />
      <S d={circ(66, 62, 11)} fill={skin} />
      <S
        d="M51 52 C56 40 74 39 80 52 C81 56 80 59 79 61 C76 53 69 49 61 50 C56 52 54 56 54 62 Z"
        fill={shawl}
      />
      <L d="M54 61 C54 54 60 49.5 68 49.5 C74 50 78 54 79 60" color="#c9a063" w={2.6} />
      <L d="M57 58 C58 54 61 53 64 53" color="#d8d4cc" w={2.4} />
      <L d="M66 61 q2.5 -2 5 0" w={1.4} />
      <path d="M76 61 q5.5 3.5 0 7.5" fill={skin} stroke="#2a1f17" strokeWidth={1.3} />
      <L d="M68 68 q3 2 5.5 -0.5" w={1.3} />
      <ellipse cx="70" cy="65" rx="2.6" ry="1.6" fill="#e0705a" opacity="0.35" />
      <S d="M44 112 C44 121 53 123 55 114 Z" fill="#8a5a32" w={1.5} />
      <S d="M54 76 C62 82 70 88 76 92 L74 99 C66 96 58 92 50 86 Z" fill={shawl} />
      <path
        d="M82 166 C80 140 81 120 79 100 C78 92 80 86 78 80"
        fill="none"
        stroke="#2a1f17"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <path
        d="M82 166 C80 140 81 120 79 100 C78 92 80 86 78 80"
        fill="none"
        stroke="#8a5a32"
        strokeWidth={3.4}
        strokeLinecap="round"
      />
      <S d={circ(78, 78, 4)} fill="#7a5a24" />
      <S d={circ(78, 96, 4.2)} fill={skin} />
    </g>
  );
}

function Thoric() {
  const skin = "#d9a07a";
  const shirt = "#4a4a4e";
  return (
    <g>
      {shadow(32)}
      <S d="M38 126 L36 154 L47 154 L48 126 Z" fill="#3b3430" />
      <S d="M33 152 L32 165 C32 167 48 167 48 165 L47 152 Z" fill="#2a221e" />
      <S d="M54 126 L58 154 L69 154 L65 126 Z" fill="#3b3430" />
      <S d="M56 152 L56 165 C56 167 74 167 73 163 C72 159 70 156 69 152 Z" fill="#2a221e" />
      <S d="M31 72 C22 84 22 98 27 108 L35 105 C33 96 33 86 37 78 Z" fill={shirt} />
      <S d="M27 106 L38 114 L42 108 L33 101 Z" fill={skin} />
      <S d={circ(41, 112, 5)} fill={skin} />
      <S
        d="M30 70 C24 90 26 114 32 130 L68 130 C74 114 76 90 70 70 C62 62 38 62 30 70 Z"
        fill={shirt}
      />
      <S d="M36 84 L64 84 L68 142 L32 142 Z" fill="#8a5a32" />
      <L d="M36 84 L33 70 M64 84 L67 70" color="#5e3a20" w={3} />
      <S d="M42 108 h16 v12 h-16 Z" fill="#7a4a28" w={1.5} />
      <ellipse cx="56" cy="96" rx="5" ry="3" fill="#2a1f17" opacity="0.25" />
      <ellipse cx="40" cy="132" rx="4" ry="2.5" fill="#2a1f17" opacity="0.25" />
      <S d={circ(52, 48, 14)} fill={skin} />
      <S d={circ(40, 50, 3.6)} fill={skin} w={1.5} />
      <ellipse cx="50" cy="38" rx="5" ry="2.4" fill="#fff" opacity="0.35" />
      <S d="M38 48 C38 42 40 40 43 40 L43 52 Z" fill="#8a3a1e" w={1.4} />
      <Face cx={52} cy={48} r={14} skin={skin} brow />
      <S
        d="M40 52 C38 70 46 82 55 82 C64 82 68 70 66 54 C62 60 56 61 52 58 C48 60 43 58 40 52 Z"
        fill="#a0461e"
      />
      <S d="M50 56 C54 53 60 53 65 56 C60 58 55 58 50 58 Z" fill="#8a3a1e" w={1.4} />
      <S d={circ(64, 49, 3.2)} fill={skin} w={1.4} />
      <S d="M64 70 C72 76 76 88 76 98 L68 100 C68 90 66 82 60 76 Z" fill={shirt} />
      <S d="M68 98 L76 96 L78 112 L70 114 Z" fill={skin} />
      <path d="M74 112 L80 152" stroke="#2a1f17" strokeWidth={6} strokeLinecap="round" />
      <path d="M74 112 L80 152" stroke="#7a4a28" strokeWidth={3.4} strokeLinecap="round" />
      <S d="M69 147 L90 144 L92 160 L71 163 Z" fill="#5a5a62" w={2.2} />
      <L d="M72 149 L88 147" color="#c9c2b8" w={1.4} />
      <S d={circ(74, 114, 5.5)} fill={skin} />
    </g>
  );
}

function Marisha() {
  const skin = "#e8b890";
  const scarf = "#ffd84a";
  const dress = "#7a5a24";
  return (
    <g>
      {shadow(28)}
      <S d="M18 72 C14 92 16 116 22 128 L42 128 L44 74 Z" fill="#7a4a28" />
      <S d="M13 64 h36 v11 h-36 Z" fill="#a8401a" w={1.8} />
      <S d={circ(18, 120, 6)} fill="#5a5a62" w={1.6} />
      <S
        d="M36 70 C32 100 30 140 30 166 L72 166 C70 140 68 100 64 70 C58 64 42 64 36 70 Z"
        fill={dress}
      />
      <S d="M35 100 L66 100 L66 108 L35 108 Z" fill={scarf} w={1.6} />
      <L d="M40 70 L44 100" color="#5e3a20" w={3} />
      <S d={circ(40, 54, 5.5)} fill="#3a2418" w={1.5} />
      <S d={circ(52, 48, 12)} fill={skin} />
      <S
        d="M38 51 C36 34 48 30 56 32 C64 34 66 40 64 44 C56 40 46 42 42 55 L38 61 Z"
        fill={scarf}
      />
      <S d="M38 53 L30 65 L36 67 L42 57 Z" fill={scarf} w={1.6} />
      <Face cx={52} cy={49} r={12} skin={skin} />
      <S d={circ(47, 56, 1.8)} fill="#ffd84a" w={1} />
      <S d="M58 72 C64 80 66 90 66 98 L60 100 C60 92 58 84 54 78 Z" fill={dress} />
      <S d="M59 104 C57 115 71 115 69 104 Z" fill="#a8401a" w={1.6} />
      <S d={circ(63, 101, 4)} fill={skin} />
    </g>
  );
}

function Liora() {
  const skin = "#f0d0b0";
  const robe = "#2d5bd0";
  const rim = "#3d6ee0";
  return (
    <g>
      {shadow(30)}
      <S
        d="M34 64 C28 96 24 136 20 166 L78 166 C76 136 72 96 66 64 C58 58 42 58 34 64 Z"
        fill={robe}
      />
      <S d="M48 92 L58 92 C62 116 64 140 66 166 L46 166 C46 140 46 116 48 92 Z" fill="#4a7ae0" />
      <path
        d="M52 120 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5 Z M58 146 l1.2 2.8 2.8 1.2 -2.8 1.2 -1.2 2.8 -1.2 -2.8 -2.8 -1.2 2.8 -1.2 Z"
        fill="#e8f6ff"
      />
      <L d="M20 166 C40 162 60 162 78 166" color="#6fd3ff" w={2} />
      <S d="M34 68 C28 44 38 26 54 26 C68 26 76 38 74 54 C72 60 70 64 66 68 Z" fill={robe} />
      <S d={circ(56, 49, 11)} fill={skin} />
      <S d="M46 52 C44 60 44 70 48 76 L53 72 C51 66 51 58 51 52 Z" fill="#e8e0f0" w={1.5} />
      <S
        d="M44 61 C40 44 46 32 58 32 C68 32 73 42 71 53 C69 44 63 38 56 38 C48 38 44 46 46 58 Z"
        fill={rim}
      />
      <L d="M45 60 C42 46 48 35 58 35 C66 35 71 43 70 52" color="#6fd3ff" w={1.6} />
      <Face cx={56} cy={50} r={11} skin={skin} />
      <S d={circ(57, 41.5, 1.6)} fill="#6fd3ff" w={0.8} />
      <S d="M40 70 C44 84 52 94 62 100 L66 92 C58 88 52 80 50 70 Z" fill={robe} />
      <circle cx="71" cy="93" r="22" fill="url(#orb-glow)" />
      <S d={circ(71, 93, 7)} fill="#bff0ff" w={1.6} />
      <circle cx="69" cy="91" r="2.4" fill="#fff" />
      <S d="M58 70 C66 78 72 88 72 98 L64 102 C64 92 62 84 56 78 Z" fill={rim} />
      <S d={circ(64, 101, 3.6)} fill={skin} w={1.5} />
      <S d={circ(76, 100, 3.6)} fill={skin} w={1.5} />
    </g>
  );
}

function Kaelen() {
  const skin = "#d9a784";
  const red = "#6a2a20";
  const steel = "#9a9aa2";
  return (
    <g>
      {shadow(30)}
      <S d="M36 64 C26 90 22 130 22 164 L50 164 L52 70 Z" fill={red} />
      <S d="M42 124 L40 154 L50 154 L51 124 Z" fill="#4a3e30" />
      <S d="M38 151 L37 165 C37 167 52 167 52 165 L51 151 Z" fill="#2a221e" />
      <S d="M54 124 L56 154 L66 154 L63 124 Z" fill="#4a3e30" />
      <S d="M54 151 L54 165 C54 167 71 167 70 163 C69 159 67 156 66 151 Z" fill="#2a221e" />
      <S
        d="M38 66 C35 88 35 108 38 128 L64 128 C67 108 67 88 62 66 C56 62 44 62 38 66 Z"
        fill={red}
      />
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
      <S d="M64 106 L70 106 L69 158 L67 164 L65 158 Z" fill="#e2ddd4" />
      <L d="M67 108 L67 156" color="#8a8a92" w={1} />
      <S d="M58 102 L76 102 L76 106 L58 106 Z" fill="#c9a063" w={1.6} />
      <S d="M65 90 L69 90 L69 102 L65 102 Z" fill="#5e3a20" w={1.4} />
      <S d={circ(67, 88, 3)} fill="#e8c07a" w={1.2} />
      <S d="M58 70 C66 76 70 86 70 96 L62 98 C62 90 60 82 56 76 Z" fill={red} />
      <S d={circ(63, 96, 4.8)} fill="#5a5a62" />
      <S d={circ(71, 97, 4.8)} fill="#5a5a62" />
      <S d="M53 66 C61 61 70 65 71 75 C65 73 59 73 54 76 Z" fill={steel} />
      <S d="M47 55 L47 64 L55 64 L55 55 Z" fill={skin} flat />
      <S d={circ(51, 46, 12.5)} fill={skin} />
      <S
        d="M42 51 C42 60 50 62 58 60 C62 58 64 55 64 51 C60 55 54 56 50 55 C46 55 44 53 42 51 Z"
        fill="#8a8580"
      />
      <Face cx={51} cy={46} r={12.5} skin={skin} brow />
      <L d="M58 41 l3 8" color="#a8401a" w={1.2} />
      <S
        d="M37 46 C37 28 65 28 65 44 L65 47 L61 47 C61 40 57 36 51 36 C45 36 41 41 41 53 L37 53 Z"
        fill={steel}
      />
      <L d="M38 44 C46 40 58 40 64 43" color="#5a5a62" w={1.2} />
      <S d="M44 31 C40 20 46 13 53 15 C49 19 49 24 51 31 Z" fill="#a8401a" w={1.6} />
    </g>
  );
}

function Eldrin() {
  const skin = "#e0b894";
  const robe = "#4f7a3a";
  return (
    <g>
      {shadow(28)}
      <path d="M77 166 L77 50" stroke="#2a1f17" strokeWidth={6} strokeLinecap="round" />
      <path d="M77 166 L77 50" stroke="#7a5a24" strokeWidth={3.4} strokeLinecap="round" />
      <circle cx="77" cy="42" r="18" fill="url(#rune-glow)" />
      <S d="M71 42 L77 31 L83 42 L77 53 Z" fill="#e8c07a" w={1.8} />
      <L d="M77 36 L77 48 M74 41 L80 43" color="#7a4a28" w={1.2} />
      <S
        d="M34 66 C28 100 26 136 24 166 L74 166 C72 136 70 100 66 66 C58 60 42 60 34 66 Z"
        fill={robe}
      />
      <S d="M24 157 L74 157 L74 166 L24 166 Z" fill="#c9a063" w={1.6} />
      <L d="M34 112 C44 116 58 116 68 112" color="#c9a063" w={2.4} />
      <S d="M58 114 C56 124 66 124 64 114 Z" fill="#7a4a28" w={1.4} />
      <S d={circ(50, 48, 11)} fill={skin} />
      <S d="M39 52 C37 72 44 96 52 104 C58 92 62 72 60 52 C56 58 46 58 39 52 Z" fill="#ece8e0" />
      <S d="M48 55 C52 52 58 52 61 55 C57 57 52 57 48 57 Z" fill="#d8d4cc" w={1.3} />
      <Face cx={50} cy={47} r={11} skin={skin} />
      <S
        d="M28 43 C40 46 60 46 73 41 C67 37 63 35 59 35 L47 3 C45 10 43 22 42 35 C37 37 33 39 28 43 Z"
        fill="#3b5a2c"
      />
      <S d="M42 35 C48 37 54 37 59 35 L60 39 C54 41 48 41 42 39 Z" fill="#c9a063" w={1.4} />
      <S d="M58 70 C66 76 72 84 75 92 L69 96 C65 88 60 82 54 78 Z" fill={robe} />
      <S d={circ(75, 94, 4)} fill={skin} />
    </g>
  );
}

function Nyssa() {
  const skin = "#d9a784";
  const green = "#3b5a2c";
  const leather = "#6b5038";
  return (
    <g>
      {shadow(26)}
      <S d="M27 64 L37 60 L46 104 L36 108 Z" fill="#7a4a28" />
      <L d="M29 62 L24 52 M33 60 L30 49 M36 59 L36 48" color="#2a1f17" w={1.6} />
      <S d="M21 50 l5 -4 2 6 Z M27 47 l5 -4 1 6 Z M33 46 l5 -3 0 6 Z" fill="#e5484d" w={1} />
      <S d="M36 64 C28 90 26 120 26 142 L46 140 L52 70 Z" fill={green} />
      <S d="M44 120 L43 152 L50 152 L51 120 Z" fill="#4a3e30" />
      <S d="M40 150 L39 165 C39 167 52 167 52 165 L51 150 Z" fill="#3b2a1e" />
      <S d="M53 120 L56 152 L63 152 L60 120 Z" fill="#4a3e30" />
      <S d="M54 150 L54 165 C54 167 69 167 68 163 C67 159 65 156 64 150 Z" fill="#3b2a1e" />
      <S
        d="M40 66 C38 84 38 104 40 122 L62 122 C64 104 64 84 60 66 C55 62 45 62 40 66 Z"
        fill={leather}
      />
      <S d="M39 104 L63 104 L63 110 L39 110 Z" fill="#3b2a1e" />
      <L d="M42 66 L60 104" color="#3b2a1e" w={2.6} />
      <S
        d="M36 56 C34 36 46 27 56 28 C66 30 70 40 68 52 C64 45 58 41 52 43 C46 46 44 54 46 64 L38 66 Z"
        fill={green}
      />
      <S d={circ(54, 49, 11)} fill={skin} />
      <S
        d="M43 47 C42 36 52 32 60 34 C66 36 69 42 68 48 C64 42 58 40 52 41 C47 42 45 44 44 50 Z"
        fill={green}
      />
      <Face cx={54} cy={50} r={11} skin={skin} brow />
      <path
        d="M67 52 C83 70 83 122 67 140"
        fill="none"
        stroke="#2a1f17"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d="M67 52 C83 70 83 122 67 140"
        fill="none"
        stroke="#8a5a32"
        strokeWidth={2.8}
        strokeLinecap="round"
      />
      <L d="M67 52 L67 140" color="#e8e4dc" w={1} />
      <S d="M58 70 C64 78 68 86 72 94 L66 98 C62 90 58 82 54 76 Z" fill={leather} />
      <S d={circ(71, 96, 4)} fill={skin} />
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
    case "eldrin":
      return <Eldrin />;
    case "nyssa":
      return <Nyssa />;
    default:
      return null;
  }
}
