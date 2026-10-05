import { ITEM_CATALOG } from "@emberheir/content";

/**
 * Painted Rune stones: a dark stone with a carved, glowing glyph. Higher ranks glow hotter
 * (ash grey → moss green → ... → dusk violet), so the pouch reads at a glance.
 */

const GLYPHS: Record<string, string> = {
  ash: "M12 5v14M8 9l4-4 4 4",
  moss: "M12 19V9M12 13l-4-4M12 11l4-4M8 19h8",
  thorn: "M12 5v14M12 9l4 3-4 3",
  venom: "M8 6l4 6 4-6M12 12v7",
  ember: "M12 5c3 4 4 6 4 9a4 4 0 0 1-8 0c0-3 1-5 4-9zM12 13v4",
  rime: "M12 5v14M6 8.5l12 7M18 8.5l-12 7",
  volt: "M13 4l-5 9h4l-1 7 5-9h-4z",
  dusk: "M15 5a7 7 0 1 0 0 14 5.5 5.5 0 0 1 0-14z",
};

const GLOW: Record<string, string> = {
  ash: "#cfc6b8",
  moss: "#8fd06a",
  thorn: "#e05a5a",
  venom: "#b4e04a",
  ember: "#ff9a3a",
  rime: "#8fd4ff",
  volt: "#ffe35a",
  dusk: "#c18aff",
};

export function runeColor(runeId: string): string {
  return GLOW[runeId] ?? "#cfc6b8";
}

export function runeName(runeId: string): string {
  return ITEM_CATALOG.runes.get(runeId)?.name ?? runeId;
}

/** One Rune stone. `dim` shows an unknown or missing Rune. */
export function RuneStone(props: { runeId: string; size?: number; dim?: boolean }) {
  const size = props.size ?? 36;
  const color = runeColor(props.runeId);
  const glyph = GLYPHS[props.runeId] ?? "M12 6v12";
  return (
    <svg
      className={`rune-stone${props.dim ? " dim" : ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`rs-${props.runeId}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#6a6058" />
          <stop offset="0.6" stopColor="#3a332e" />
          <stop offset="1" stopColor="#1a1512" />
        </radialGradient>
      </defs>
      <path
        d="M12 1.5l8.5 4.2 1.8 8.6-5.6 7.3H7.3L1.7 14.3l1.8-8.6z"
        fill={`url(#rs-${props.runeId})`}
        stroke="#0c0a08"
        strokeWidth="0.8"
      />
      <path
        d={glyph}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: props.dim ? "none" : `drop-shadow(0 0 1.6px ${color})` }}
      />
    </svg>
  );
}

/** Sockets of an item as small holes, filled with their Runes' colors. */
export function SocketDots(props: { sockets: number; runes: readonly string[] }) {
  if (props.sockets <= 0) return null;
  return (
    <span className="socket-dots" aria-hidden="true">
      {Array.from({ length: props.sockets }, (_, i) => {
        const rune = props.runes[i];
        return (
          <span
            key={i}
            className={`socket-dot${rune ? " filled" : ""}`}
            style={
              rune
                ? { background: runeColor(rune), boxShadow: `0 0 5px ${runeColor(rune)}` }
                : undefined
            }
          />
        );
      })}
    </span>
  );
}
