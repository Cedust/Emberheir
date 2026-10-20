import { type GameState, type Item, type PerkId, getPerk } from "@emberheir/sim";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCompareKey } from "./compareToggle";
import { CompareList, ItemBody, ItemHead, itemTip, rarityClass } from "./ItemBody";
import { aimedSlot, useRingSlot } from "./ringSlot";
import { useStageSize } from "./Stage";
import { type CompareView, compareWithEquipped } from "./itemCompare";
import { WeaponTooltipCard } from "./WeaponTooltip";
import type { WeaponTip } from "./weaponTip";

/**
 * Diablo-style item tooltips: hovering an item tile or a grid item shows its full tooltip next
 * to it, and for items that are not equipped the equipped item of the same slot beside it, with
 * a one-line verdict. Everything is laid out in stage pixels, so it scales like the rest.
 */

/** Where a Breakpoint Perk stands for the hovered attribute row. */
export type PerkStatus = "active" | "locked" | "gained" | "lost";

interface PerkHover {
  readonly perk: PerkId;
  readonly status: PerkStatus;
  /** The attribute value that counts for the Perk now. */
  readonly value: number;
}

/** A plain game note: a mechanic, a stat or a Draught explained in simple words. */
export interface NoteHover {
  readonly name: string;
  /** Small line under the name, e.g. "Defense" or "Draught · 1 Flask charge". */
  readonly kind: string;
  readonly explain: string;
  /** Last line, e.g. "Run 4: −30 % on every Resistance". */
  readonly status?: string;
  /** The key that does the same, shown as a key cap (ui-ux-plan-v1.md 3.5). */
  readonly hotkey?: string;
}

interface Hover {
  readonly item?: Item;
  readonly perk?: PerkHover;
  readonly note?: NoteHover;
  /** The Heirloom weapon (not an item: it has its own tooltip). */
  readonly weapon?: WeaponTip;
  /** The hovered element in stage pixels. */
  readonly anchor: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
  /** True when the hovered item is worn right now (no comparison then). */
  readonly equipped: boolean;
  /** What a right-click does here, e.g. "Equip" (ui-ux-plan-v1.md 3.5). */
  readonly action?: string | undefined;
}

interface HoverApi {
  readonly show: (
    hover: Omit<Hover, "anchor" | "equipped"> & { equipped?: boolean },
    element: Element,
  ) => void;
  readonly hide: () => void;
}

const HoverContext = createContext<HoverApi | null>(null);

/** Mouse handlers that show an item's tooltip; no-ops outside an `ItemHoverLayer`. */
export function useItemHover(item: Item | undefined, equipped = false, action?: string) {
  const api = useContext(HoverContext);
  return useMemo(() => {
    if (!api || !item) return { active: false as const };
    return {
      active: true as const,
      onMouseEnter: (e: React.MouseEvent) => api.show({ item, equipped, action }, e.currentTarget),
      onMouseLeave: () => api.hide(),
      onFocus: (e: React.FocusEvent) => api.show({ item, equipped, action }, e.currentTarget),
      onBlur: () => api.hide(),
    };
  }, [api, item, equipped, action]);
}

/** Mouse and focus handlers that show a Breakpoint Perk's tooltip. */
export function usePerkHover(perk: PerkHover) {
  const api = useContext(HoverContext);
  const { perk: id, status, value } = perk;
  return useMemo(() => {
    if (!api) return {};
    const hover = { perk: { perk: id, status, value } };
    return {
      onMouseEnter: (e: React.MouseEvent) => api.show(hover, e.currentTarget),
      onMouseLeave: () => api.hide(),
      onFocus: (e: React.FocusEvent) => api.show(hover, e.currentTarget),
      onBlur: () => api.hide(),
    };
  }, [api, id, status, value]);
}

/** Mouse and focus handlers that show a game note (mechanics, stats, Draughts). */
export function useNoteHover(note: NoteHover | undefined) {
  const api = useContext(HoverContext);
  const { name, kind, explain, status, hotkey } = note ?? { name: "", kind: "", explain: "" };
  // A note shown by this element goes away with it (closing the sheet with Escape, setting out).
  const shown = useRef(false);
  useEffect(
    () => () => {
      if (shown.current) api?.hide();
    },
    [api],
  );
  return useMemo(() => {
    if (!api || !name) return {};
    const hover = {
      note: { name, kind, explain, ...(status ? { status } : {}), ...(hotkey ? { hotkey } : {}) },
    };
    const show = (element: Element) => {
      shown.current = true;
      api.show(hover, element);
    };
    const hide = () => {
      shown.current = false;
      api.hide();
    };
    return {
      onMouseEnter: (e: React.MouseEvent) => show(e.currentTarget),
      onMouseLeave: hide,
      onFocus: (e: React.FocusEvent) => show(e.currentTarget),
      onBlur: hide,
    };
  }, [api, name, kind, explain, status, hotkey]);
}

/**
 * Mouse and focus handlers that show the Heirloom weapon's tooltip. `tip` is built on hover, so
 * the views do not compute it on every render.
 */
export function useWeaponHover(tip: () => WeaponTip) {
  const api = useContext(HoverContext);
  return useMemo(() => {
    if (!api) return {};
    const show = (element: Element) => api.show({ weapon: tip() }, element);
    return {
      onMouseEnter: (e: React.MouseEvent) => show(e.currentTarget),
      onMouseLeave: () => api.hide(),
      onFocus: (e: React.FocusEvent) => show(e.currentTarget),
      onBlur: () => api.hide(),
    };
  }, [api, tip]);
}

const GAP = 12;
const MARGIN = 10;
/** Anchors that end above this line sit in a header bar. */
const HEADER_ZONE = 90;

/** Provides item tooltips to everything inside; renders them on top of the stage. */
export function ItemHoverLayer(props: { state: GameState | null; children: ReactNode }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const stage = useStageSize();
  const [hover, setHover] = useState<Hover | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const show = useCallback<HoverApi["show"]>(
    (h, element) => {
      const layer = layerRef.current?.getBoundingClientRect();
      if (!layer) return;
      const r = element.getBoundingClientRect();
      const scale = layer.width / stage.w || 1;
      setPos(null);
      setHover({
        ...h,
        equipped: h.equipped ?? false,
        anchor: {
          x: (r.left - layer.left) / scale,
          y: (r.top - layer.top) / scale,
          w: r.width / scale,
          h: r.height / scale,
        },
      });
    },
    [stage.w],
  );
  const hide = useCallback(() => setHover(null), []);
  const api = useMemo(() => ({ show, hide }), [show, hide]);

  // Place the tooltip right of the item, or left when there is no room; keep it on screen.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!hover || !box) return;
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    const { anchor } = hover;
    // Header bars (wallet, points, tabs): hang the note below instead of over the bar.
    if (!hover.item && !hover.weapon && anchor.y + anchor.h <= HEADER_ZONE) {
      const centered = anchor.x + anchor.w / 2 - w / 2;
      setPos({
        left: Math.min(Math.max(MARGIN, centered), stage.w - MARGIN - w),
        top: anchor.y + anchor.h + GAP,
      });
      return;
    }
    const right = anchor.x + anchor.w + GAP;
    const left = right + w <= stage.w - MARGIN ? right : Math.max(MARGIN, anchor.x - GAP - w);
    const top = Math.min(Math.max(MARGIN, anchor.y), stage.h - MARGIN - h);
    setPos({ left, top });
  }, [hover, stage.w, stage.h]);

  const state = props.state;
  useRingSlot();
  useCompareKey();
  let worn: Item | undefined;
  if (hover?.item && state && !hover.equipped) {
    const slot = aimedSlot(state, hover.item);
    const current = slot ? state.hero.equipment[slot] : undefined;
    if (current && current.id !== hover.item.id) worn = current;
  }

  return (
    <HoverContext.Provider value={api}>
      {props.children}
      <div ref={layerRef} className="item-hover-layer" aria-hidden="true">
        {hover && (
          <div
            ref={boxRef}
            className="item-tooltip-row"
            style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, opacity: 0 }}
            data-testid="item-tooltip"
          >
            {hover.perk && <PerkTooltipCard {...hover.perk} />}
            {hover.note && <NoteTooltipCard {...hover.note} />}
            {hover.weapon && <WeaponTooltipCard tip={hover.weapon} />}
            {hover.item && (
              <ItemTooltipCard
                item={hover.item}
                state={state}
                compare={
                  !hover.equipped && state ? compareWithEquipped(state, hover.item) : undefined
                }
                action={hover.action}
              />
            )}
            {worn && <ItemTooltipCard item={worn} state={state} tag="Equipped" />}
          </div>
        )}
      </div>
    </HoverContext.Provider>
  );
}

const ATTRIBUTE_NAMES: Record<string, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  intelligence: "Intelligence",
  agility: "Agility",
  wisdom: "Wisdom",
  vitality: "Vitality",
};

/** A Breakpoint Perk: its seal, name, the effect in plain words and whether it is lit. */
function PerkTooltipCard(props: PerkHover) {
  const perk = getPerk(props.perk);
  const attribute = ATTRIBUTE_NAMES[perk.attribute] ?? perk.attribute;
  const status = {
    active: "Active",
    gained: "Opens with this change",
    lost: "Lost with this change",
    locked: `Needs ${attribute} ${perk.threshold} · you have ${props.value}`,
  }[props.status];
  return (
    <div className={`item-tooltip perk-tooltip perk-${props.status}`} data-testid="perk-tooltip">
      <span className="perk-tip-seal" aria-hidden="true" />
      <span className="tip-name">{perk.name}</span>
      <span className="tip-kind">
        {attribute} {perk.threshold} · Breakpoint Perk
      </span>
      <span className="tip-rule" />
      <span className="tip-line perk-tip-explain">{perk.explain}</span>
      <span className="tip-rule" />
      <span className="perk-tip-status">{status}</span>
    </div>
  );
}

/** A game note in the tooltip plate: name, kind, the effect in plain words, a status line. */
function NoteTooltipCard(props: NoteHover) {
  return (
    <div className="item-tooltip perk-tooltip note-tooltip" data-testid="note-tooltip">
      <span className="tip-name">{props.name}</span>
      {props.kind && <span className="tip-kind">{props.kind}</span>}
      {props.explain && (
        <>
          <span className="tip-rule" />
          <span className="tip-line perk-tip-explain">{props.explain}</span>
        </>
      )}
      {props.hotkey && (
        <span className="tip-hotkey">
          Key <kbd className="k-key">{props.hotkey}</kbd>
        </span>
      )}
      {props.status && (
        <>
          <span className="tip-rule" />
          <span className="perk-tip-status">{props.status}</span>
        </>
      )}
    </div>
  );
}

/** One Diablo-style tooltip: name plate, base values, affixes, requirements, comparison. */
export function ItemTooltipCard(props: {
  item: Item;
  state: GameState | null;
  tag?: string;
  compare?: CompareView | undefined;
  /** What a right-click does where the item sits. */
  action?: string | undefined;
}) {
  const { item } = props;
  const tip = itemTip(item, props.state);
  return (
    <div className={`item-tooltip item-tip ${rarityClass(item)} tip-${tip.special ?? item.rarity}`}>
      {props.tag && <span className="tip-tag">{props.tag}</span>}
      <ItemHead item={item} tip={tip} />
      <ItemBody item={item} tip={tip} />
      {props.compare && <CompareList view={props.compare} />}
      {props.action && (
        <span className="tip-hotkey">
          <kbd className="k-key">Right-click</kbd> {props.action}
        </span>
      )}
    </div>
  );
}
