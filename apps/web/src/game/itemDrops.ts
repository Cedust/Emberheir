import { GAME_DATA } from "@emberheir/content";
import {
  type EquipmentSlot,
  type GameState,
  type GridPosition,
  INVENTORY_SIZE,
  type Item,
  STASH_SIZE,
  equipBlockReason,
  itemSize,
  placeAt,
  stashTab,
  unequipBlockReason,
} from "@emberheir/sim";
import type { DragSource, GridDrop, SlotDrop } from "../ui/dragItems";
import { resetRingSlot } from "../ui/ringSlot";
import type { GameApi } from "./useGame";

function itemOf(state: GameState, source: DragSource): Item | undefined {
  if (source.kind === "slot") return state.hero.equipment[source.slot];
  const grid = source.grid === "stash" ? state.stash : state.inventory;
  return grid.find((p) => p.item.id === source.itemId)?.item;
}

/**
 * Drag & drop between the inventory, the stash and the equipment slots. Every drop is checked
 * against the same rules as the buttons; the sim decides.
 */
export function itemDrops(
  state: GameState,
  game: GameApi,
): {
  grid: (grid: "inventory" | "stash", tab?: number) => GridDrop;
  slot: (slot: EquipmentSlot) => { source: DragSource | undefined; drop: SlotDrop };
} {
  const inFight = state.run?.phase === "fight";
  // The stash shows one tab at a time (`tab`); drops land in that tab.
  const grid = (target: "inventory" | "stash", tab = 0): GridDrop => {
    const placed = target === "stash" ? stashTab(state.stash, tab) : state.inventory;
    const size = target === "stash" ? STASH_SIZE : INVENTORY_SIZE;
    const fits = (item: Item, at: GridPosition) =>
      !!placeAt(placed, item, at.x, at.y, GAME_DATA.items, size);
    return {
      grid: target,
      canDrop: (source, at) => {
        const item = itemOf(state, source);
        if (!item || inFight) return false;
        if (source.kind === "slot") {
          if (target !== "inventory") return false;
          const reason = unequipBlockReason(state, GAME_DATA, source.slot);
          return (reason === undefined || reason === "noRoom") && fits(item, at);
        }
        if (source.grid !== target) {
          if (state.run) return false;
        }
        return fits(item, at);
      },
      onDrop: (source, at) => {
        if (source.kind === "slot") {
          game.dispatch({ type: "unequip", slot: source.slot, at });
        } else if (source.grid === target) {
          game.dispatch({
            type: "placeItem",
            itemId: source.itemId,
            at,
            ...(target === "stash" ? { tab } : {}),
          });
        } else {
          game.dispatch({
            type: "moveItem",
            itemId: source.itemId,
            to: target,
            at,
            ...(target === "stash" ? { tab } : {}),
          });
        }
      },
    };
  };
  const drop = (target: EquipmentSlot): SlotDrop => ({
    canDrop: (source) => {
      const item = itemOf(state, source);
      if (!item || source.kind === "slot") return false;
      return equipBlockReason(state, GAME_DATA, item, source.grid, target) === undefined;
    },
    onDrop: (source) => {
      game.dispatch({ type: "equip", itemId: source.itemId, slot: target });
      resetRingSlot();
    },
  });
  const slot = (target: EquipmentSlot) => {
    const item = state.hero.equipment[target];
    const source: DragSource | undefined =
      item && !inFight
        ? { kind: "slot", slot: target, itemId: item.id, size: itemSize(item, GAME_DATA.items) }
        : undefined;
    return { source, drop: drop(target) };
  };
  return { grid, slot };
}
