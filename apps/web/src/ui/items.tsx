import { ITEM_CATALOG, GAME_DATA } from "@emberheir/content";
import {
  type DerivedStats,
  type GameState,
  type GridSize,
  type Item,
  type ItemComparison,
  type PlacedItem,
  RARITY_NAMES,
  SLOT_NAMES,
  activeRuneword,
  compareItem,
  describeItem,
  formatPercent,
  getBase,
  itemSize,
  missingRequirements,
  slotsFor,
  speedValue,
} from "@emberheir/sim";
import { type MouseEvent as ReactMouseEvent, type ReactNode, useState } from "react";
import {
  type DragSource,
  type GridDrop,
  type SlotDrop,
  dragging,
  endDrag,
  startDrag,
} from "./dragItems";
import { Icon, type IconName } from "./Icon";
import { ItemArt } from "./ItemArt";
import { useItemHover } from "./ItemTooltip";
import { SocketDots } from "./RuneArt";
import { aimedSlot, preferredSlotFor, switchSlot, useRingSlot } from "./ringSlot";

/** Icon per item (placeholder art: one Lucide-style icon per slot). */
export function itemIcon(item: Item): IconName {
  const base = getBase(ITEM_CATALOG, item.baseId);
  if (base.weapon) return base.weapon.range === "ranged" ? "wand" : "sword";
  switch (base.slot) {
    case "offHand":
      return base.fitsWeaponRange === "ranged" ? "focus" : "shield";
    case "helm":
      return "helm";
    case "body":
      return "armor";
    case "gloves":
      return "gloves";
    case "boots":
      return "boots";
    case "belt":
      return "belt";
    case "amulet":
      return "amulet";
    default:
      return "ring";
  }
}

/** Rarity classes of an item: Uniques and Runewords get their own golden frame and name. */
export function rarityClass(item: Item): string {
  const special = item.uniqueId
    ? " special-unique"
    : item.runes?.length && activeRuneword(item, ITEM_CATALOG)
      ? " special-runeword"
      : "";
  return `rarity-${item.rarity}${special}`;
}

/** "UNIQUE", "RUNEWORD" or the rarity name. */
export function rarityName(item: Item): string {
  if (item.uniqueId) return "UNIQUE";
  if (item.runes?.length && activeRuneword(item, ITEM_CATALOG)) return "RUNEWORD";
  return RARITY_NAMES[item.rarity].toUpperCase();
}

export function slotLabel(item: Item): string {
  return SLOT_NAMES[getBase(ITEM_CATALOG, item.baseId).slot];
}

/** Short base line for cards, e.g. "Sword · 5–9 Physical" or "Round Shield · 20 % Block". */
export function baseSummary(item: Item): string {
  const tip = describeItem(item, ITEM_CATALOG);
  const first = tip.baseLines[0];
  return first ? `${tip.baseName} · ${first.replace(" Damage", "")}` : tip.baseName;
}

/** Tooltip lines of an item for the cards, in mock order: affixes, then requirements. */
export function itemLines(
  item: Item,
  heroAttributes?: GameState["hero"]["attributes"],
  heroLevel?: number,
): {
  text: string;
  kind: "stat" | "trigger" | "kindled" | "implicit" | "req" | "unmet" | "power";
}[] {
  const tip = describeItem(item, ITEM_CATALOG, heroAttributes, heroLevel);
  const lines: {
    text: string;
    kind: "stat" | "trigger" | "kindled" | "implicit" | "req" | "unmet" | "power";
  }[] = [];
  for (const l of tip.implicitLines) lines.push({ text: l, kind: "implicit" });
  for (const l of tip.affixLines) lines.push({ text: l.text, kind: l.kind });
  if (tip.power) lines.push({ text: `${tip.power.name}: ${tip.power.text}`, kind: "power" });
  if (tip.sockets) {
    const runes = tip.sockets.runes.length ? `: ${tip.sockets.runes.join(" · ")}` : "";
    lines.push({
      text: `Sockets ${tip.sockets.runes.length}/${tip.sockets.total}${runes}`,
      kind: "implicit",
    });
  }
  if (tip.affixLines.length === 0 && item.rarity === "normal" && !tip.sockets) {
    lines.push({ text: "No affixes", kind: "implicit" });
  }
  if (tip.droppedBy) lines.push({ text: `Dropped by ${tip.droppedBy}`, kind: "implicit" });
  if (tip.requiredLevel.value > 1) {
    lines.push({
      text: `Requires Level ${tip.requiredLevel.value}`,
      kind: tip.requiredLevel.met === false ? "unmet" : "req",
    });
  }
  for (const r of tip.requirements) {
    lines.push({ text: `Requires ${r.value} ${r.name}`, kind: r.met === false ? "unmet" : "req" });
  }
  return lines;
}

const STAT_LABEL: Partial<Record<keyof DerivedStats, string>> = {
  maxLife: "Life",
  armor: "Armor",
  physicalDamage: "Physical Damage",
  elementalDamage: "Elemental Damage",
  critChance: "Crit Chance",
  attackSpeed: "Attack Speed",
  evasion: "Evasion",
  blockChance: "Block",
  resistance: "All Resistance",
  fireResistance: "Fire Resistance",
  coldResistance: "Cold Resistance",
  lightningResistance: "Lightning Resistance",
  voidResistance: "Void Resistance",
  heatGain: "Heat Gain",
  startingHeat: "Starting Heat",
  tenacity: "Tenacity",
  lifesteal: "Lifesteal",
  triggerChance: "Trigger Chance",
  bleedChance: "Chance to Bleed",
  poisonChance: "Chance to Poison",
  ailmentDuration: "Ailment Duration",
};
const FLAT = new Set<keyof DerivedStats>(["maxLife", "armor", "startingHeat"]);

/** "▲ +8 % DPS · ▲ +40 Life" style comparison with the equipped item. */
export function compareSummary(cmp: ItemComparison): { text: string; better: boolean } {
  const parts: string[] = [];
  const dpsDelta = cmp.dps.before > 0 ? cmp.dps.after / cmp.dps.before - 1 : 0;
  let score = dpsDelta * 3;
  if (Math.abs(dpsDelta) >= 0.005) {
    parts.push(`${dpsDelta > 0 ? "▲ +" : "▼ "}${Math.round(dpsDelta * 100)} % DPS`);
  }
  for (const c of cmp.changes) {
    if (c.stat === "attackSpeed" || c.stat === "dps" || parts.length >= 3) continue;
    const label = STAT_LABEL[c.stat as keyof DerivedStats];
    if (!label) continue;
    const delta = c.after - c.before;
    const flat = FLAT.has(c.stat as keyof DerivedStats);
    const value = flat ? `${Math.round(Math.abs(delta))}` : `${formatPercent(Math.abs(delta))} %`;
    if (flat && Math.round(Math.abs(delta)) === 0) continue;
    parts.push(`${delta > 0 ? "▲ +" : "▼ −"}${value} ${label}`);
    score += Math.sign(delta) * 0.5;
  }
  if (cmp.triggerDelta > 0) {
    parts.push("▲ new Trigger Affix");
    score += 1;
  } else if (cmp.triggerDelta < 0) {
    parts.push("▼ loses Trigger Affix");
    score -= 1;
  }
  if (parts.length === 0) return { text: "Same as equipped", better: false };
  const prefix = cmp.replaces ? "" : "Empty slot · ";
  return { text: prefix + parts.join(" · "), better: score >= 0 || !cmp.replaces };
}

/** Compare with the item in the slot it would go to (the Ring shortcut picks the Ring). */
export function compareWithEquipped(state: GameState, item: Item) {
  // Gear with unmet requirements does nothing, so a stat comparison would read "same".
  const missing = missingRequirements(item, ITEM_CATALOG, state.hero.attributes);
  if (missing.length > 0)
    return { text: "Inactive until you meet its requirements", better: false };
  return compareSummary(compareItem(state, GAME_DATA, item, preferredSlotFor(item)));
}

/**
 * The other-Ring shortcut: Ring 1 | Ring 2. Compare and Equip aim at the lit one. Renders
 * nothing for items with a single slot.
 */
export function RingSwitch(props: { state: GameState; item: Item }) {
  useRingSlot();
  const { state, item } = props;
  const slots = slotsFor(item, GAME_DATA);
  if (slots.length < 2) return null;
  const aimed = aimedSlot(state, item);
  return (
    <button
      type="button"
      className="ring-switch"
      title="Other Ring slot"
      aria-label={`Aim at the other Ring slot (now ${aimed === "ring2" ? "Ring 2" : "Ring 1"})`}
      data-testid="ring-switch"
      onClick={() => switchSlot(state, item)}
    >
      <Icon name="cycle" size={14} />
      {slots.map((s, i) => (
        <span key={s} className={s === aimed ? "on" : ""}>
          Ring {i + 1}
        </span>
      ))}
    </button>
  );
}

/** Item card: slot, rarity, name, base, affix lines and an optional compare line. */
export function ItemDetail(props: {
  item: Item;
  heroAttributes?: GameState["hero"]["attributes"];
  heroLevel?: number;
  where?: string;
  compare?: { text: string; better: boolean } | undefined;
  footer?: ReactNode;
  className?: string;
  testId?: string;
}) {
  const { item } = props;
  const base = getBase(ITEM_CATALOG, item.baseId);
  const weapon = base.weapon;
  return (
    <article
      className={`item-detail ${rarityClass(item)} ${props.className ?? ""}`}
      aria-label={item.name}
      data-testid={props.testId}
    >
      <div className="item-detail-top">
        <span>
          {props.where ? `${props.where} · ` : ""}
          {slotLabel(item).toUpperCase()}
        </span>
        <span className="rarity-text">
          {rarityName(item)} · T{item.tier}
        </span>
      </div>
      <div className="item-detail-head">
        <div className={`item-detail-art ${rarityClass(item)}`}>
          <ItemArt baseId={item.baseId} slot={base.slot} />
          <SocketDots sockets={item.sockets ?? 0} runes={item.runes ?? []} />
        </div>
        <div className="item-detail-title">
          <h3 className="item-detail-name rarity-text">{item.name}</h3>
          <span className="item-detail-base">{baseSummary(item)}</span>
          {weapon && (
            <span
              className="item-detail-speed"
              title="Attack Speed. Speed 100 is the Sword's speed."
            >
              Speed <strong className="mono">{speedValue(weapon.attacksPerSecond)}</strong>
            </span>
          )}
        </div>
      </div>
      <div className="item-detail-rule" />
      <ul className="item-detail-lines">
        {itemLines(item, props.heroAttributes, props.heroLevel).map((l, i) => (
          <li key={`${i}-${l.text}`} className={`line-${l.kind}`}>
            {l.text}
          </li>
        ))}
      </ul>
      <div className="item-detail-spacer" />
      {props.compare && (
        <span className={`item-compare ${props.compare.better ? "better" : "worse"}`}>
          {props.compare.text}
        </span>
      )}
      {props.footer}
    </article>
  );
}

/** A square item tile for paperdolls and lists: painted icon, hover tooltip. */
export function ItemTile(props: {
  item: Item | undefined;
  label: string;
  selected?: boolean;
  onSelect?: () => void;
  size?: number;
  width?: number;
  height?: number;
  inactive?: boolean;
  /** The tile shows a worn item (its tooltip then has nothing to compare with). */
  equipped?: boolean;
  /** Drag & drop: the slot's item can be dragged away (`source`) and items dropped on it. */
  drag?: { readonly source?: DragSource | undefined; readonly drop: SlotDrop };
  /** The Ring shortcut aims here. */
  aimed?: boolean;
}) {
  const { item } = props;
  const w = props.width ?? props.size ?? 68;
  const h = props.height ?? props.size ?? 68;
  const { active, ...hover } = useItemHover(item, props.equipped ?? true);
  const [over, setOver] = useState<"ok" | "no" | null>(null);
  const base = item ? getBase(ITEM_CATALOG, item.baseId) : undefined;
  const drag = props.drag;
  const dragProps = drag
    ? {
        draggable: !!drag.source,
        onDragStart: (e: React.DragEvent) => {
          if (!drag.source) return;
          hover.onMouseLeave?.();
          startDrag(drag.source, e);
        },
        onDragEnd: () => {
          endDrag();
          setOver(null);
        },
        onDragOver: (e: React.DragEvent) => {
          const source = dragging();
          if (!source || source.itemId === item?.id) return;
          const ok = drag.drop.canDrop(source);
          if (ok) e.preventDefault();
          setOver(ok ? "ok" : "no");
        },
        onDragLeave: () => setOver(null),
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          const source = dragging();
          setOver(null);
          endDrag();
          if (source && drag.drop.canDrop(source)) drag.drop.onDrop(source);
        },
      }
    : {};
  return (
    <button
      type="button"
      className={`item-tile ${item ? rarityClass(item) : "empty"}${props.selected ? " selected" : ""}${props.inactive ? " inactive" : ""}${over ? ` drop-${over}` : ""}${props.aimed ? " aimed" : ""}`}
      style={{ width: w, height: h }}
      aria-label={item ? `${props.label}: ${item.name}` : `${props.label}: empty`}
      title={active ? undefined : item ? `${props.label}: ${item.name}` : props.label}
      onClick={props.onSelect}
      disabled={!props.onSelect && !drag}
      {...hover}
      {...dragProps}
    >
      {item && base ? (
        <ItemArt baseId={item.baseId} slot={base.slot} />
      ) : (
        <span className="item-tile-label">{props.label}</span>
      )}
      {item && <SocketDots sockets={item.sockets ?? 0} runes={item.runes ?? []} />}
      {item && <span className="item-tile-tier">T{item.tier}</span>}
    </button>
  );
}

function GridItem(props: {
  placed: PlacedItem;
  cell: number;
  selected: boolean;
  onSelect: (itemId: string, event?: ReactMouseEvent) => void;
  grid?: "inventory" | "stash" | undefined;
}) {
  const { placed: p, cell, grid } = props;
  const base = getBase(ITEM_CATALOG, p.item.baseId);
  const s = itemSize(p.item, ITEM_CATALOG);
  const { active, ...hover } = useItemHover(p.item);
  const dragProps = grid
    ? {
        draggable: true,
        onDragStart: (e: React.DragEvent<HTMLButtonElement>) => {
          hover.onMouseLeave?.();
          const r = e.currentTarget.getBoundingClientRect();
          const cw = r.width / s.w || 1;
          const ch = r.height / s.h || 1;
          const offset = {
            x: Math.min(s.w - 1, Math.max(0, Math.floor((e.clientX - r.left) / cw))),
            y: Math.min(s.h - 1, Math.max(0, Math.floor((e.clientY - r.top) / ch))),
          };
          startDrag({ kind: "grid", grid, itemId: p.item.id, offset, size: s }, e);
        },
        onDragEnd: endDrag,
      }
    : {};
  return (
    <button
      type="button"
      className={`grid-item ${rarityClass(p.item)}${props.selected ? " selected" : ""}`}
      data-testid="grid-item"
      style={{
        left: p.x * cell,
        top: p.y * cell,
        width: s.w * cell - 4,
        height: s.h * cell - 4,
      }}
      aria-label={p.item.name}
      title={active ? undefined : p.item.name}
      onClick={(e) => props.onSelect(p.item.id, e)}
      {...hover}
      {...dragProps}
    >
      <ItemArt baseId={p.item.baseId} slot={base.slot} />
      <SocketDots sockets={p.item.sockets ?? 0} runes={p.item.runes ?? []} />
    </button>
  );
}

/** D2-style grid: items take several cells; click selects, drag & drop moves (with `drop`). */
export function ItemGrid(props: {
  placed: readonly PlacedItem[];
  size: GridSize;
  cell: number;
  selected: string | null;
  onSelect: (itemId: string, event?: ReactMouseEvent) => void;
  label: string;
  drop?: GridDrop | undefined;
}) {
  const { cell, drop } = props;
  const [preview, setPreview] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    ok: boolean;
  } | null>(null);

  /** The grid cell the dragged item's top left would land on. */
  const cellAt = (e: React.DragEvent<HTMLDivElement>, source: DragSource) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = r.width / (props.size.w * cell) || 1;
    const offset = source.kind === "grid" ? source.offset : { x: 0, y: 0 };
    return {
      x: Math.floor((e.clientX - r.left) / (cell * px)) - offset.x,
      y: Math.floor((e.clientY - r.top) / (cell * px)) - offset.y,
    };
  };

  const dropProps = drop
    ? {
        onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
          const source = dragging();
          if (!source) return;
          const at = cellAt(e, source);
          const ok = drop.canDrop(source, at);
          if (ok) e.preventDefault();
          if (preview?.x !== at.x || preview?.y !== at.y || preview?.ok !== ok)
            setPreview({ ...at, ...source.size, ok });
        },
        onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPreview(null);
        },
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setPreview(null);
          const source = dragging();
          endDrag();
          if (!source) return;
          const at = cellAt(e, source);
          if (drop.canDrop(source, at)) drop.onDrop(source, at);
        },
      }
    : {};

  return (
    <div
      className="item-grid"
      role="group"
      aria-label={props.label}
      style={{
        width: props.size.w * cell,
        height: props.size.h * cell,
        backgroundSize: `${cell}px ${cell}px`,
      }}
      {...dropProps}
    >
      {props.placed.map((p) => (
        <GridItem
          key={p.item.id}
          placed={p}
          cell={cell}
          selected={props.selected === p.item.id}
          onSelect={props.onSelect}
          grid={drop?.grid}
        />
      ))}
      {preview && (
        <div
          className={`grid-drop ${preview.ok ? "ok" : "no"}`}
          aria-hidden="true"
          style={{
            left: Math.max(0, preview.x) * cell,
            top: Math.max(0, preview.y) * cell,
            width: preview.w * cell,
            height: preview.h * cell,
          }}
        />
      )}
    </div>
  );
}

/** Wallet entries in a fixed order. */
export function walletEntries(state: GameState): { name: string; value: number; key: string }[] {
  const w = state.wallet;
  const runes = Object.values(w.runes).reduce((a, b) => a + b, 0);
  return [
    { key: "acorns", name: "Acorns", value: w.acorns },
    { key: "ash", name: "Ash", value: w.ash },
    { key: "coal", name: "Ember Coal", value: w.emberCoal },
    { key: "feathers", name: "Feathers", value: w.phoenixFeathers },
    ...(runes > 0 ? [{ key: "runes", name: "Runes", value: runes }] : []),
  ];
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
