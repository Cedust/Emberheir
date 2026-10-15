import { GAME_DATA } from "@emberheir/content";
import {
  type EquipmentSlot,
  type GameState,
  type Item,
  SLOT_NAMES,
  itemSlotFor,
} from "@emberheir/sim";
import heirUrl from "../../assets/camp/heir-camp.webp";
import { ItemTile } from "../../ui/items";
import type { DollBox } from "../../ui/Paperdoll";
import type { DragSource, SlotDrop } from "../../ui/dragItems";
import { WeaponSlot } from "../WeaponSlot";

/** Size of the hero stage in stage pixels. */
export const HERO_W = 560;
export const HERO_H = 520;

/**
 * Diablo IV's character screen (ui-ux-plan-v1.md 4.2): the painted Heir in the middle, armor
 * down the left, jewelry down the right, weapon, Belt and off hand at the feet.
 */
const HERO_SLOTS: Readonly<Record<EquipmentSlot, DollBox>> = {
  helm: { x: 16, y: 4, w: 88, h: 88 },
  body: { x: 16, y: 102, w: 88, h: 124 },
  gloves: { x: 16, y: 236, w: 88, h: 88 },
  boots: { x: 16, y: 334, w: 88, h: 88 },
  amulet: { x: 456, y: 4, w: 88, h: 88 },
  ring1: { x: 456, y: 114, w: 88, h: 88 },
  ring2: { x: 456, y: 224, w: 88, h: 88 },
  charm: { x: 456, y: 334, w: 88, h: 88 },
  offHand: { x: 336, y: 424, w: 104, h: 96 },
  belt: { x: 236, y: 442, w: 88, h: 60 },
};
const WEAPON: DollBox = { x: 120, y: 424, w: 104, h: 96 };

export interface HeroSlotProps {
  readonly selected: boolean;
  readonly inactive: boolean;
  readonly aimed: boolean;
  readonly drag?: { readonly source: DragSource | undefined; readonly drop: SlotDrop } | undefined;
  readonly onSelect?: (() => void) | undefined;
  readonly context?: { readonly action: string; readonly run: () => void } | undefined;
}

export function HeroDoll(props: {
  state: GameState;
  slot: (slot: EquipmentSlot, item: Item | undefined) => HeroSlotProps;
}) {
  const { state } = props;
  return (
    <div className="hero-doll" style={{ width: HERO_W, height: HERO_H }}>
      <span className="hero-glow" aria-hidden="true" />
      <img className="hero-figure" src={heirUrl} alt="" aria-hidden="true" />
      <WeaponSlot state={state} box={WEAPON} />
      {GAME_DATA.equipmentSlots.map((slot) => {
        const pos = HERO_SLOTS[slot];
        const it = state.hero.equipment[slot];
        const p = props.slot(slot, it);
        return (
          <div key={slot} className="doll-slot" style={{ left: pos.x, top: pos.y }}>
            <ItemTile
              item={it}
              label={SLOT_NAMES[itemSlotFor(slot)]}
              width={pos.w}
              height={pos.h}
              selected={p.selected}
              inactive={p.inactive}
              aimed={p.aimed}
              {...(p.drag ? { drag: p.drag } : {})}
              {...(p.onSelect ? { onSelect: p.onSelect } : {})}
              context={p.context}
            />
          </div>
        );
      })}
    </div>
  );
}
