import { ITEM_CATALOG } from "@emberheir/content";
import {
  type GameState,
  type Item,
  type ItemTooltip,
  RARITY_NAMES,
  activeRuneword,
  describeItem,
  getBase,
  greaterName,
} from "@emberheir/sim";
import { COMPARE_KEY, useCompareShown } from "./compareToggle";
import { GameIcon, type GameIconId } from "./gameIcons";
import { Icon } from "./Icon";
import { ItemArt } from "./ItemArt";
import type { CompareView } from "./itemCompare";
import { RuneStone } from "./RuneArt";

/**
 * The parts every item view shares (hover tooltips, loot cards, the worn-gear sheet), laid out
 * like a Diablo 4 tooltip: a header with the painted item, the base values as big numbers, the
 * affixes as a bulleted list, one compact requirements line and the comparison as rows.
 */

/** Rarity classes of an item: Uniques and Runewords get their own golden frame and name. */
export function rarityClass(item: Item): string {
  const special = item.uniqueId
    ? " special-unique"
    : item.runes?.length && activeRuneword(item, ITEM_CATALOG)
      ? " special-runeword"
      : "";
  return `rarity-${item.rarity}${special}`;
}

/** "Rare Iron Helm", "Unique Gauntlets", or just "Helm" for a plain Normal item. */
function kindLine(item: Item, tip: ItemTooltip): string {
  const base = getBase(ITEM_CATALOG, item.baseId);
  if (item.rarity === "normal" && !tip.special) {
    return item.name === base.name ? tip.slotName : base.name;
  }
  const rarity = tip.special ? tip.rarityName : RARITY_NAMES[item.rarity];
  return `${rarity} ${item.name === base.name ? tip.slotName : base.name}`;
}

/** Painted icon for a base value, by the stat it names. */
const BASE_ICONS: Readonly<Record<string, GameIconId>> = {
  Armor: "armor",
  Barrier: "barrier",
  Evasion: "evasion",
  "Block Chance": "block",
  Life: "life",
  "Physical Damage": "physical",
  "Fire Damage": "fire",
  "Cold Damage": "cold",
  "Lightning Damage": "lightning",
  "Void Damage": "void",
  "Elemental Damage": "elemental",
  Thorns: "thorns",
  "Flask Charges": "flask",
};

/** "+14 Armor" → number "14", label "Armor"; null for lines like "Speed 100". */
function splitBase(line: string): { value: string; label: string } | null {
  const m = /^\+?(\d[\d.–]*(?: %)?) (.+)$/.exec(line);
  return m?.[1] && m[2] ? { value: m[1], label: m[2] } : null;
}

const TIER_NUMERALS: Readonly<Record<number, string>> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
  7: "VII",
  8: "VIII",
  9: "IX",
  10: "X",
};

/**
 * Name plate: the painted item in its rarity frame with its Tier as a Roman numeral on a
 * brass plaque, the name over the full width, and the kind line with the Item Level.
 */
export function ItemHead(props: { item: Item; tip: ItemTooltip }) {
  const { item, tip } = props;
  const base = getBase(ITEM_CATALOG, item.baseId);
  return (
    <div className="ib-head">
      <span className={`ib-art ${rarityClass(item)}`}>
        <ItemArt baseId={item.baseId} slot={base.slot} />
        <span className="ib-tier" title={`Tier ${item.tier}`}>
          {TIER_NUMERALS[item.tier] ?? item.tier}
        </span>
      </span>
      <span className="ib-title">
        <span className="ib-name rarity-text">{item.name}</span>
        <span className="ib-kind-row">
          <span className="ib-kind">{kindLine(item, tip)}</span>
          <span className="ib-ilvl" title="Item Level">
            iLvl <b>{item.itemLevel}</b>
          </span>
        </span>
        {tip.runewordRecipe && <span className="ib-recipe">{tip.runewordRecipe}</span>}
      </span>
    </div>
  );
}

/** Base values big, then implicit, affixes, power, sockets, flavor and requirements. */
export function ItemBody(props: { item: Item; tip: ItemTooltip }) {
  const { item, tip } = props;
  const big = tip.baseLines.map((l) => ({ line: l, split: splitBase(l) }));
  const needsLevel = tip.requiredLevel.value > 1;
  const reqs = [
    ...(needsLevel
      ? [{ key: "level", text: `Level ${tip.requiredLevel.value}`, met: tip.requiredLevel.met }]
      : []),
    ...tip.requirements.map((r) => ({
      key: r.attribute,
      text: `${r.value} ${r.name}`,
      met: r.met,
    })),
  ];
  const stats = tip.affixLines.filter((l) => l.kind === "stat");
  const triggers = tip.affixLines.filter((l) => l.kind !== "stat");
  const noAffixes = tip.affixLines.length === 0 && !tip.power && !tip.sockets;
  return (
    <>
      {big.length > 0 && (
        <div className="ib-base">
          {big.map(({ line, split }) =>
            split ? (
              <span key={line} className="ib-big">
                {BASE_ICONS[split.label] && (
                  <GameIcon id={BASE_ICONS[split.label] as GameIconId} size={26} />
                )}
                <b className="ib-big-value">{split.value}</b>
                <span className="ib-big-label">{split.label}</span>
              </span>
            ) : (
              <span key={line} className="ib-base-line">
                {line}
              </span>
            ),
          )}
        </div>
      )}
      {tip.implicitLines.length > 0 && (
        <ul className="ib-lines ib-implicit">
          {tip.implicitLines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {stats.length > 0 && (
        <ul className="ib-lines ib-affixes">
          {stats.map((l, i) => (
            <li key={`${i}-${l.text}`} className={l.greater ? "greater" : undefined}>
              {l.text}
              {l.greater ? <span className="greater-mark">{greaterName(l.greater)}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {triggers.length > 0 && (
        <ul className="ib-lines ib-triggers">
          {triggers.map((l, i) => (
            <li key={`${i}-${l.text}`} className={l.kind === "kindled" ? "kindled" : undefined}>
              {l.text}
              {l.greater ? <span className="greater-mark">{greaterName(l.greater)}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {tip.power && (
        <div className="ib-power">
          <b>{tip.power.name}</b>
          <span>{tip.power.text}</span>
        </div>
      )}
      {tip.sockets && (
        <span className="ib-sockets">
          {Array.from({ length: tip.sockets.total }, (_, i) => {
            const id = item.runes?.[i];
            return id ? (
              <RuneStone key={i} runeId={id} size={22} />
            ) : (
              <span key={i} className="ib-socket" />
            );
          })}
        </span>
      )}
      {noAffixes && item.rarity === "normal" && <span className="ib-none">No affixes</span>}
      {(tip.flavor || tip.droppedBy) && (
        <div className="ib-flavor">
          {tip.flavor && <span>{tip.flavor}</span>}
          {tip.droppedBy && <span className="ib-source">Dropped by {tip.droppedBy}</span>}
        </div>
      )}
      {reqs.length > 0 && (
        <div className="ib-foot">
          Requires{" "}
          {reqs.map((r, i) => (
            <span key={r.key} className={r.met === false ? "unmet" : undefined}>
              {i > 0 ? " · " : ""}
              {r.text}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * What equipping changes, one row per stat: arrow, signed amount, painted stat icon, name.
 * Hidden until Shift turns it on; then only the key cap shows.
 */
export function CompareList(props: { view: CompareView }) {
  const { view } = props;
  const shown = useCompareShown();
  if (!shown) {
    return (
      <span className="tip-hotkey ib-compare-hint" data-testid="compare-hint">
        <kbd className="k-key">{COMPARE_KEY}</kbd> Compare
      </span>
    );
  }
  return (
    <div
      className={`ib-compare ${view.inactive ? "inactive" : view.better ? "better" : "worse"}`}
      data-testid="item-compare"
    >
      {view.empty && <span className="ib-compare-note">Empty slot</span>}
      {view.inactive ? (
        <span className="ib-compare-note ib-inactive">
          <Icon name="lock" size={14} /> Inactive until you meet its requirements
        </span>
      ) : view.rows.length === 0 ? (
        <span className="ib-compare-note">Same as equipped</span>
      ) : (
        view.rows.map((r) => (
          <span key={r.key} className={`ib-row ${r.up ? "up" : "down"}`}>
            <span className="ib-arrow" aria-hidden="true">
              {r.up ? "▲" : "▼"}
            </span>
            <span className="ib-delta">{r.value}</span>
            <span className="ib-row-icon">
              <GameIcon id={r.icon} size={18} />
            </span>
            <span className="ib-row-label">{r.label}</span>
          </span>
        ))
      )}
    </div>
  );
}

/** describeItem with the hero's attributes and level, for the views above. */
export function itemTip(item: Item, state: GameState | null | undefined): ItemTooltip {
  return describeItem(item, ITEM_CATALOG, state?.hero.attributes, state?.hero.level);
}
