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
export const HERO_H = 604;

/**
 * Diablo IV's character screen (ui-ux-plan-v1.md 4.2): the painted Heir in the middle, armor
 * down the left, jewelry down the right, weapon, Belt and off hand at the feet.
 */
export const HERO_SLOTS: Readonly<Record<EquipmentSlot, DollBox>> = {
  helm: { x: 10, y: 8, w: 96, h: 96 },
  body: { x: 10, y: 120, w: 96, h: 140 },
  gloves: { x: 10, y: 276, w: 96, h: 96 },
  boots: { x: 10, y: 388, w: 96, h: 96 },
  amulet: { x: 454, y: 8, w: 96, h: 96 },
  ring1: { x: 454, y: 134, w: 96, h: 96 },
  ring2: { x: 454, y: 260, w: 96, h: 96 },
  charm: { x: 454, y: 388, w: 96, h: 96 },
  offHand: { x: 340, y: 500, w: 112, h: 104 },
  belt: { x: 232, y: 520, w: 96, h: 64 },
};
const WEAPON: DollBox = { x: 108, y: 500, w: 112, h: 104 };

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
