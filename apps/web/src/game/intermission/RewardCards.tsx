import { echoStageName, GAME_DATA } from "@emberheir/content";
import {
  type EquipmentSlot,
  type GameState,
  type Item,
  type RunState,
  equipBlockReason,
  getBase,
  itemSlotFor,
  PROGRESSION,
  SLOT_NAMES,
  takeBlockReason,
  targetSlot,
} from "@emberheir/sim";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "../../ui/Icon";
import { ItemArt } from "../../ui/ItemArt";
import { ItemDetail, ItemTile, rarityClass, RingSwitch } from "../../ui/items";
import { dollBox, Paperdoll } from "../../ui/Paperdoll";
import { preferredSlotFor, resetRingSlot, useRingSlot } from "../../ui/ringSlot";
import { runeName, RuneStone } from "../../ui/RuneArt";
import { type DropSound, playSound } from "../../ui/sound";
import { EQUIP_BLOCK_TEXT } from "../labels";
import type { GameApi } from "../useGame";
import { WeaponSlot } from "../WeaponSlot";
import { compareWithDummy } from "../../ui/itemCompare";

/** The rewards after a won fight: Rune drops, the item cards with their reveal, the worn gear. */

const TOP_RUNE_RANK = Math.max(...[...GAME_DATA.items.runes.values()].map((r) => r.rank));

const isHighRune = (id: string) =>
  (GAME_DATA.items.runes.get(id)?.rank ?? 0) > TOP_RUNE_RANK - PROGRESSION.highRuneRanks;

/** Runes fall onto the ground with a glowing glyph and a clink before they go to the pouch. */
export function RuneDrops(props: { runes: readonly string[] }) {
  useEffect(() => {
    const timers = props.runes.map((id, i) =>
      window.setTimeout(
        () => playSound(isHighRune(id) ? "highRune" : "rune"),
        (0.2 + i * 0.25) * 1000 + 350,
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [props.runes]);
  return (
    <div className="rune-drops" data-testid="rune-drops">
      {props.runes.map((id, i) => (
        <span
          key={i}
          className={`rune-drop${isHighRune(id) ? " high" : ""}`}
          style={{ animationDelay: `${0.2 + i * 0.25}s` }}
        >
          <span className="rune-glyph-glow" aria-hidden />
          <RuneStone runeId={id} size={40} />
          <span className="title-font">{runeName(id)} Rune</span>
        </span>
      ))}
    </div>
  );
}

/** Pause after a card turns over, by what it shows (Teil 3 D: ab Rare Glow und Pause). */
function revealPause(item: Item): number {
  if (item.uniqueId) return 1300;
  if (item.rarity === "legendary") return 1000;
  if (item.rarity === "rare" || item.rarity === "epic") return 550;
  return 170;
}

function revealSound(item: Item): DropSound {
  if (item.uniqueId) return "unique";
  if (item.rarity === "legendary") return "legendary";
  if (item.rarity === "rare" || item.rarity === "epic") return "rare";
  return "flip";
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Loot cards lie face down and turn over one by one: Normal and Magic quickly, Rare and Epic with
 * a glow and a pause, Legendary and Unique with a pillar of light. A click turns a card at once.
 */
function useReveal(items: readonly Item[]): [readonly boolean[], (i: number) => void] {
  const [shown, setShown] = useState<boolean[]>(() => items.map(() => reducedMotion()));
  const reveal = useCallback(
    (i: number) => {
      if (shown[i]) return;
      const item = items[i];
      if (item) playSound(revealSound(item));
      setShown((cur) => cur.map((v, j) => v || j === i));
    },
    [items, shown],
  );
  useEffect(() => {
    const next = shown.indexOf(false);
    if (next < 0) return;
    const before = shown.lastIndexOf(true, next);
    const prev = before >= 0 ? items[before] : undefined;
    const timer = window.setTimeout(() => reveal(next), prev ? revealPause(prev) : 250);
    return () => window.clearTimeout(timer);
  }, [shown, items, reveal]);
  return [shown, reveal];
}

/** Equip / Take for one loot card, or the "Taken" stamp in the Boss Hoard. */
function PickButtons(props: {
  state: GameState;
  game: GameApi;
  item: Item;
  index: number;
  taken: boolean;
}) {
  const { state, game, item, index } = props;
  useRingSlot();
  if (props.taken) {
    return (
      <div className="card-buttons">
        <span className="taken-stamp title-font">Taken</span>
      </div>
    );
  }
  const ring = preferredSlotFor(item);
  const equipReason = equipBlockReason(state, GAME_DATA, item, "pick", ring);
  const takeReason = takeBlockReason(state, GAME_DATA, item);
  return (
    <div className="card-buttons">
      <RingSwitch state={state} item={item} />
      <button
        type="button"
        className="btn primary"
        disabled={equipReason !== undefined}
        title={
          equipReason
            ? EQUIP_BLOCK_TEXT[equipReason]
            : "Swap in, the old item goes to the inventory"
        }
        onClick={() => {
          game.dispatch({
            type: "pickItem",
            index,
            mode: "equip",
            ...(ring ? { slot: ring } : {}),
          });
          resetRingSlot();
        }}
      >
        {equipReason === "noRoom" ? "No room" : "Equip"}
      </button>
      <button
        type="button"
        className="btn"
        disabled={takeReason !== undefined}
        title={takeReason ? "This item does not fit into the inventory" : "Put into inventory"}
        onClick={() => game.dispatch({ type: "pickItem", index, mode: "take" })}
      >
        {takeReason ? "No room" : "Take"}
      </button>
    </div>
  );
}

function CardBack(props: { item: Item; small?: boolean; onReveal: () => void }) {
  const { item } = props;
  return (
    <button
      type="button"
      className={`card-back rarity-${item.rarity}${item.uniqueId ? " special-unique" : ""}`}
      data-testid="card-back"
      aria-label="Turn the card over"
      onClick={props.onReveal}
    >
      <span className="card-back-sigil">
        <Icon name="fire" size={props.small ? 34 : 56} color="currentColor" />
      </span>
    </button>
  );
}

function TrophyToast(props: { item: Item }) {
  const { item } = props;
  return (
    <div className="trophy-toast" role="status">
      <span className="trophy-toast-art">
        <ItemArt baseId={item.baseId} slot={getBase(GAME_DATA.items, item.baseId).slot} />
      </span>
      <span className="eyebrow">NEW TROPHY</span>
      <span className="title-font">{item.name}</span>
    </div>
  );
}

/** The act boss left its Echo (Weapon Mastery): it is worn on the weapon at once. */
function EchoToast(props: { echo: { readonly id: string; readonly stage: number } }) {
  const def = GAME_DATA.echoes.find((e) => e.id === props.echo.id);
  if (!def) return null;
  const color = `#${def.color.toString(16).padStart(6, "0")}`;
  return (
    <div
      className="trophy-toast echo-toast"
      role="status"
      style={{ borderColor: color, boxShadow: `0 0 32px ${color}` }}
    >
      <span className="echo-orb" style={{ background: color, boxShadow: `0 0 18px ${color}` }} />
      <span className="eyebrow">{props.echo.stage > 1 ? "ECHO GROWS" : "NEW ECHO"}</span>
      <span className="title-font">
        {def.name} {echoStageName(props.echo.stage)}
      </span>
    </div>
  );
}

export function ItemCards(props: {
  state: GameState;
  run: RunState;
  game: GameApi;
  onFocus: (slot: EquipmentSlot | undefined) => void;
}) {
  const { state, run, game } = props;
  const rewards = run.rewards;
  const items = rewards?.items ?? [];
  const [shown, reveal] = useReveal(items);
  const [selected, setSelected] = useState<number | undefined>(undefined);
  if (!rewards) return null;
  const taken = new Set((rewards.taken ?? []).map((t) => t.index));
  const trophy = items.find(
    (it, i) => shown[i] && it.uniqueId && rewards.newTrophies?.includes(it.uniqueId),
  );
  const focus = (item: Item) => props.onFocus(targetSlot(item, GAME_DATA, state.hero.equipment));

  if (items.length > 3) {
    // Boss Hoard (six cards) or the Ember Thief's sack (four): small faces, the chosen one in full.
    const firstOpen = items.findIndex((_, i) => shown[i] && !taken.has(i));
    const pick = selected !== undefined && shown[selected] ? selected : firstOpen;
    const detail = pick >= 0 ? items[pick] : undefined;
    return (
      <div className="hoard-layout">
        {trophy && <TrophyToast item={trophy} />}
        {rewards.echo && <EchoToast echo={rewards.echo} />}
        <div className={`hoard-cards${items.length <= 4 ? " two" : ""}`}>
          {items.map((item, i) =>
            shown[i] ? (
              <button
                key={item.id}
                type="button"
                className={`hoard-face ${rarityClass(item)}${item.rarity === "legendary" ? " pillar" : ""}${taken.has(i) ? " taken" : ""}${pick === i ? " on" : ""}`}
                aria-pressed={pick === i}
                data-testid="hoard-card"
                onClick={() => {
                  setSelected(i);
                  focus(item);
                }}
              >
                {item.rarity === "legendary" && <span className="light-pillar" aria-hidden />}
                <span className="hoard-art">
                  <ItemArt baseId={item.baseId} slot={getBase(GAME_DATA.items, item.baseId).slot} />
                </span>
                <span className="title-font rarity-text hoard-name">{item.name}</span>
                <span className="sub small">
                  {SLOT_NAMES[getBase(GAME_DATA.items, item.baseId).slot]}
                </span>
                {taken.has(i) && <span className="taken-stamp title-font">Taken</span>}
              </button>
            ) : (
              <div key={item.id} className="hoard-back">
                <CardBack item={item} small onReveal={() => reveal(i)} />
              </div>
            ),
          )}
        </div>
        <div className="hoard-detail">
          {detail && pick >= 0 ? (
            <ItemDetail
              item={detail}
              heroAttributes={state.hero.attributes}
              heroLevel={state.hero.level}
              compare={taken.has(pick) ? undefined : compareWithDummy(state, detail)}
              className="loot-card"
              testId="item-card"
              footer={
                <PickButtons
                  state={state}
                  game={game}
                  item={detail}
                  index={pick}
                  taken={taken.has(pick)}
                />
              }
            />
          ) : (
            <div className="hoard-wait sub">…</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="loot-cards">
      {trophy && <TrophyToast item={trophy} />}
      {items.map((item, i) => {
        if (!shown[i]) {
          return (
            <div key={item.id} className="loot-card-wrap">
              <CardBack item={item} onReveal={() => reveal(i)} />
            </div>
          );
        }
        const big = item.rarity === "legendary";
        return (
          <div
            key={item.id}
            className={`loot-card-wrap revealed${big ? " pillar" : ""}`}
            onMouseEnter={() => focus(item)}
            onFocus={() => focus(item)}
          >
            {big && <span className="light-pillar" aria-hidden />}
            <ItemDetail
              item={item}
              heroAttributes={state.hero.attributes}
              heroLevel={state.hero.level}
              compare={compareWithDummy(state, item)}
              className="loot-card"
              testId="item-card"
              footer={<PickButtons state={state} game={game} item={item} index={i} taken={false} />}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Scale of the Character paperdoll in the Equipped column. */
const MINI_DOLL = 0.62;

/**
 * Equipped gear next to the item pick (playtest feedback): a small paperdoll and the details of
 * the item in the slot the hovered loot card would replace, so comparing needs no Character view.
 */
export function EquippedPanel(props: {
  state: GameState;
  focus: EquipmentSlot | undefined;
  onFocus: (slot: EquipmentSlot) => void;
  inventoryFull: boolean;
  onInventory: () => void;
}) {
  const { state, focus } = props;
  const equipped = focus ? state.hero.equipment[focus] : undefined;
  return (
    <aside className="intermission-right" aria-label="Equipped">
      <span className="eyebrow">Equipped</span>
      <Paperdoll scale={MINI_DOLL} className="mini">
        <WeaponSlot state={state} scale={MINI_DOLL} />
        {GAME_DATA.equipmentSlots.map((slot) => {
          const pos = dollBox(slot, MINI_DOLL);
          return (
            <div
              key={slot}
              className={`doll-slot${slot === focus ? " focused" : ""}`}
              style={{ left: pos.x, top: pos.y }}
            >
              <ItemTile
                item={state.hero.equipment[slot]}
                label={SLOT_NAMES[itemSlotFor(slot)]}
                width={pos.w}
                height={pos.h}
                selected={slot === focus}
                onSelect={() => props.onFocus(slot)}
              />
            </div>
          );
        })}
      </Paperdoll>
      {equipped ? (
        <ItemDetail
          item={equipped}
          heroAttributes={state.hero.attributes}
          heroLevel={state.hero.level}
          where="EQUIPPED"
          className="equipped-detail"
          testId="equipped-detail"
        />
      ) : (
        focus && <p className="sub small equipped-hint">Empty slot</p>
      )}
      <div className="grow" />
      <button
        type="button"
        className={`btn inventory-button${props.inventoryFull ? " inv-full" : ""}`}
        onClick={props.onInventory}
      >
        <Icon name="inventory" size={16} />
        {props.inventoryFull ? "Inventory full" : "Open Inventory"} · {state.inventory.length}
      </button>
    </aside>
  );
}
