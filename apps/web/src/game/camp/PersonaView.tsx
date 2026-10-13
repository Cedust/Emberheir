import { GAME_DATA, ITEM_CATALOG } from "@emberheir/content";
import {
  applyAction,
  craftBlockReason,
  craftCost,
  type CraftRequest,
  findCraftItem,
  type GameState,
  type Item,
  type ItemSlot,
  itemSlotFor,
  kindleTargets,
  learnFromItem,
  nextAct,
  PROGRESSION,
  salvageValue,
  SLOT_NAMES,
} from "@emberheir/sim";
import { useState } from "react";
import { Icon } from "../../ui/Icon";
import { fmt, ItemGrid, ItemTile, rarityClass, walletEntries } from "../../ui/items";
import { dollBox, Paperdoll } from "../../ui/Paperdoll";
import { runeName } from "../../ui/RuneArt";
import { CRAFT_BLOCK_TEXT } from "../labels";
import type { GameApi } from "../useGame";
import { WeaponSlot } from "../WeaponSlot";
import { PaintDefs } from "./art/paint";
import { PersonaPortrait } from "./art/PersonaArt";
import { AfterCard, ItemHead, KindleParts, partName } from "./PersonaCards";
import {
  ACTION_HINT,
  type ActionKind,
  affixText,
  costText,
  PERSONA_LOCKED,
  PERSONA_ORDER,
  type PersonaId,
  personaPresent,
  PERSONAS,
  SIDE_DOLL,
} from "./personaDefs";
import { GamblePanel, RuneBoard, RunePouch, SocketRow } from "./RuneViews";

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
