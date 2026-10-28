import { ITEM_CATALOG } from "@emberheir/content";
import {
  type EquipmentSlot,
  type Item,
  type ItemSlot,
  Rng,
  getBase,
  itemSize,
  rollItem,
  rollUnique,
} from "@emberheir/sim";
import { useState } from "react";
import { ItemArt } from "../ItemArt";
import { rarityClass } from "../ItemBody";
import { ItemGrid, ItemTile } from "../items";
import { DOLL } from "../Paperdoll";
import { HERO_SLOTS } from "../../game/character/HeroDoll";

/** Item slots in paperdoll order, each with the equipment slot whose frame it fills. */
const SLOTS: readonly { slot: ItemSlot; doll: EquipmentSlot; name: string }[] = [
  { slot: "offHand", doll: "offHand", name: "Off Hand" },
  { slot: "helm", doll: "helm", name: "Helm" },
  { slot: "body", doll: "body", name: "Body Armor" },
  { slot: "gloves", doll: "gloves", name: "Gloves" },
  { slot: "boots", doll: "boots", name: "Boots" },
  { slot: "belt", doll: "belt", name: "Belt" },
  { slot: "amulet", doll: "amulet", name: "Amulet" },
  { slot: "ring", doll: "ring1", name: "Ring" },
  { slot: "charm", doll: "charm", name: "Charm" },
];

/** Paperdoll scales in the game: Stash/Persona side doll and the loot cards' mini doll. */
const DOLL_SCALES = [0.85, 0.62] as const;

/**
 * `?uikit` Items page: every base and Unique in every frame it shows in (paperdoll slots at their
 * scales, Character screen, bag grid, tooltip art), to see at a glance that no icon leaves its
 * frame.
 */
export function ItemFramesPage() {
  const [items] = useState(demoItems);
  return (
    <div className="kit-items">
      {SLOTS.map((s) => {
        const list = items.filter((it) => getBase(ITEM_CATALOG, it.baseId).slot === s.slot);
        if (list.length === 0) return null;
        return (
          <section key={s.slot} className="kit-items-slot">
            <h3 className="kit-label">{s.name}</h3>
            <div className="kit-items-row">
              {list.map((item) => (
                <ItemFrames key={item.id} item={item} doll={s.doll} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ItemFrames(props: { item: Item; doll: EquipmentSlot }) {
  const { item } = props;
  const box = DOLL[props.doll];
  const hero = HERO_SLOTS[props.doll];
  const size = itemSize(item, ITEM_CATALOG);
  const base = getBase(ITEM_CATALOG, item.baseId);
  return (
    <figure className="kit-item" data-testid="kit-item">
      <div className="kit-item-frames">
        <ItemTile item={item} label={item.name} width={hero.w} height={hero.h} />
        {DOLL_SCALES.map((k) => (
          <ItemTile key={k} item={item} label={item.name} width={box.w * k} height={box.h * k} />
        ))}
        <ItemGrid
          placed={[{ item, x: 0, y: 0 }]}
          size={size}
          cell={42}
          selected={null}
          onSelect={() => {}}
          label={item.name}
        />
        <span className={`ib-art ${rarityClass(item)}`}>
          <ItemArt baseId={item.baseId} uniqueId={item.uniqueId} slot={base.slot} />
        </span>
      </div>
      <figcaption className="small">{item.uniqueId ?? item.baseId}</figcaption>
    </figure>
  );
}

/** One Rare of every wearable base, then every Unique. */
function demoItems(): Item[] {
  const rng = new Rng(7);
  const bases = [...ITEM_CATALOG.bases.values()].filter((b) => b.slot !== "mainHand");
  return [
    ...bases.map((b) =>
      rollItem(ITEM_CATALOG, { baseId: b.id, itemLevel: 40, rarity: "rare" }, rng),
    ),
    ...[...ITEM_CATALOG.uniques.keys()].map((id) => rollUnique(ITEM_CATALOG, id, 40, rng)),
  ];
}
