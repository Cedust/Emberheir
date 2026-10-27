import { GAME_DATA } from "@emberheir/content";
import {
  type EquipmentSlot,
  type GameState,
  type Item,
  type RunState,
  equipBlockReason,
  getBase,
  itemSlotFor,
  SLOT_NAMES,
  takeBlockReason,
  targetSlot,
} from "@emberheir/sim";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "../../ui/Icon";
import { Button } from "../../ui/kit/Button";
import { ItemArt } from "../../ui/ItemArt";
import { ItemDetail, ItemTile, rarityClass, RingSwitch } from "../../ui/items";
import { dollBox, Paperdoll } from "../../ui/Paperdoll";
import { preferredSlotFor, resetRingSlot, useRingSlot } from "../../ui/ringSlot";
import { runeColor, runeName, RuneStone } from "../../ui/RuneArt";
import { TrailMark } from "../../ui/TrailMark";
import { isHighRune } from "../actLoot";
import { affixName, trailTitle } from "../hunts";
import { type DropSound, playSound } from "../../ui/sound";
import { EQUIP_BLOCK_TEXT } from "../labels";
import type { GameApi } from "../useGame";
import { WeaponSlot } from "../WeaponSlot";
import { useNotify } from "../notify/Notifications";
import { trophyNotification } from "../notify/notifications";
import { compareWithEquipped } from "../../ui/itemCompare";

/** The rewards after a won fight: Rune drops, the item cards with their reveal, the worn gear. */

/**
 * Runes fall onto the ground with a glowing glyph and a clink before they go to the pouch. The
 * act's Home Rune gets a burst of sparks in its color and a "Home Rune" tag.
 */
export function RuneDrops(props: { runes: readonly string[]; home?: string | undefined }) {
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
          className={`rune-drop${isHighRune(id) ? " high" : ""}${id === props.home ? " home" : ""}`}
          style={
            {
              animationDelay: `${0.2 + i * 0.25}s`,
              "--rune": runeColor(id),
            } as React.CSSProperties
          }
        >
          <span className="rune-glyph-glow" aria-hidden />
          {id === props.home && <span className="rune-home-burst" aria-hidden />}
          <RuneStone runeId={id} size={40} />
          <span className="title-font">{runeName(id)} Rune</span>
          {id === props.home && <span className="rune-home-tag small">Home Rune</span>}
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
      <Button
        variant="primary"
        blocked={equipReason ? EQUIP_BLOCK_TEXT[equipReason] : null}
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
      </Button>
      <Button
        blocked={takeReason ? "No room in the inventory" : null}
        onClick={() => game.dispatch({ type: "pickItem", index, mode: "take" })}
      >
        {takeReason ? "No room" : "Take"}
      </Button>
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

/** The card that carries the beaten enemy's Hunt Affix (hunts-entwurf-v1.md). */
function HuntRibbon(props: { affix: string; enemyId: string; tier: number }) {
  const enemy = [
    ...GAME_DATA.acts.flatMap((a) => a.enemies),
    ...(GAME_DATA.thief ? [GAME_DATA.thief] : []),
  ].find((e) => e.id === props.enemyId);
  return (
    <span
      className="hunt-ribbon small"
      data-testid="hunt-ribbon"
      title={`Hunt Affix of the ${enemy?.name ?? "enemy"}, rolled at ${trailTitle(props.tier)}.`}
    >
      <TrailMark tier={props.tier} size={22} /> Hunt Affix · {affixName(props.affix)}
    </span>
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
  // A Unique seen for the first time: its notification comes the moment its card turns over.
  const trophy = items.find(
    (it, i) => shown[i] && it.uniqueId && rewards?.newTrophies?.includes(it.uniqueId),
  );
  const notify = useNotify();
  useEffect(() => {
    if (trophy) notify([trophyNotification(trophy)]);
  }, [trophy, notify]);
  if (!rewards) return null;
  const taken = new Set((rewards.taken ?? []).map((t) => t.index));
  const focus = (item: Item) => props.onFocus(targetSlot(item, GAME_DATA, state.hero.equipment));

  if (items.length > 3) {
    // Boss Hoard (six cards) or the Ember Thief's sack (four): small faces, the chosen one in full.
    const firstOpen = items.findIndex((_, i) => shown[i] && !taken.has(i));
    const pick = selected !== undefined && shown[selected] ? selected : firstOpen;
    const detail = pick >= 0 ? items[pick] : undefined;
    return (
      <div className="hoard-layout">
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
                  <ItemArt
                    baseId={item.baseId}
                    uniqueId={item.uniqueId}
                    slot={getBase(GAME_DATA.items, item.baseId).slot}
                  />
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
              compare={taken.has(pick) ? undefined : compareWithEquipped(state, detail, true)}
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
            {rewards.hunt?.card === i && rewards.hunt.affix && (
              <HuntRibbon
                affix={rewards.hunt.affix}
                enemyId={rewards.hunt.enemyId}
                tier={rewards.hunt.tier}
              />
            )}
            <ItemDetail
              item={item}
              heroAttributes={state.hero.attributes}
              heroLevel={state.hero.level}
              compare={compareWithEquipped(state, item, true)}
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
      <Button
        icon="inventory"
        hotkey="I"
        className={`inventory-button${props.inventoryFull ? " inv-full" : ""}`}
        onClick={props.onInventory}
      >
        {props.inventoryFull ? "Inventory full" : "Open Inventory"} · {state.inventory.length}
      </Button>
    </aside>
  );
}
