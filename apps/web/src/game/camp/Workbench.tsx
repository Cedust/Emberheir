import { ITEM_CATALOG } from "@emberheir/content";
import { getBase, type Item } from "@emberheir/sim";
import { useState } from "react";
import altarUrl from "../../assets/benches/altar.webp";
import anvilUrl from "../../assets/benches/anvil.webp";
import crateUrl from "../../assets/benches/mystery-crate.webp";
import runeTableUrl from "../../assets/benches/rune-table.webp";
import { dragging, endDrag } from "../../ui/dragItems";
import { ItemArt } from "../../ui/ItemArt";
import { rarityClass } from "../../ui/items";
import type { PersonaId } from "./personaDefs";

/** Where each crafter works on an item (ui-ux-plan-v1.md 4.3). */
export const BENCH: Record<PersonaId, string> = {
  thoric: "Anvil",
  liora: "Altar",
  nyssa: "Rune Table",
  marisha: "Mystery Crate",
};

/** Timo's painted benches (tools/art/cut_benches.py): drawn size in stage px and `rest`, how high
 * above the bench's foot the item sits on its top face. */
const BENCH_ART: Record<PersonaId, { src: string; width: number; height: number; rest: number }> = {
  thoric: { src: anvilUrl, width: 230, height: 168, rest: 146 },
  liora: { src: altarUrl, width: 380, height: 159, rest: 106 },
  nyssa: { src: runeTableUrl, width: 390, height: 164, rest: 114 },
  marisha: { src: crateUrl, width: 360, height: 180, rest: 112 },
};

/** The painted bench, with whatever rests on it (`children`) standing on its top face. */
export function BenchArt(props: { persona: PersonaId; children?: React.ReactNode }) {
  const art = BENCH_ART[props.persona];
  return (
    <>
      <img
        className="bench-art"
        src={art.src}
        alt=""
        draggable={false}
        style={{ width: art.width, height: art.height, marginLeft: -art.width / 2 }}
      />
      {props.children && (
        <span className="bench-item" style={{ bottom: art.rest }}>
          {props.children}
        </span>
      )}
    </>
  );
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
      <BenchArt persona={props.persona}>
        {item && (
          <ItemArt
            baseId={item.baseId}
            uniqueId={item.uniqueId}
            slot={getBase(ITEM_CATALOG, item.baseId).slot}
          />
        )}
      </BenchArt>
    </div>
  );
}
