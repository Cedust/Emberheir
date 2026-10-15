import { ITEM_CATALOG } from "@emberheir/content";
import { getBase, type Item } from "@emberheir/sim";
import { useState } from "react";
import { dragging, endDrag } from "../../ui/dragItems";
import { ItemArt } from "../../ui/ItemArt";
import { rarityClass } from "../../ui/items";
import type { PersonaId } from "./personaDefs";

/** Where each crafter works on an item (ui-ux-plan-v1.md 4.3). */
export const BENCH: Record<PersonaId, string> = {
  thoric: "Anvil",
  liora: "Altar",
  nyssa: "Rune Table",
  marisha: "Card Table",
};

const INK = "#1d140e";
const SHINE = "#fffaf0";

/** A painted shape like the item icons: gradient fill and ink outline. */
function P(props: { d: string; fill: string; w?: number; op?: number }) {
  return (
    <path
      d={props.d}
      fill={props.fill}
      stroke={INK}
      strokeWidth={props.w ?? 2}
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity={props.op}
    />
  );
}

/** A line without fill: grain, seams, highlights. */
function L(props: { d: string; color?: string; w?: number; op?: number }) {
  return (
    <path
      d={props.d}
      fill="none"
      stroke={props.color ?? INK}
      strokeWidth={props.w ?? 1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={props.op}
    />
  );
}

/** Vertical shading: light from above, the way the item icons are lit. */
function Shade(props: { id: string; stops: readonly string[]; x2?: number; y2?: number }) {
  return (
    <linearGradient id={props.id} x1="0" y1="0" x2={props.x2 ?? 0} y2={props.y2 ?? 1}>
      {props.stops.map((c, i) => (
        <stop key={i} offset={i / (props.stops.length - 1)} stopColor={c} />
      ))}
    </linearGradient>
  );
}

function Glow(props: { id: string; color: string; strength?: number }) {
  return (
    <radialGradient id={props.id}>
      <stop offset="0" stopColor={props.color} stopOpacity={props.strength ?? 0.8} />
      <stop offset="0.45" stopColor={props.color} stopOpacity={(props.strength ?? 0.8) * 0.3} />
      <stop offset="1" stopColor={props.color} stopOpacity="0" />
    </radialGradient>
  );
}

/** A candle with its flame and halo. */
function Candle(props: { x: number; y: number; h: number }) {
  const { x, y, h } = props;
  return (
    <>
      <circle cx={x} cy={y - h - 8} r={22} fill="url(#wb-candle-glow)" />
      <P
        d={`M${x - 5} ${y}V${y - h}Q${x} ${y - h - 2} ${x + 5} ${y - h}V${y}Z`}
        fill="url(#wb-wax)"
        w={1.6}
      />
      <L d={`M${x - 2.5} ${y - h + 3}V${y - 4}`} color={SHINE} w={1.2} op={0.7} />
      <L d={`M${x} ${y - h - 1}V${y - h - 4}`} w={1.2} />
      <path
        d={`M${x} ${y - h - 16}Q${x + 5} ${y - h - 8} ${x} ${y - h - 3}Q${x - 5} ${y - h - 8} ${x} ${y - h - 16}Z`}
        fill="url(#wb-flame)"
      />
    </>
  );
}

/**
 * The bench under the item, painted in code like the item icons (gradients, ink outline,
 * highlights) until Timo's painted benches arrive. The item rests on the top face at y = 52.
 */
function BenchArt(props: { persona: PersonaId }) {
  return (
    <svg className="bench-art" viewBox="0 0 320 150" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="wb-shadow">
          <stop offset="0" stopColor="#000" stopOpacity="0.45" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <Shade id="wb-iron" stops={["#d6d0c6", "#8a847b", "#4e4943", "#2a2724"]} />
        <Shade
          id="wb-iron-side"
          stops={["#2a2724", "#6a645c", "#a39c90", "#3a3632"]}
          x2={1}
          y2={0}
        />
        <Shade
          id="wb-stump"
          stops={["#3a2412", "#7a5230", "#a87a4a", "#6a4424", "#2e1c0e"]}
          x2={1}
          y2={0}
        />
        <Shade id="wb-rings" stops={["#e2bf8a", "#b88a54"]} />
        <Shade id="wb-wood" stops={["#c89058", "#8a5a2e", "#4e2e14"]} />
        <Shade
          id="wb-wood-side"
          stops={["#3a2210", "#7a4e28", "#a8784a", "#5a3a1c", "#2e1a0a"]}
          x2={1}
          y2={0}
        />
        <Shade id="wb-stone" stops={["#e6e0f0", "#a89cc0", "#5e5478", "#3a3250"]} />
        <Shade
          id="wb-stone-side"
          stops={["#3a3250", "#7a6e98", "#b4a8cc", "#4a4066"]}
          x2={1}
          y2={0}
        />
        <Shade id="wb-silk" stops={["#c89cff", "#7a3ec8", "#3a1470"]} />
        <Shade id="wb-felt" stops={["#4a8a50", "#2a5a30", "#163a1c"]} />
        <Shade id="wb-gold" stops={["#fff2b0", "#e2aa36", "#8a5a12"]} />
        <Shade id="wb-wax" stops={["#fffaf0", "#e8dcc0", "#b8a88a"]} x2={1} y2={0} />
        <Shade id="wb-card" stops={["#fffaf0", "#e8dcc4"]} />
        <radialGradient id="wb-flame" cx="0.5" cy="0.7" r="0.6">
          <stop offset="0" stopColor="#fffbe0" />
          <stop offset="0.5" stopColor="#ffc24a" />
          <stop offset="1" stopColor="#ff6a1a" />
        </radialGradient>
        <Glow id="wb-candle-glow" color="#ffc24a" strength={0.55} />
        <Glow id="wb-ember-glow" color="#ff7a2a" />
        <Glow id="wb-violet-glow" color="#b36bff" strength={0.7} />
        <Glow id="wb-green-glow" color="#8fd06a" strength={0.7} />
        <Glow id="wb-gold-glow" color="#ffd86a" strength={0.5} />
      </defs>
      <ellipse cx="160" cy="142" rx="132" ry="9" fill="url(#wb-shadow)" />
      {BENCHES[props.persona]}
    </svg>
  );
}

const BENCHES: Record<PersonaId, React.ReactNode> = {
  // An anvil on a tree stump, hammer and tongs leaning on it, coals glowing at its foot.
  thoric: (
    <>
      <ellipse cx="96" cy="138" rx="44" ry="12" fill="url(#wb-ember-glow)" />
      <P d="M100 92H220L228 142H92Z" fill="url(#wb-stump)" />
      <L d="M112 98L108 138M134 98V140M160 100L162 140M188 98L192 140M208 96L214 138" op={0.45} />
      <P d="M96 92Q160 80 224 92Q160 104 96 92Z" fill="url(#wb-rings)" />
      <L
        d="M122 92Q160 85 198 92Q160 99 122 92ZM144 92Q160 89 176 92Q160 95 144 92Z"
        color="#8a5a2e"
        w={1.2}
        op={0.7}
      />
      <P d="M118 92L126 80H194L202 92Z" fill="url(#wb-iron)" />
      <P d="M136 80Q142 72 140 64H180Q178 72 184 80Z" fill="url(#wb-iron-side)" />
      <P
        d="M40 44Q80 40 104 44H238Q250 44 250 50V56Q250 62 238 62H200Q186 62 182 66H138Q134 62 120 62H108Q86 62 70 54Q54 48 40 44Z"
        fill="url(#wb-iron)"
      />
      <L d="M54 45Q84 41 106 45H242" color={SHINE} w={2.4} op={0.85} />
      <L d="M108 52H236" color="#2a2724" w={1.2} op={0.35} />
      <P d="M220 47H230V53H220Z" fill="#2a2724" w={1.2} />
      <circle cx="210" cy="50" r="2.4" fill="#2a2724" />
      <P d="M234 142L252 94L258 96L242 142Z" fill="url(#wb-wood)" w={1.6} />
      <P d="M240 98L248 78L274 88L266 106Z" fill="url(#wb-iron)" />
      <L d="M250 82L270 90" color={SHINE} w={1.4} op={0.7} />
      <P d="M64 142L70 124H96L102 142Z" fill="url(#wb-iron-side)" w={1.6} />
      <circle cx="76" cy="124" r="4" fill="#ff9a3a" />
      <circle cx="86" cy="122" r="3.4" fill="#ffd27a" />
      <circle cx="94" cy="125" r="3" fill="#ff6a1a" />
    </>
  ),
  // A stone altar with a violet runner, a glowing crescent and two candles.
  liora: (
    <>
      <ellipse cx="160" cy="104" rx="70" ry="44" fill="url(#wb-violet-glow)" />
      <P d="M86 66H234V140H86Z" fill="url(#wb-stone-side)" />
      <L
        d="M86 92H234M86 118H234M130 66V92M190 66V92M110 92V118M160 92V118M210 92V118M136 118V140M186 118V140"
        op={0.35}
      />
      <path
        d="M160 86A16 16 0 1 0 172 112A12 12 0 1 1 160 86Z"
        fill="#e6d0ff"
        stroke="#b36bff"
        strokeWidth="1.4"
      />
      <P d="M70 50H250L242 66H78Z" fill="url(#wb-stone)" />
      <L d="M76 51H244" color={SHINE} w={2} op={0.8} />
      <P d="M128 50H192V96L182 90L172 96L160 90L148 96L138 90L128 96Z" fill="url(#wb-silk)" />
      <L d="M140 54V88M180 54V88" color="#e2aa36" w={1.4} op={0.8} />
      <P d="M138 96V104M160 90V100M182 96V104" fill="none" w={1.2} />
      <Candle x={88} y={50} h={30} />
      <Candle x={232} y={50} h={22} />
      <Candle x={244} y={50} h={14} />
      <P d="M96 50L100 38L106 50Z" fill="#c89cff" w={1.2} />
      <P d="M210 50L214 40L218 50Z" fill="#c89cff" w={1.2} />
    </>
  ),
  // A heavy rune bench: thick planks, carved runes that glow, chisel, mallet and loose stones.
  nyssa: (
    <>
      <ellipse cx="160" cy="70" rx="110" ry="30" fill="url(#wb-green-glow)" />
      <P d="M62 72H78V140H62ZM242 72H258V140H242Z" fill="url(#wb-wood-side)" />
      <P d="M78 118H242V126H78Z" fill="url(#wb-wood)" w={1.6} />
      <P d="M40 50H280L272 74H48Z" fill="url(#wb-wood)" />
      <L d="M44 52H276" color={SHINE} w={2} op={0.6} />
      <L
        d="M52 60Q100 57 150 61T268 60M56 67Q120 64 180 68T266 67"
        color="#4e2e14"
        w={1.2}
        op={0.6}
      />
      <L d="M120 50V74M200 50V74" op={0.5} />
      {[82, 238].map((x) => (
        <g key={x}>
          <circle cx={x} cy="62" r="7" fill="#2e1a0a" stroke="#8fd06a" strokeWidth="1.4" />
          <L d={`M${x} ${57}V${67}M${x - 3} ${59}L${x + 3} ${63}`} color="#b8f08a" w={1.6} />
        </g>
      ))}
      <P d="M64 50Q64 40 76 40Q88 40 88 50Z" fill="url(#wb-iron)" w={1.6} />
      <L d="M76 43V48M73 45L79 46" color="#4a8a30" w={1.6} />
      <P d="M92 50Q92 44 100 44Q108 44 108 50Z" fill="url(#wb-iron)" w={1.4} />
      <P d="M214 34L248 22L252 30L218 42Z" fill="url(#wb-wood)" w={1.6} />
      <P d="M244 18L262 12L268 30L250 36Z" fill="url(#wb-wood-side)" w={1.6} />
      <P d="M222 50L246 44L248 48L224 54Z" fill="url(#wb-iron)" w={1.4} />
      <P d="M246 43L258 41L260 47L248 49Z" fill="url(#wb-wood)" w={1.4} />
    </>
  ),
  // A round gaming table: green felt, gold rim, fanned cards, coin stacks and a die.
  marisha: (
    <>
      <ellipse cx="160" cy="60" rx="140" ry="30" fill="url(#wb-gold-glow)" />
      <P d="M146 72H174L170 124H150Z" fill="url(#wb-wood-side)" />
      <P d="M110 140Q130 124 150 122H170Q190 124 210 140Z" fill="url(#wb-wood)" />
      <P d="M28 54Q28 74 160 78Q292 74 292 54V62Q292 84 160 88Q28 84 28 62Z" fill="url(#wb-wood)" />
      <P d="M28 54Q28 34 160 32Q292 34 292 54Q292 74 160 76Q28 74 28 54Z" fill="url(#wb-gold)" />
      <path
        d="M38 54Q38 39 160 37Q282 39 282 54Q282 69 160 71Q38 69 38 54Z"
        fill="url(#wb-felt)"
        stroke={INK}
        strokeWidth="1.2"
      />
      <L d="M60 46Q160 34 260 46" color="#7ac080" w={1.4} op={0.5} />
      <P d="M50 58L72 50L80 62L58 70Z" fill="url(#wb-card)" w={1.4} />
      <P d="M62 60L84 48L94 58L72 70Z" fill="url(#wb-card)" w={1.4} />
      <P d="M76 60L96 46L108 54L88 68Z" fill="url(#wb-card)" w={1.4} />
      <path d="M88 56l4 -3l3 4l-4 3Z" fill="#c8302a" />
      <P
        d="M232 58Q232 54 246 54Q260 54 260 58V64Q260 68 246 68Q232 68 232 64Z"
        fill="url(#wb-gold)"
        w={1.4}
      />
      <P
        d="M232 52Q232 48 246 48Q260 48 260 52V58Q260 62 246 62Q232 62 232 58Z"
        fill="url(#wb-gold)"
        w={1.4}
      />
      <P
        d="M232 46Q232 42 246 42Q260 42 260 46Q260 50 246 50Q232 50 232 46Z"
        fill="url(#wb-gold)"
        w={1.4}
      />
      <L d="M238 45H252" color={SHINE} w={1.2} op={0.8} />
      <P
        d="M262 64Q262 61 272 61Q282 61 282 64Q282 67 272 67Q262 67 262 64Z"
        fill="url(#wb-gold)"
        w={1.2}
      />
      <P d="M206 60L220 56L226 66L212 70Z" fill="url(#wb-card)" w={1.4} />
      <circle cx="214" cy="62" r="1.4" fill={INK} />
      <circle cx="219" cy="64" r="1.4" fill={INK} />
    </>
  ),
};

/**
 * The crafter's bench with the item on it. An item comes here by a click in the bag, a
 * right-click, or by dragging it over from the bag or the paperdoll.
 */
export function Workbench({
  ref,
  ...props
}: {
  persona: PersonaId;
  item: Item | undefined;
  onDrop: (itemId: string) => void;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const [over, setOver] = useState(false);
  const { item } = props;
  return (
    <div
      ref={ref}
      className={`workbench${over ? " over" : ""}${item ? ` ${rarityClass(item)}` : " empty"}`}
      aria-label={BENCH[props.persona]}
      onDragOver={(e) => {
        if (!dragging()) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const source = dragging();
        endDrag();
        if (source) props.onDrop(source.itemId);
      }}
    >
      <BenchArt persona={props.persona} />
      {item && (
        <span className="bench-item">
          <ItemArt baseId={item.baseId} slot={getBase(ITEM_CATALOG, item.baseId).slot} />
        </span>
      )}
    </div>
  );
}
