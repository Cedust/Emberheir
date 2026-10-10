import { GAME_DATA } from "@emberheir/content";
import {
  type EquipmentSlot,
  type GameState,
  type Item,
  PROGRESSION,
  SLOT_NAMES,
  equipBlockReason,
  itemSlotFor,
  moveBlockReason,
  unequipBlockReason,
} from "@emberheir/sim";
import { type MouseEvent, useState } from "react";
import { Icon } from "../../ui/Icon";
import {
  ItemDetail,
  ItemGrid,
  ItemTile,
  RingSwitch,
  compareWithEquipped,
  fmt,
  walletEntries,
} from "../../ui/items";
import { aimedSlot, preferredSlotFor, resetRingSlot, useRingSlot } from "../../ui/ringSlot";
import { itemDrops } from "../itemDrops";
import { EQUIP_BLOCK_TEXT, MOVE_BLOCK_TEXT, UNEQUIP_BLOCK_TEXT } from "../labels";
import type { GameApi } from "../useGame";
import { Paperdoll, dollBox } from "../../ui/Paperdoll";
import { WeaponSlot } from "../WeaponSlot";

/** Scale of the paperdoll next to the inventory. */
const SIDE_DOLL = 0.85;

type Where = "equipped" | "inventory" | "stash";

function locate(
  state: GameState,
  itemId: string | null,
): { item: Item; where: Where; slot?: EquipmentSlot } | undefined {
  if (!itemId) return undefined;
  for (const [slot, item] of Object.entries(state.hero.equipment)) {
    if (item?.id === itemId) return { item, where: "equipped", slot: slot as EquipmentSlot };
  }
  const inv = state.inventory.find((p) => p.item.id === itemId);
  if (inv) return { item: inv.item, where: "inventory" };
  const st = state.stash.find((p) => p.item.id === itemId);
  return st ? { item: st.item, where: "stash" } : undefined;
}

/** The Supply Wagon (Stash mock): equipped + inventory, the 10×10 stash, item detail. */
export function StashView(props: { state: GameState; game: GameApi; onClose: () => void }) {
  const { state, game } = props;
  const [selected, setSelected] = useState<string | null>(null);
  const sel = locate(state, selected);
  useRingSlot();
  const drops = itemDrops(state, game);

  const move = (itemId: string, to: "inventory" | "stash") =>
    game.dispatch({ type: "moveItem", itemId, to });

  // Ctrl+Click moves an item straight across.
  const pick = (from: "inventory" | "stash") => (itemId: string, e?: MouseEvent) => {
    if (e?.ctrlKey || e?.metaKey) {
      const to = from === "inventory" ? "stash" : "inventory";
      if (!moveBlockReason(state, GAME_DATA, itemId, to)) move(itemId, to);
      return;
    }
    setSelected(itemId);
  };

  const buttons: {
    label: string;
    block?: string | undefined;
    run: () => void;
    primary?: boolean;
  }[] = [];
  if (sel) {
    if (sel.where === "inventory") {
      const r = moveBlockReason(state, GAME_DATA, sel.item.id, "stash");
      buttons.push({
        label: "Move to Stash",
        block: r ? MOVE_BLOCK_TEXT[r] : undefined,
        run: () => move(sel.item.id, "stash"),
        primary: true,
      });
    }
    if (sel.where === "stash") {
      const r = moveBlockReason(state, GAME_DATA, sel.item.id, "inventory");
      buttons.push({
        label: "Move to Inventory",
        block: r ? MOVE_BLOCK_TEXT[r] : undefined,
        run: () => move(sel.item.id, "inventory"),
        primary: true,
      });
    }
    if (sel.where !== "equipped") {
      const ring = preferredSlotFor(sel.item);
      const r = equipBlockReason(state, GAME_DATA, sel.item, sel.where, ring);
      buttons.push({
        label: "Equip",
        block: r ? EQUIP_BLOCK_TEXT[r] : undefined,
        run: () => {
          game.dispatch({ type: "equip", itemId: sel.item.id, ...(ring ? { slot: ring } : {}) });
          resetRingSlot();
        },
      });
    } else if (sel.slot) {
      const slot = sel.slot;
      const r = unequipBlockReason(state, GAME_DATA, slot);
      buttons.push({
        label: "Unequip",
        block: r ? UNEQUIP_BLOCK_TEXT[r] : undefined,
        run: () => game.dispatch({ type: "unequip", slot }),
      });
    }
  }
  const whereText = { equipped: "EQUIPPED", inventory: "INVENTORY", stash: "STASH" };

  return (
    <section className="screen stash-view" aria-label="Supply Wagon">
      <header className="persona-header bar-top">
        <div className="run-title">
          <span className="title-font">SUPPLY WAGON</span>
          <span className="sub">Stash</span>
        </div>
        <div className="grow" />
        <div className="wallet-row small-wallet">
          {walletEntries(state).map((w) => (
            <span key={w.key} className={`w-${w.key}`}>
              <b className="mono">{fmt(w.value)}</b> <span className="sub">{w.name}</span>
            </span>
          ))}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Back to Camp"
          title="Back to Camp (Esc)"
          onClick={props.onClose}
        >
          <Icon name="close" size={20} />
        </button>
      </header>
      <div className="stash-body">
        <aside className="stash-left">
          <span className="title-font section-title">Equipped</span>
          <Paperdoll scale={SIDE_DOLL} className="side">
            <WeaponSlot state={state} scale={SIDE_DOLL} />
            {GAME_DATA.equipmentSlots.map((slot) => {
              const it = state.hero.equipment[slot];
              const pos = dollBox(slot, SIDE_DOLL);
              return (
                <div key={slot} className="doll-slot" style={{ left: pos.x, top: pos.y }}>
                  <ItemTile
                    item={it}
                    label={SLOT_NAMES[itemSlotFor(slot)]}
                    width={pos.w}
                    height={pos.h}
                    selected={!!it && it.id === selected}
                    aimed={
                      !!sel &&
                      sel.where !== "equipped" &&
                      slot.startsWith("ring") &&
                      aimedSlot(state, sel.item) === slot
                    }
                    drag={drops.slot(slot)}
                    {...(it ? { onSelect: () => setSelected(it.id) } : {})}
                  />
                </div>
              );
            })}
          </Paperdoll>
          <div className="section-row">
            <span className="title-font section-title">Inventory</span>
            <span className="mono sub">{state.inventory.length} items</span>
          </div>
          <ItemGrid
            placed={state.inventory}
            size={{ w: PROGRESSION.inventoryWidth, h: PROGRESSION.inventoryHeight }}
            cell={38}
            selected={selected}
            onSelect={pick("inventory")}
            label="Inventory"
            drop={drops.grid("inventory")}
          />
        </aside>
        <main className="stash-center">
          <div className="section-row">
            <span
              className="title-font section-title"
              title="The Supply Wagon is shared by all your Heirs."
            >
              Stash · shared
            </span>
            <span className="mono sub">{state.stash.length} items</span>
          </div>
          <ItemGrid
            placed={state.stash}
            size={{ w: PROGRESSION.stashWidth, h: PROGRESSION.stashHeight }}
            cell={52}
            selected={selected}
            onSelect={pick("stash")}
            label="Stash"
            drop={drops.grid("stash")}
          />
          <div className="section-row">
            <button
              type="button"
              className="btn"
              onClick={() => game.dispatch({ type: "sortStash" })}
            >
              <Icon name="cycle" size={16} />
              Sort
            </button>
          </div>
        </main>
        <aside className="stash-right">
          {sel ? (
            <ItemDetail
              item={sel.item}
              heroAttributes={state.hero.attributes}
              heroLevel={state.hero.level}
              where={whereText[sel.where]}
              compare={sel.where === "equipped" ? undefined : compareWithEquipped(state, sel.item)}
              footer={
                <div className="detail-buttons">
                  {sel.where !== "equipped" && <RingSwitch state={state} item={sel.item} />}
                  {buttons.map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      className={`btn ${b.primary ? "primary" : ""}`}
                      disabled={!!b.block}
                      title={b.block}
                      onClick={b.run}
                    >
                      {b.label}
                    </button>
                  ))}
                  {buttons.find((b) => b.block) && (
                    <span className="block warn">{buttons.find((b) => b.block)?.block}</span>
                  )}
                </div>
              }
            />
          ) : (
            <div className="empty-pick panel-card sub">Pick an item to see it here.</div>
          )}
        </aside>
      </div>
    </section>
  );
}
