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
  compareItem,
  describeItem,
  formatPercent,
  getBase,
  itemSize,
  missingRequirements,
  speedValue,
} from "@emberheir/sim";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type { IconName } from "./Icon";
import { ItemArt } from "./ItemArt";
import { useItemHover } from "./ItemTooltip";

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
): { text: string; kind: "stat" | "trigger" | "implicit" | "req" | "unmet" }[] {
  const tip = describeItem(item, ITEM_CATALOG, heroAttributes);
  const lines: { text: string; kind: "stat" | "trigger" | "implicit" | "req" | "unmet" }[] = [];
  for (const l of tip.implicitLines) lines.push({ text: l, kind: "implicit" });
  for (const l of tip.affixLines) lines.push({ text: l.text, kind: l.kind });
  if (tip.affixLines.length === 0 && item.rarity === "normal") {
    lines.push({ text: "No affixes", kind: "implicit" });
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

export function compareWithEquipped(state: GameState, item: Item) {
  // Gear with unmet requirements does nothing, so a stat comparison would read "same".
  const missing = missingRequirements(item, ITEM_CATALOG, state.hero.attributes);
  if (missing.length > 0)
    return { text: "Inactive until you meet its requirements", better: false };
  return compareSummary(compareItem(state, GAME_DATA, item));
}

export function rarityName(item: Item): string {
  return RARITY_NAMES[item.rarity].toUpperCase();
}

/** Item card: slot, rarity, name, base, affix lines and an optional compare line. */
export function ItemDetail(props: {
  item: Item;
  heroAttributes?: GameState["hero"]["attributes"];
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
      className={`item-detail rarity-${item.rarity} ${props.className ?? ""}`}
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
        <div className={`item-detail-art rarity-${item.rarity}`}>
          <ItemArt baseId={item.baseId} slot={base.slot} />
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
        {itemLines(item, props.heroAttributes).map((l, i) => (
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
}) {
  const { item } = props;
  const w = props.width ?? props.size ?? 68;
  const h = props.height ?? props.size ?? 68;
  const { active, ...hover } = useItemHover(item, props.equipped ?? true);
  const base = item ? getBase(ITEM_CATALOG, item.baseId) : undefined;
  return (
    <button
      type="button"
      className={`item-tile ${item ? `rarity-${item.rarity}` : "empty"}${props.selected ? " selected" : ""}${props.inactive ? " inactive" : ""}`}
      style={{ width: w, height: h }}
      aria-label={item ? `${props.label}: ${item.name}` : `${props.label}: empty`}
      title={active ? undefined : item ? `${props.label}: ${item.name}` : props.label}
      onClick={props.onSelect}
      disabled={!props.onSelect}
      {...hover}
    >
      {item && base ? (
        <ItemArt baseId={item.baseId} slot={base.slot} />
      ) : (
        <span className="item-tile-label">{props.label}</span>
      )}
      {item && <span className="item-tile-tier">T{item.tier}</span>}
    </button>
  );
}

function GridItem(props: {
  placed: PlacedItem;
  cell: number;
  selected: boolean;
  onSelect: (itemId: string, event?: ReactMouseEvent) => void;
}) {
  const { placed: p, cell } = props;
  const base = getBase(ITEM_CATALOG, p.item.baseId);
  const s = itemSize(p.item, ITEM_CATALOG);
  const { active, ...hover } = useItemHover(p.item);
  return (
    <button
      type="button"
      className={`grid-item rarity-${p.item.rarity}${props.selected ? " selected" : ""}`}
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
    >
      <ItemArt baseId={p.item.baseId} slot={base.slot} />
    </button>
  );
}

/** D2-style grid: items take several cells; click selects. */
export function ItemGrid(props: {
  placed: readonly PlacedItem[];
  size: GridSize;
  cell: number;
  selected: string | null;
  onSelect: (itemId: string, event?: ReactMouseEvent) => void;
  label: string;
  burned?: boolean;
}) {
  const { cell } = props;
  return (
    <div
      className={`item-grid${props.burned ? " burned" : ""}`}
      role="group"
      aria-label={props.label}
      style={{
        width: props.size.w * cell,
        height: props.size.h * cell,
        backgroundSize: `${cell}px ${cell}px`,
      }}
    >
      {props.placed.map((p) => (
        <GridItem
          key={p.item.id}
          placed={p}
          cell={cell}
          selected={props.selected === p.item.id}
          onSelect={props.onSelect}
        />
      ))}
    </div>
  );
}

/** Wallet entries in a fixed order. */
export function walletEntries(state: GameState): { name: string; value: number; key: string }[] {
  const w = state.wallet;
  const essence = GAME_DATA.acts[0]?.essence;
  return [
    { key: "gold", name: "Gold", value: w.gold },
    { key: "dust", name: "Dust", value: w.dust },
    { key: "reforge", name: "Reforge", value: w.reforgeStones },
    { key: "shards", name: "Shards", value: w.ascensionShards },
    ...(essence
      ? [{ key: "essence", name: essence.name, value: w.essences[essence.id] ?? 0 }]
      : []),
  ];
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
