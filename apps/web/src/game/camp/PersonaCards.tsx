import { ITEM_CATALOG } from "@emberheir/content";
import {
  type CodexPartKind,
  type GameState,
  type Item,
  type LearnedPart,
  CODEX,
  codexKnows,
  describeBonuses,
  describeTrigger,
  getBase,
  kindledAffixId,
  matchRuneword,
  resolveTrigger,
  runeGroup,
  salvageValue,
  upgradedItem,
} from "@emberheir/sim";
import { baseSummary, rarityClass, rarityName } from "../../ui/items";
import { type ActionKind, affixText, greaterName, rangeText } from "./personaDefs";
import { SocketRow } from "./RuneViews";

/** Cards of the persona screens: the item in work, the item afterwards, kindled parts. */

export function ItemHead(props: { item: Item; label: string; dashed?: boolean }) {
  const { item } = props;
  return (
    <>
      <span className="eyebrow">{props.label}</span>
      <span className="title-font craft-item-name rarity-text">{item.name}</span>
      <span className="rarity-text small strong">
        {rarityName(item)} · T{item.tier}
      </span>
      <span className="sub">{baseSummary(item)}</span>
      <div className="item-detail-rule" />
    </>
  );
}

export function AfterCard(props: {
  item: Item | undefined;
  kind: ActionKind;
  affixIndex: number | null;
  runeId: string | null;
  learned: readonly LearnedPart[];
  kindle: { conditionId: string; effectId: string; index: number } | undefined;
  /** Salvage: the Legendary Power this item teaches the Power Codex (a new one or a better tier). */
  power?: { name: string; tier: number } | undefined;
}) {
  const { item, kind } = props;
  if (!item) return <div className="craft-card panel-card dashed" />;
  if (kind === "socket") {
    const sockets = (item.sockets ?? 0) + 1;
    return (
      <div className={`craft-card panel-card dashed ${rarityClass(item)}`}>
        <ItemHead item={item} label="AFTER" />
        <SocketRow sockets={sockets} runes={item.runes ?? []} highlight={sockets - 1} />
        <span className="after-line new">{sockets} Sockets</span>
      </div>
    );
  }
  if (kind === "rune") {
    const runes = props.runeId ? [...(item.runes ?? []), props.runeId] : (item.runes ?? []);
    const slot = getBase(ITEM_CATALOG, item.baseId).slot;
    const word = matchRuneword(ITEM_CATALOG, slot, item.sockets ?? 0, runes);
    return (
      <div
        className={`craft-card panel-card dashed ${word ? "special-runeword" : rarityClass(item)}`}
      >
        <ItemHead item={word ? { ...item, name: word.name } : item} label="AFTER" />
        <SocketRow sockets={item.sockets ?? 0} runes={runes} highlight={runes.length - 1} />
        {props.runeId && (
          <span className="after-line new">
            {describeBonuses(
              ITEM_CATALOG.runes.get(props.runeId)?.bonuses[runeGroup(slot)] ?? {},
            ).join(" · ")}
          </span>
        )}
        {word && <span className="after-line new runeword-line">Runeword: {word.name}</span>}
      </div>
    );
  }
  if (kind === "salvage") {
    return (
      <div className="craft-card panel-card dashed">
        <span className="eyebrow">AFTER</span>
        <span className="title-font craft-item-name">Ash</span>
        <span className="sub">The item is gone for good.</span>
        <div className="item-detail-rule" />
        <span className="after-line new">+{salvageValue(item)} Ash</span>
        {props.power && (
          <span className="after-line new kindled">
            Power Codex: {props.power.name} · T{props.power.tier}
          </span>
        )}
        {props.learned.map((l) => (
          <span key={`${l.kind}-${l.id}`} className="after-line new kindled">
            Codex: {partName(l.kind, l.id)} · new
          </span>
        ))}
      </div>
    );
  }
  if (kind === "kindle") {
    const k = props.kindle;
    const affix = k ? kindledAffix(k.conditionId, k.effectId) : undefined;
    return (
      <div className={`craft-card panel-card dashed ${rarityClass(item)}`}>
        <ItemHead item={item} label="AFTER" />
        {item.affixes.map((_, i) =>
          i === k?.index ? null : (
            <span key={i} className="after-line">
              {affixText(item, i).text}
            </span>
          ),
        )}
        {k && affix ? (
          <span className="after-line new kindled">
            <span className="locked-in">UP TO</span>{" "}
            {describeTrigger(resolveTrigger(affix, item.tier, CODEX.kindleMaxQuality))}
          </span>
        ) : (
          <span className="after-line sub">? new trigger</span>
        )}
      </div>
    );
  }
  if (kind === "upgrade") {
    const up = upgradedItem(item);
    return (
      <div className={`craft-card panel-card dashed ${rarityClass(item)}`}>
        <ItemHead item={up} label="AFTER" />
        {item.affixes.map((_, i) => {
          const before = affixText(item, i).text;
          const now = affixText(up, i).text;
          return (
            <span key={i} className={`after-line ${before !== now ? "new" : ""}`}>
              {now}
            </span>
          );
        })}
      </div>
    );
  }
  if (kind === "awaken" || kind === "shift" || kind === "intensify") {
    const g = item.greater;
    const rank = kind === "intensify" && g ? Math.min(5, g.rank + 1) : (g?.rank ?? 1);
    const raised = kind === "intensify" && g ? { ...item, greater: { ...g, rank } } : item;
    return (
      <div className={`craft-card panel-card dashed ${rarityClass(item)}`}>
        <ItemHead item={item} label="AFTER" />
        {item.affixes.map((_, i) => {
          const sure = kind === "intensify" && g?.index === i;
          return (
            <span key={i} className={`after-line ${sure ? "new" : ""}`}>
              {affixText(sure ? raised : item, i).text}
              {sure && <span className="greater-mark">{greaterName(rank)}</span>}
            </span>
          );
        })}
        {kind !== "intensify" && (
          <span className="after-line new">? a random affix becomes {greaterName(rank)}</span>
        )}
      </div>
    );
  }
  if (kind === "reforge") {
    return (
      <div className={`craft-card panel-card dashed ${rarityClass(item)}`}>
        <ItemHead item={{ ...item, name: "New name" }} label="AFTER" />
        {item.affixes.map((_, i) => (
          <span key={i} className="after-line new">
            ? new random affix
          </span>
        ))}
        <span className="sub small">No lock afterwards.</span>
      </div>
    );
  }
  // Temper: only the chosen affix changes.
  return (
    <div className={`craft-card panel-card dashed ${rarityClass(item)}`}>
      <ItemHead item={item} label="AFTER" />
      {item.affixes.map((roll, i) => {
        if (i !== props.affixIndex) {
          return (
            <span key={i} className="after-line">
              {affixText(item, i).text}
            </span>
          );
        }
        return (
          <span key={i} className="after-line new">
            {rangeText(item, roll.affixId)} <span className="locked-in">LOCKED IN</span>
          </span>
        );
      })}
    </div>
  );
}

const kindledAffix = (conditionId: string, effectId: string) => {
  const affix = ITEM_CATALOG.affixes.get(kindledAffixId(conditionId, effectId));
  return affix?.kind === "trigger" ? affix : undefined;
};

export function partName(kind: CodexPartKind, id: string): string {
  const part =
    kind === "condition" ? ITEM_CATALOG.conditions.get(id) : ITEM_CATALOG.effects.get(id);
  return part?.name ?? id;
}

/** Kindle: the learned Conditions and Effects. */
export function KindleParts(props: {
  state: GameState;
  conditionId: string | null;
  effectId: string | null;
  onCondition: (id: string) => void;
  onEffect: (id: string) => void;
}) {
  const codex = props.state.legacy.codex;
  const row = (
    label: string,
    kind: CodexPartKind,
    selected: string | null,
    onPick: (id: string) => void,
  ) => {
    const parts = [
      ...(kind === "condition" ? ITEM_CATALOG.conditions : ITEM_CATALOG.effects).values(),
    ].filter((p) => codexKnows(codex, kind, p.id));
    return (
      <div className="kindle-row" role="radiogroup" aria-label={label}>
        <span className="strong">{label}</span>
        {parts.length === 0 && <span className="sub">Salvage triggers at Thoric.</span>}
        {parts.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected === p.id}
            className={`part-chip ${selected === p.id ? "on" : ""}`}
            onClick={() => onPick(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
    );
  };
  return (
    <div className="kindle-parts">
      {row("Condition", "condition", props.conditionId, props.onCondition)}
      {row("Effect", "effect", props.effectId, props.onEffect)}
    </div>
  );
}
