import { ITEM_CATALOG, GAME_DATA } from "@emberheir/content";
import {
  CODEX,
  type CodexPartKind,
  type CraftCost,
  type LearnedPart,
  codexKnows,
  kindleTargets,
  kindledAffixId,
  learnFromItem,
  type CraftRequest,
  type GameState,
  type Item,
  PROGRESSION,
  SLOT_NAMES,
  affixRollRange,
  applyAction,
  craftBlockReason,
  craftCost,
  describeBonuses,
  getBase,
  matchRuneword,
  runeGroup,
  type ItemSlot,
  describeStat,
  describeTrigger,
  findCraftItem,
  itemSlotFor,
  nextAct,
  resolveTrigger,
  salvageValue,
  statAffixValue,
  upgradedItem,
} from "@emberheir/sim";
import { useState } from "react";
import { Icon } from "../../ui/Icon";
import {
  ItemGrid,
  ItemTile,
  baseSummary,
  fmt,
  rarityClass,
  rarityName,
  walletEntries,
} from "../../ui/items";
import { runeName } from "../../ui/RuneArt";
import { GamblePanel, RuneBoard, RunePouch, SocketRow } from "./RuneViews";
import { CRAFT_BLOCK_TEXT } from "../labels";
import type { GameApi } from "../useGame";
import { Paperdoll, dollBox } from "../../ui/Paperdoll";
import { WeaponSlot } from "../WeaponSlot";
import { PersonaPortrait } from "./art/PersonaArt";
import { PaintDefs } from "./art/paint";

/** Scale of the paperdoll next to the inventory. */
const SIDE_DOLL = 0.85;

export type PersonaId = "thoric" | "liora" | "nyssa" | "marisha";
type ActionKind =
  | "upgrade"
  | "socket"
  | "salvage"
  | "reforge"
  | "temper"
  | "kindle"
  | "rune"
  | "combine"
  | "codex"
  | "gamble";

interface PersonaDef {
  readonly name: string;
  readonly role: string;
  readonly portrait: string;
  readonly accent: string;
  readonly quote: string;
  readonly actions: readonly { k: ActionKind; name: string; desc: string }[];
}

const PERSONAS: Record<PersonaId, PersonaDef> = {
  thoric: {
    name: "Thoric",
    role: "Blacksmith",
    portrait: "#5a3a24",
    accent: "#c9c2b8",
    quote: "Bring it here. If it's bent, I straighten it. If it's broken, I charge extra.",
    actions: [
      { k: "upgrade", name: "Upgrade", desc: "+1 Tier. Rolls keep their quality." },
      { k: "reforge", name: "Reforge", desc: "Reroll all affixes. Removes the lock." },
      { k: "salvage", name: "Salvage", desc: "Break an inventory item down into Ash." },
    ],
  },
  liora: {
    name: "Liora",
    role: "Mystic",
    portrait: "#3a2a5a",
    accent: "#b36bff",
    quote: "Affixes are like moods, dear. I can change one. I cannot change all of them twice.",
    actions: [
      { k: "temper", name: "Temper", desc: "Reroll the value of one affix." },
      { k: "kindle", name: "Kindle", desc: "Build a trigger from the Trigger Codex." },
    ],
  },
  nyssa: {
    name: "Nyssa",
    role: "Runesmith",
    portrait: "#2e4a26",
    accent: "#8fd06a",
    quote: "Three small runes make one bigger rune. It's basically poetry. With rocks.",
    actions: [
      { k: "socket", name: "Add Socket", desc: "+1 Socket on a Normal item." },
      { k: "rune", name: "Socket Rune", desc: "A Rune into a free Socket. Forever." },
      { k: "combine", name: "Combine Runes", desc: "Three of a kind make the next Rune." },
      { k: "codex", name: "Runeword Codex", desc: "Every Runeword you know." },
    ],
  },
  marisha: {
    name: "Marisha",
    role: "Black Market",
    portrait: "#5a4218",
    accent: "#e0c27a",
    quote: "Gamble? Of course. The house always wins. I am the house.",
    actions: [
      { k: "gamble", name: "Gamble", desc: "A random item for a slot. Better odds than loot." },
    ],
  },
};

export const PERSONA_ORDER: readonly PersonaId[] = ["thoric", "liora", "nyssa", "marisha"];

/** Whether a persona travels with the caravan yet. */
export function personaPresent(state: GameState, id: PersonaId): boolean {
  if (id === "liora") return state.progress.trainerUnlocked;
  if (id === "nyssa") return state.progress.runesmithUnlocked;
  return true;
}

const PERSONA_LOCKED: Partial<Record<PersonaId, string>> = {
  liora: "Liora joins after the act boss falls",
  nyssa: "Nyssa waits somewhere in the Rotwood",
};

const ACTION_HINT: Record<ActionKind, string> = {
  upgrade: "Choose any item. Values grow with the Tier.",
  socket: "Normal items only, before the first Rune.",
  rune: "Choose an item with a free Socket, then a Rune.",
  combine: "Choose a Rune you have three of.",
  codex: "A Runeword shows itself once you have found all of its Runes.",
  gamble: "Choose a slot.",
  salvage: "Choose an item from your inventory.",
  reforge: "Base, Tier and Rarity stay. All affixes are rolled anew.",
  temper: "Click the affix to reroll. It stays locked in afterwards.",
  kindle: "Choose an item, then a Condition and an Effect you have learned.",
};

function affixText(item: Item, index: number): { text: string; trigger: boolean } {
  const roll = item.affixes[index];
  const affix = roll ? ITEM_CATALOG.affixes.get(roll.affixId) : undefined;
  if (!roll || !affix) return { text: "?", trigger: false };
  if (affix.kind === "trigger") {
    return {
      text: describeTrigger(resolveTrigger(affix, item.tier, roll.quality)),
      trigger: true,
    };
  }
  return {
    text: describeStat(affix.stat, statAffixValue(affix, item.tier, roll.quality, item.rarity)),
    trigger: false,
  };
}

function rangeText(item: Item, affixId: string): string {
  const affix = ITEM_CATALOG.affixes.get(affixId);
  const range = affixRollRange(item, affixId, ITEM_CATALOG);
  if (!affix || affix.kind !== "stat" || !range) return "?";
  const lo = describeStat(affix.stat, range.min);
  const hi = describeStat(affix.stat, range.max);
  // "+3% Crit Chance" and "+5% Crit Chance" → "+3–5% Crit Chance"
  const m1 = /^([+-]?[\d.,]+)(.*)$/.exec(lo);
  const m2 = /^([+-]?[\d.,]+)(.*)$/.exec(hi);
  if (m1 && m2 && m1[2] === m2[2]) {
    return m1[1] === m2[1] ? lo : `${m1[1]}–${(m2[1] ?? "").replace("+", "")}${m1[2]}`;
  }
  return `${lo} to ${hi}`;
}

function costText(cost: CraftCost): string {
  const parts: string[] = [];
  if (cost.acorns) parts.push(`${fmt(cost.acorns)} Acorns`);
  if (cost.ash) parts.push(`${fmt(cost.ash)} Ash`);
  if (cost.emberCoal) {
    parts.push(`${cost.emberCoal} Ember Coal`);
  }
  if (cost.phoenixFeathers) {
    parts.push(`${cost.phoenixFeathers} Phoenix Feather${cost.phoenixFeathers > 1 ? "s" : ""}`);
  }
  for (const [id, n] of Object.entries(cost.runes)) parts.push(`${n} ${runeName(id)}`);
  return parts.join(" · ") || "Free";
}

function ItemHead(props: { item: Item; label: string; dashed?: boolean }) {
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

/**
 * The Camp's crafters in one view (Persona mock): actions on the left,
 * Now → After in the middle with the cost bar, equipped items and inventory on the right.
 * There is no Undo.
 */
export function PersonaView(props: {
  state: GameState;
  game: GameApi;
  persona: PersonaId;
  onPersona: (p: PersonaId) => void;
  onClose: () => void;
}) {
  const { state, game } = props;
  const def = PERSONAS[props.persona];
  const [kinds, setKinds] = useState<Record<PersonaId, ActionKind>>({
    thoric: "upgrade",
    liora: "temper",
    nyssa: "socket",
    marisha: "gamble",
  });
  const [runeId, setRuneId] = useState<string | null>(null);
  const [slot, setSlot] = useState<ItemSlot | null>(null);
  const [gambled, setGambled] = useState<Item | null>(null);
  const kind = kinds[props.persona];
  const [itemId, setItemId] = useState<string | null>(
    () => state.hero.equipment.offHand?.id ?? state.hero.equipment.body?.id ?? null,
  );
  const [affixIndex, setAffixIndex] = useState<number | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [conditionId, setConditionId] = useState<string | null>(null);
  const [effectId, setEffectId] = useState<string | null>(null);

  const found = itemId ? findCraftItem(state, itemId) : undefined;
  const item = found?.item;
  const equipped = !!found?.slot;
  const targets = item ? kindleTargets(item, ITEM_CATALOG) : [];
  const kindleIndex =
    affixIndex !== null && targets.includes(affixIndex)
      ? affixIndex
      : targets.length === 1
        ? targets[0]
        : null;
  const learned = item ? learnFromItem(state.legacy.codex, item, ITEM_CATALOG).learned : [];

  const pickItem = (id: string) => {
    setItemId(id);
    setAffixIndex(null);
  };
  const pickKind = (k: ActionKind) => {
    setKinds((prev) => ({ ...prev, [props.persona]: k }));
    setAffixIndex(item?.lockedAffix ?? null);
  };

  // --- what the action would do ------------------------------------------------------------
  let request: CraftRequest | null = null;
  if (item && kind === "socket") request = { kind: "addSocket", itemId: item.id };
  else if (item && kind === "rune" && runeId) {
    request = { kind: "socketRune", itemId: item.id, runeId };
  } else if (kind === "combine" && runeId) request = { kind: "combineRunes", runeId };
  else if (kind === "gamble" && slot) request = { kind: "gamble", slot };
  else if (item && (kind === "upgrade" || kind === "reforge")) request = { kind, itemId: item.id };
  else if (item && kind === "temper" && affixIndex !== null) {
    request = { kind, itemId: item.id, affixIndex };
  } else if (item && kind === "kindle" && conditionId && effectId && kindleIndex !== null) {
    request = {
      kind,
      itemId: item.id,
      conditionId,
      effectId,
      ...(kindleIndex !== undefined ? { affixIndex: kindleIndex } : {}),
    };
  }

  let cost = "";
  let block: string | null = null;
  if (kind === "codex") {
    block = null;
  } else if (
    !request &&
    (kind === "rune" || kind === "combine" || kind === "gamble" || kind === "socket")
  ) {
    block =
      kind === "rune"
        ? !item
          ? "Choose an item"
          : "Choose a Rune"
        : kind === "combine"
          ? "Choose a Rune"
          : kind === "gamble"
            ? "Choose a slot"
            : "Choose an item";
  } else if (kind === "kindle" && !request) {
    block = !item
      ? "Choose an item"
      : targets.length === 0
        ? CRAFT_BLOCK_TEXT.noTriggerPlace
        : kindleIndex === null
          ? CRAFT_BLOCK_TEXT.notTrigger
          : "Choose a Condition and an Effect";
  } else if (kind === "salvage") {
    cost = item ? `Free · +${salvageValue(item)} Ash` : "Free";
    block = !item
      ? "Choose an item"
      : equipped
        ? "Only from the inventory. Unequip it first."
        : null;
  } else if (!request) {
    cost = costText(craftCost({ kind: "reforge", itemId: "" }));
    if (kind === "temper")
      cost = costText(craftCost({ kind: "temper", itemId: "", affixIndex: 0 }));
    block = !item ? "Choose an item" : "Choose an affix";
  } else {
    cost = costText(craftCost(request, item, GAME_DATA, state));
    const reason = craftBlockReason(state, GAME_DATA, request);
    block = reason ? CRAFT_BLOCK_TEXT[reason] : null;
  }
  // Locked-out affixes and triggers say so even before an affix is picked.
  if (item && kind === "temper" && item.affixes.length === 0) {
    block = CRAFT_BLOCK_TEXT.noAffixes;
  }

  const run = () => {
    if (block) return;
    if (kind === "salvage" && item) {
      const names = learned.map((l) => partName(l.kind, l.id)).join(", ");
      setLast(
        `Salvaged ${item.name}: +${salvageValue(item)} Ash${names ? ` · Codex: ${names}` : ""}`,
      );
      game.dispatch({ type: "salvage", itemId: item.id });
      setItemId(null);
      return;
    }
    if (!request) return;
    // The sim is deterministic, so this preview is exactly what the dispatch will do.
    let after: GameState;
    try {
      after = applyAction(state, GAME_DATA, { type: "craft", request });
    } catch {
      game.dispatch({ type: "craft", request });
      return;
    }
    const next = "itemId" in request ? findCraftItem(after, request.itemId)?.item : undefined;
    switch (request.kind) {
      case "addSocket":
        setLast(`${next?.name ?? "Item"} now has ${next?.sockets ?? 0} Sockets`);
        break;
      case "socketRune": {
        const word = next?.runes?.length === next?.sockets ? next?.name : undefined;
        setLast(
          word &&
            word !== item?.name &&
            after.legacy.runewords.length > state.legacy.runewords.length
            ? `Runeword forged: ${word}!`
            : `Socketed ${runeName(request.runeId)}`,
        );
        if ((after.wallet.runes[request.runeId] ?? 0) === 0) setRuneId(null);
        break;
      }
      case "combineRunes": {
        const made = Object.keys(after.wallet.runes).find(
          (id) => (after.wallet.runes[id] ?? 0) > (state.wallet.runes[id] ?? 0),
        );
        setLast(`Three ${runeName(request.runeId)} became ${made ? runeName(made) : "?"}`);
        if ((after.wallet.runes[request.runeId] ?? 0) < 3) setRuneId(null);
        break;
      }
      case "gamble": {
        const fresh = after.inventory.find(
          (p) => !state.inventory.some((q) => q.item.id === p.item.id),
        );
        setGambled(fresh?.item ?? null);
        setLast(fresh ? `Gambled: ${fresh.item.name}` : "Gambled");
        break;
      }
      case "upgrade":
        setLast(`${next?.name ?? "Item"} is now Tier ${next?.tier ?? "?"}`);
        break;
      case "reforge":
        setLast(`Reforged into ${next?.name ?? "?"}`);
        break;
      case "kindle": {
        const index = request.affixIndex ?? item?.affixes.length ?? 0;
        if (next) setLast(`Kindled: ${affixText(next, index).text}`);
        break;
      }
      case "temper":
        if (item && next) {
          setLast(
            `${affixText(item, request.affixIndex).text} → ${affixText(next, request.affixIndex).text}`,
          );
        }
        break;
    }
    game.dispatch({ type: "craft", request });
  };

  const actionName = def.actions.find((a) => a.k === kind)?.name ?? "";
  const after = item;
  const itemCenter = [
    "upgrade",
    "socket",
    "salvage",
    "reforge",
    "temper",
    "kindle",
    "rune",
  ].includes(kind);

  return (
    <section className="screen persona-view" aria-label={`${def.name}, ${def.role}`}>
      <PaintDefs />
      <header className="persona-header bar-top">
        <span className="title-font eyebrow-big">
          CAMP · {nextAct(state, GAME_DATA).name.toUpperCase()}
        </span>
        <div className="tabs" role="tablist">
          {PERSONA_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={props.persona === p}
              className={`tab title-font ${props.persona === p ? "on" : ""}`}
              disabled={!personaPresent(state, p)}
              title={personaPresent(state, p) ? undefined : PERSONA_LOCKED[p]}
              onClick={() => props.onPersona(p)}
            >
              {PERSONAS[p].name} · {PERSONAS[p].role}
            </button>
          ))}
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

      <div className="persona-body">
        <aside className="persona-left">
          <div className="persona-head">
            <div
              className="persona-portrait big title-font"
              style={{ background: def.portrait, borderColor: def.accent }}
            >
              <PersonaPortrait id={props.persona} />
            </div>
            <div className="plaque-names">
              <span className="title-font huge">{def.name}</span>
              <span className="sub">{def.role}</span>
            </div>
          </div>
          <blockquote className="persona-quote" style={{ borderColor: def.accent }}>
            &ldquo;{def.quote}&rdquo;
          </blockquote>
          <div className="persona-actions">
            {def.actions.map((a) => (
              <button
                key={a.k}
                type="button"
                className={`persona-action ${kind === a.k ? "on" : ""}`}
                aria-pressed={kind === a.k}
                onClick={() => pickKind(a.k)}
              >
                <span className="title-font">{a.name}</span>
                <span className="sub">{a.desc}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="persona-center">
          <div className="center-head">
            <span className="title-font huge">{actionName}</span>
            <span className="sub">{ACTION_HINT[kind]}</span>
          </div>

          {kind === "combine" || kind === "codex" ? (
            <RuneBoard state={state} mode={kind} selected={runeId} onSelect={setRuneId} />
          ) : kind === "gamble" ? (
            <GamblePanel state={state} selected={slot} onSelect={setSlot} last={gambled} />
          ) : !itemCenter ? null : item ? (
            <div className="now-after">
              <div className={`craft-card panel-card ${rarityClass(item)}`} data-testid="craft-now">
                <ItemHead item={item} label={`NOW · ${equipped ? "EQUIPPED" : "INVENTORY"}`} />
                {(kind === "rune" || kind === "socket") && (
                  <SocketRow sockets={item.sockets ?? 0} runes={item.runes ?? []} />
                )}
                {item.affixes.length === 0 && kind !== "rune" && kind !== "socket" && (
                  <span className="sub">No affixes</span>
                )}
                {item.affixes.map((_, i) => {
                  const t = affixText(item, i);
                  const kindleMode = kind === "kindle";
                  const pickable = kind === "temper" || kindleMode;
                  const lockedOut = item.lockedAffix !== undefined && item.lockedAffix !== i;
                  const disabled = kindleMode
                    ? !targets.includes(i) || lockedOut
                    : !pickable || lockedOut || t.trigger;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`affix-line ${t.trigger ? "trigger" : ""} ${item.affixes[i]?.kindled ? "kindled" : ""} ${(kindleMode ? kindleIndex === i : affixIndex === i && pickable) ? "on" : ""}`}
                      disabled={disabled}
                      title={
                        t.trigger && pickable && !kindleMode
                          ? "Trigger Affixes cannot be changed"
                          : lockedOut && pickable
                            ? "Locked: only the locked-in affix can change"
                            : undefined
                      }
                      onClick={() => setAffixIndex(i)}
                    >
                      <span className="grow">{t.text}</span>
                      {lockedOut && <Icon name="lock" size={14} />}
                      {item.lockedAffix === i && <span className="locked-in">LOCKED IN</span>}
                    </button>
                  );
                })}
              </div>
              <div className="arrow">→</div>
              <AfterCard
                item={after}
                kind={kind}
                affixIndex={kind === "kindle" ? (kindleIndex ?? null) : affixIndex}
                runeId={runeId}
                learned={learned}
                kindle={
                  conditionId && effectId && kindleIndex !== null
                    ? {
                        conditionId,
                        effectId,
                        index: kindleIndex ?? item.affixes.length,
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="empty-pick panel-card sub">Choose an item on the right.</div>
          )}

          {kind === "rune" && <RunePouch state={state} selected={runeId} onSelect={setRuneId} />}

          {kind === "kindle" && (
            <KindleParts
              state={state}
              conditionId={conditionId}
              effectId={effectId}
              onCondition={setConditionId}
              onEffect={setEffectId}
            />
          )}

          <div className="grow" />
          {last && (
            <div className="craft-last panel-card" role="status">
              {last}
            </div>
          )}
          {kind !== "codex" && (
            <div className="cost-bar panel-card">
              <div className="cost-text">
                <span className="eyebrow">COST</span>
                <span className="mono strong">{cost}</span>
                <span className={block ? "block warn" : "block ok"}>
                  {block ?? "Ready. There is no Undo."}
                </span>
              </div>
              <button type="button" className="btn big primary" disabled={!!block} onClick={run}>
                {actionName}
              </button>
            </div>
          )}
        </main>

        <aside className="persona-right">
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
                    selected={!!it && it.id === itemId}
                    {...(it ? { onSelect: () => pickItem(it.id) } : {})}
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
            selected={itemId}
            onSelect={pickItem}
            label="Inventory"
          />
        </aside>
      </div>
    </section>
  );
}

function AfterCard(props: {
  item: Item | undefined;
  kind: ActionKind;
  affixIndex: number | null;
  runeId: string | null;
  learned: readonly LearnedPart[];
  kindle: { conditionId: string; effectId: string; index: number } | undefined;
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

function partName(kind: CodexPartKind, id: string): string {
  const part =
    kind === "condition" ? ITEM_CATALOG.conditions.get(id) : ITEM_CATALOG.effects.get(id);
  return part?.name ?? id;
}

/** Kindle: the learned Conditions and Effects. */
function KindleParts(props: {
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
