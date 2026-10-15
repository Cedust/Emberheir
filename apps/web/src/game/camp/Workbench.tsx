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

/** The bench under the item, drawn in code until Timo's painted benches arrive. */
function BenchArt(props: { persona: PersonaId }) {
  switch (props.persona) {
    case "thoric":
      return (
        <svg className="bench-art" viewBox="0 0 200 90" aria-hidden="true">
          <path
            d="M18 22 H150 Q186 22 194 8 Q190 40 150 44 H128 L118 60 H82 L72 44 H40 Q22 44 18 22 Z"
            fill="url(#ia-iron)"
          />
          <path d="M70 60 H130 L140 84 H60 Z" fill="#3a3632" />
          <path d="M22 24 H150" stroke="#e8e2d8" strokeOpacity="0.5" strokeWidth="2" />
        </svg>
      );
    case "liora":
      return (
        <svg className="bench-art" viewBox="0 0 200 90" aria-hidden="true">
          <path d="M30 34 H170 L162 48 H38 Z" fill="#cfc2e8" />
          <path d="M44 48 H156 V84 H44 Z" fill="#6a5a8a" />
          <path d="M60 56 H140 M60 68 H140" stroke="#b36bff" strokeOpacity="0.6" strokeWidth="2" />
          <path d="M34 34 V18 M166 34 V18" stroke="#efe6ff" strokeWidth="5" strokeLinecap="round" />
          <circle cx="34" cy="13" r="4" fill="#ffd27a" />
          <circle cx="166" cy="13" r="4" fill="#ffd27a" />
        </svg>
      );
    case "nyssa":
      return (
        <svg className="bench-art" viewBox="0 0 200 90" aria-hidden="true">
          <path d="M14 36 Q100 22 186 36 L178 54 Q100 44 22 54 Z" fill="#8a8072" />
          <path
            d="M40 52 L34 86 M160 52 L166 86"
            stroke="#4a2c14"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M60 40 l6 -6 l6 6 M96 36 v-6 M128 40 l6 -6 l6 6"
            stroke="#8fd06a"
            strokeWidth="2.5"
            fill="none"
          />
        </svg>
      );
    case "marisha":
      return (
        <svg className="bench-art" viewBox="0 0 200 90" aria-hidden="true">
          <ellipse cx="100" cy="40" rx="88" ry="16" fill="#2e5a34" />
          <path d="M12 40 Q100 66 188 40 V48 Q100 74 12 48 Z" fill="#5a3a1a" />
          <path
            d="M100 58 V86 M70 86 H130"
            stroke="#5a3a1a"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

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
      {item ? (
        <span className="bench-item">
          <ItemArt baseId={item.baseId} slot={getBase(ITEM_CATALOG, item.baseId).slot} />
        </span>
      ) : (
        <span className="bench-empty">Right-click or drag an item here</span>
      )}
    </div>
  );
}
