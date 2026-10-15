import { GAME_DATA } from "@emberheir/content";
import {
  type EquipmentSlot,
  type GameState,
  type Item,
  PROGRESSION,
  SLOT_NAMES,
  STASH_TABS,
  itemSlotFor,
  moveBlockReason,
  stashTab,
  unequipBlockReason,
} from "@emberheir/sim";
import { type MouseEvent, useState } from "react";
import { Button } from "../../ui/kit/Button";
import { type GridContext, ItemGrid, ItemTile } from "../../ui/items";
import { Wallet } from "../../ui/kit/Currency";
import {
  Medallion,
  type TabItem,
  Tabs,
  Window,
  WindowHeader,
  WindowLayer,
} from "../../ui/kit/Window";
import { aimedSlot, useRingSlot } from "../../ui/ringSlot";
import { itemDrops } from "../itemDrops";
import type { GameApi } from "../useGame";
import { Paperdoll, dollBox } from "../../ui/Paperdoll";
import { WeaponSlot } from "../WeaponSlot";

/** Scale of the paperdoll next to the inventory. */
const SIDE_DOLL = 0.85;

type Where = "equipped" | "inventory" | "stash";

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const TAB_IDS = Array.from({ length: STASH_TABS }, (_, i) => String(i));
/** The open stash tab; the wagon opens on it again. */
let openTab = 0;

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

/**
 * The Supply Wagon (PoE layout): the big shared stash left, paperdoll and bag right. Items show
 * their details on hover; right-click, Ctrl+Click or dragging moves them.
 */
export function StashView(props: { state: GameState; game: GameApi; onClose: () => void }) {
  const { state, game } = props;
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTabState] = useState(Math.min(openTab, STASH_TABS - 1));
  const setTab = (t: number) => {
    openTab = t;
    setTabState(t);
  };
  const sel = locate(state, selected);
  useRingSlot();
  const drops = itemDrops(state, game);
  const shown = stashTab(state.stash, tab);
  const tabs: TabItem<string>[] = TAB_IDS.map((id, i) => ({
    id,
    name: NUMERALS[i] ?? String(i + 1),
  }));

  const move = (itemId: string, to: "inventory" | "stash") =>
    game.dispatch({ type: "moveItem", itemId, to, ...(to === "stash" ? { tab } : {}) });
  const canMove = (itemId: string, to: "inventory" | "stash") =>
    !moveBlockReason(state, GAME_DATA, itemId, to, to === "stash" ? tab : undefined);

  // Ctrl+Click moves an item straight across; a plain click marks it.
  const pick = (from: "inventory" | "stash") => (itemId: string, e?: MouseEvent) => {
    const to = from === "inventory" ? "stash" : "inventory";
    if ((e?.ctrlKey || e?.metaKey) && canMove(itemId, to)) {
      move(itemId, to);
      return;
    }
    setSelected(itemId);
  };
  // Right-click: across to the other side.
  const across = (to: "inventory" | "stash"): GridContext => ({
    action: (item) =>
      canMove(item.id, to) ? (to === "stash" ? "Move to Stash" : "Move to Inventory") : undefined,
    run: (item) => {
      if (canMove(item.id, to)) move(item.id, to);
    },
  });

  return (
    <WindowLayer>
      <Window
        label="Supply Wagon"
        className="stash-view"
        header={
          <WindowHeader
            title="Supply Wagon"
            sub="Stash"
            medallion={<Medallion icon="box" tint="#5a4218" />}
            right={<Wallet state={state} />}
            onClose={props.onClose}
          />
        }
      >
        <div className="stash-body">
          <main className="stash-center">
            <div className="stash-pane">
              <div className="section-row stash-tabs">
                <Tabs
                  items={tabs}
                  active={String(tab)}
                  onChange={(id) => setTab(Number(id))}
                  onDragHover={(id) => setTab(Number(id))}
                  label="Stash tabs"
                />
                <div className="grow" />
                <Button
                  variant="ghost"
                  icon="cycle"
                  onClick={() => game.dispatch({ type: "sortStash", tab })}
                >
                  Sort
                </Button>
              </div>
              <ItemGrid
                key={tab}
                placed={shown}
                size={{ w: PROGRESSION.stashWidth, h: PROGRESSION.stashHeight }}
                cell={66}
                selected={selected}
                onSelect={pick("stash")}
                label="Stash"
                drop={drops.grid("stash", tab)}
                context={across("inventory")}
              />
            </div>
          </main>
          <aside className="stash-bag">
            <span className="title-font section-title">Equipped</span>
            <Paperdoll scale={SIDE_DOLL} className="side">
              <WeaponSlot state={state} scale={SIDE_DOLL} />
              {GAME_DATA.equipmentSlots.map((slot) => {
                const it = state.hero.equipment[slot];
                const pos = dollBox(slot, SIDE_DOLL);
                const off = unequipBlockReason(state, GAME_DATA, slot);
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
                      context={
                        it && !off
                          ? {
                              action: "Unequip",
                              run: () => game.dispatch({ type: "unequip", slot }),
                            }
                          : undefined
                      }
                    />
                  </div>
                );
              })}
            </Paperdoll>
            <div className="section-row">
              <span className="title-font section-title">Inventory</span>
              <span className="mono sub">
                {state.inventory.length} item{state.inventory.length === 1 ? "" : "s"}
              </span>
            </div>
            <ItemGrid
              placed={state.inventory}
              size={{ w: PROGRESSION.inventoryWidth, h: PROGRESSION.inventoryHeight }}
              cell={42}
              selected={selected}
              onSelect={pick("inventory")}
              label="Inventory"
              drop={drops.grid("inventory")}
              context={across("stash")}
            />
          </aside>
        </div>
      </Window>
    </WindowLayer>
  );
}
