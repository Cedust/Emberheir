import { ITEM_CATALOG } from "@emberheir/content";
import {
  type GameState,
  type Item,
  type PerkId,
  describeItem,
  getBase,
  getPerk,
} from "@emberheir/sim";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { compareWithEquipped } from "./items";
import { RuneStone } from "./RuneArt";
import { aimedSlot, useRingSlot } from "./ringSlot";
import { useStageSize } from "./Stage";

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

interface Hover {
  readonly item?: Item;
  readonly perk?: PerkHover;
  /** The hovered element in stage pixels. */
  readonly anchor: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
  /** True when the hovered item is worn right now (no comparison then). */
  readonly equipped: boolean;
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
export function useItemHover(item: Item | undefined, equipped = false) {
  const api = useContext(HoverContext);
  return useMemo(() => {
    if (!api || !item) return { active: false as const };
    return {
      active: true as const,
      onMouseEnter: (e: React.MouseEvent) => api.show({ item, equipped }, e.currentTarget),
      onMouseLeave: () => api.hide(),
      onFocus: (e: React.FocusEvent) => api.show({ item, equipped }, e.currentTarget),
      onBlur: () => api.hide(),
    };
  }, [api, item, equipped]);
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

const GAP = 12;
const MARGIN = 10;

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
    const right = anchor.x + anchor.w + GAP;
    const left = right + w <= stage.w - MARGIN ? right : Math.max(MARGIN, anchor.x - GAP - w);
    const top = Math.min(Math.max(MARGIN, anchor.y), stage.h - MARGIN - h);
    setPos({ left, top });
  }, [hover, stage.w, stage.h]);

  const state = props.state;
  useRingSlot();
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
            {hover.item && (
              <ItemTooltipCard
                item={hover.item}
                state={state}
                verdict={
                  !hover.equipped && state ? compareWithEquipped(state, hover.item) : undefined
                }
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

/** One Diablo-style tooltip: name, type, base values, affixes, requirements. */
export function ItemTooltipCard(props: {
  item: Item;
  state: GameState | null;
  tag?: string;
  verdict?: { text: string; better: boolean } | undefined;
}) {
  const { item } = props;
  const tip = describeItem(item, ITEM_CATALOG, props.state?.hero.attributes);
  const base = getBase(ITEM_CATALOG, item.baseId);
  const kind =
    item.rarity === "normal" && !tip.special ? tip.slotName : `${tip.rarityName} ${tip.slotName}`;
  return (
    <div className={`item-tooltip tip-${tip.special ?? item.rarity}`}>
      {props.tag && <span className="tip-tag">{props.tag}</span>}
      <span className="tip-name">{item.name}</span>
      {item.name !== base.name && <span className="tip-base">{base.name}</span>}
      <span className="tip-kind">{kind}</span>
      {tip.runewordRecipe && <span className="tip-recipe">&lsquo;{tip.runewordRecipe}&rsquo;</span>}
      <span className="tip-rule" />
      {tip.baseLines.map((l) => (
        <span key={l} className="tip-line tip-basic">
          {l}
        </span>
      ))}
      {tip.implicitLines.map((l) => (
        <span key={l} className="tip-line tip-implicit">
          {l}
        </span>
      ))}
      {tip.affixLines.map((l, i) => (
        <span key={`${i}-${l.text}`} className={`tip-line tip-${l.kind}`}>
          {l.text}
        </span>
      ))}
      {tip.power && (
        <span className="tip-line tip-power">
          <b>{tip.power.name}</b> {tip.power.text}
        </span>
      )}
      {tip.sockets && (
        <span className="tip-sockets">
          {Array.from({ length: tip.sockets.total }, (_, i) => {
            const id = item.runes?.[i];
            return id ? (
              <RuneStone key={i} runeId={id} size={22} />
            ) : (
              <span key={i} className="tip-socket" />
            );
          })}
        </span>
      )}
      {tip.flavor && <span className="tip-flavor">{tip.flavor}</span>}
      {tip.requirements.length > 0 && <span className="tip-rule" />}
      {tip.requirements.map((r) => (
        <span key={r.attribute} className={`tip-line tip-req${r.met === false ? " unmet" : ""}`}>
          Requires {r.value} {r.name}
        </span>
      ))}
      <span className="tip-ilvl">
        Item Level {item.itemLevel} · Tier {item.tier}
      </span>
      {props.verdict && (
        <span className={`tip-verdict ${props.verdict.better ? "better" : "worse"}`}>
          {props.verdict.text}
        </span>
      )}
    </div>
  );
}
