import { GAME_DATA } from "@emberheir/content";
import {
  type EquipmentSlot,
  type GameAction,
  type Item,
  type GameState,
  PROGRESSION,
  SLOT_NAMES,
  type RunState,
  type SpoilsCard,
  applyAction,
  damageShare,
  deriveStats,
  heroReactions,
  equipBlockReason,
  getAct,
  getBase,
  heroSetup,
  rewardsDone,
  salvageValue,
  takeBlockReason,
  targetSlot,
  itemSlotFor,
  levelCap,
  xpToNextLevel,
} from "@emberheir/sim";
import { useCallback, useEffect, useState } from "react";
import { Icon, type IconName } from "../ui/Icon";
import {
  ItemDetail,
  ItemTile,
  compareWithEquipped,
  fmt,
  rarityClass,
  walletEntries,
} from "../ui/items";
import { RunHeader } from "./RunHeader";
import { BoonBar, ShrineCards } from "./Boons";
import { EQUIP_BLOCK_TEXT, spoilsHint, spoilsLabel } from "./labels";
import type { GameApi } from "./useGame";
import { Paperdoll, dollBox } from "../ui/Paperdoll";
import { RuneStone, runeName } from "../ui/RuneArt";
import { ItemArt } from "../ui/ItemArt";
import { type DropSound, playSound } from "../ui/sound";
import { skillIcon, skillTint } from "./battle/skills";
import { ShareBar } from "./camp/KaelenView";

const SPOILS_LOOK: Record<SpoilsCard["kind"], { icon: IconName; tint: string }> = {
  flaskCharge: { icon: "flask", tint: "#c9322a" },
  reforgeStones: { icon: "stone", tint: "#2d5bd0" },
  essence: { icon: "drop", tint: "#6b5a3e" },
  kindling: { icon: "fire", tint: "#e0782a" },
};

/**
 * NEXT STAGE as one step: finish the rewards, start the fight. The flask is only drunk by
 * hand. After the boss, `continue` goes back to the Camp instead.
 */
export function nextStageActions(state: GameState): GameAction[] {
  const actions: GameAction[] = [];
  let s = state;
  const step = (a: GameAction) => {
    actions.push(a);
    s = applyAction(s, GAME_DATA, a);
  };
  try {
    if (s.run?.phase === "rewards") step({ type: "continue" });
    const run = s.run;
    if (run?.phase !== "intermission") return actions;
    step({ type: "startStage" });
  } catch {
    // useGame shows the error when it applies the same actions.
  }
  return actions;
}

function HeroCard(props: { state: GameState; run: RunState; game: GameApi }) {
  const { state, run, game } = props;
  const hero = state.hero;
  const maxLife = deriveStats(heroSetup(state, GAME_DATA).setup).maxLife;
  const lifePct = Math.round(run.lifeFraction * 100);
  const canDrink = state.flaskCharges > 0 && run.lifeFraction < 1;
  const heal = canDrink ? Math.min(PROGRESSION.flaskHeal * 100, 100 - lifePct) : 0;
  const flaskMax = Math.max(PROGRESSION.flaskStartCharges, state.flaskCharges);
  const gained = run.rewards?.xp ?? 0;
  const next = xpToNextLevel(hero.level, levelCap(state.legacy.prestige));
  return (
    <section className="panel-card hero-card" aria-label="Hero">
      <div className="hero-card-head">
        <div className="plaque-portrait">
          <Icon name="user" size={24} color="#f3e6c8" />
        </div>
        <div className="plaque-names">
          <span className="plaque-name title-font">Heir of the Ember</span>
          <span className="sub">
            Level {hero.level}
            {gained > 0 ? ` · +${fmt(gained)} XP` : ""}
          </span>
        </div>
      </div>
      {run.rewards && run.rewards.levelsGained > 0 && (
        <div className="level-up title-font" role="status">
          Level up! +{run.rewards.levelsGained * PROGRESSION.attributePointsPerLevel} Attribute
          Points
        </div>
      )}
      <div className="xp-line sub">
        {Number.isFinite(next) ? (
          <>
            XP {fmt(hero.xp)} / {fmt(next)}
          </>
        ) : (
          "Level cap reached"
        )}
      </div>
      <BoonBar state={state} />
      <div className="life-head">
        <span className="title-font">Life</span>
        <span className="mono">
          {fmt(run.lifeFraction * maxLife)} / {fmt(maxLife)}
        </span>
      </div>
      <div
        className="bar-life big"
        role="meter"
        aria-label="Life"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={lifePct}
      >
        <div className="fill" style={{ width: `${lifePct}%` }} />
        {heal > 0 && (
          <div className="heal-preview" style={{ left: `${lifePct}%`, width: `${heal}%` }} />
        )}
        <span className="bar-label">{lifePct}%</span>
      </div>
      <div className="flask-row">
        <div className="flask-pips">
          {Array.from({ length: flaskMax }, (_, i) => (
            <span key={i} className={`flask-pip ${i < state.flaskCharges ? "full" : ""}`} />
          ))}
        </div>
        <button
          type="button"
          className="btn primary"
          disabled={!canDrink}
          onClick={() => game.dispatch({ type: "useFlask" })}
        >
          <Icon name="flask" size={16} />
          {canDrink
            ? `Drink +${Math.round(heal)}% Life`
            : state.flaskCharges > 0
              ? "Life full"
              : "Flask empty"}
        </button>
      </div>
    </section>
  );
}

/** The Battle Plan at a glance, with each slot's damage share in the last fight. */
function PlanCard(props: { state: GameState; run: RunState; onPlan: () => void }) {
  const { state, run } = props;
  const { setup } = heroSetup(state, GAME_DATA);
  const reactions = heroReactions(state, GAME_DATA, setup.weapon);
  const report = run.rewards?.report;
  const rows = [
    ...setup.rotation.map((r) => ({ id: r.skill.id, name: r.skill.name, reaction: false })),
    ...reactions.map((r) => ({ id: r.skill.id, name: r.skill.name, reaction: true })),
  ];
  return (
    <section className="panel-card plan-card" aria-label="Battle Plan">
      <span className="eyebrow">Battle Plan</span>
      <ul>
        {rows.map((r) => (
          <li key={`${r.id}-${r.reaction}`} className={r.reaction ? "reaction" : ""}>
            <span className="skill-chip" style={{ background: skillTint(r.id) }}>
              <Icon name={skillIcon(r.id)} size={16} color="#fff6e4" />
            </span>
            <span className="plan-card-name">{r.name}</span>
            {report &&
              (r.reaction ? (
                <span className="mono small">
                  ×{report.reactions.find((x) => x.skill === r.name)?.casts ?? 0}
                </span>
              ) : (
                <ShareBar share={damageShare(report, r.name)} />
              ))}
          </li>
        ))}
      </ul>
      <button type="button" className="btn" onClick={props.onPlan}>
        <Icon name="cycle" size={16} />
        Edit Battle Plan
      </button>
    </section>
  );
}

function UpNext(props: { run: RunState }) {
  const { run } = props;
  const act = getAct(GAME_DATA, run.actId);
  const stages = act.stages;
  // During the rewards the next stage is stage + 1.
  const next = run.phase === "rewards" ? run.stage + 1 : run.stage;
  if (run.phase === "rewards" && run.encounter?.boss) {
    return (
      <section className="panel-card up-next" aria-label="Up next">
        <span className="eyebrow">Up next</span>
        <div className="up-row">
          <span className="title-font">Back to Camp</span>
          <span className="sub">{act.name} cleared</span>
        </div>
      </section>
    );
  }
  const spoils = act.spoilsStages.find((s) => s >= next);
  return (
    <section className="panel-card up-next" aria-label="Up next">
      <span className="eyebrow">Up next</span>
      <div className="up-row">
        <span className="title-font">Stage {next}</span>
        <span className="sub">{act.name}</span>
      </div>
      {spoils !== undefined && (
        <div className="up-row">
          <span className="spoils-mark" />
          <span>Spoils</span>
          <span className="sub">
            Stage {spoils} · {spoils === next ? "now" : `in ${spoils - next}`}
          </span>
        </div>
      )}
      <div className="up-row">
        <Icon name="boss" size={16} color="#ff8a1f" />
        <span>Boss: {act.boss.name}</span>
        <span className="sub">
          Stage {stages} · {stages === next ? "now" : `in ${stages - next}`}
        </span>
      </div>
    </section>
  );
}

const TOP_RUNE_RANK = Math.max(...[...GAME_DATA.items.runes.values()].map((r) => r.rank));
const isHighRune = (id: string) =>
  (GAME_DATA.items.runes.get(id)?.rank ?? 0) > TOP_RUNE_RANK - PROGRESSION.highRuneRanks;

/** Runes fall onto the ground with a glowing glyph and a clink before they go to the pouch. */
function RuneDrops(props: { runes: readonly string[] }) {
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
  if (props.taken) {
    return (
      <div className="card-buttons">
        <span className="taken-stamp title-font">Taken</span>
      </div>
    );
  }
  const equipReason = equipBlockReason(state, GAME_DATA, item, "pick");
  const takeReason = takeBlockReason(state, GAME_DATA, item);
  return (
    <div className="card-buttons">
      <button
        type="button"
        className="btn primary"
        disabled={equipReason !== undefined}
        title={
          equipReason
            ? EQUIP_BLOCK_TEXT[equipReason]
            : "Swap in, the old item goes to the inventory"
        }
        onClick={() => game.dispatch({ type: "pickItem", index, mode: "equip" })}
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

function ItemCards(props: {
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
              compare={taken.has(pick) ? undefined : compareWithEquipped(state, detail)}
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
              compare={compareWithEquipped(state, item)}
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
function EquippedPanel(props: {
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

function SpoilsCards(props: { run: RunState; game: GameApi }) {
  const rewards = props.run.rewards;
  if (!rewards) return null;
  const act = getAct(GAME_DATA, props.run.actId);
  return (
    <div className="spoils-cards">
      {rewards.spoils.map((card, i) => {
        const look = SPOILS_LOOK[card.kind];
        return (
          <button
            key={card.kind}
            type="button"
            className="spoils-card panel-card"
            onClick={() => props.game.dispatch({ type: "pickSpoils", index: i })}
          >
            <span className="spoils-icon" style={{ background: look.tint }}>
              <Icon name={look.icon} size={40} color="#fff6e4" />
            </span>
            <strong className="title-font">{spoilsLabel(card, act.essence.name)}</strong>
            <span className="sub">{spoilsHint(card)}</span>
          </button>
        );
      })}
    </div>
  );
}

function DoneCard(props: { run: RunState }) {
  const { run } = props;
  const act = getAct(GAME_DATA, run.actId);
  const rewards = run.rewards;
  let line: string;
  let sub: string;
  if (!rewards) {
    const boss = run.stage === act.stages;
    line = boss ? `${act.boss.name} waits` : `Stage ${run.stage} ahead`;
    sub = run.stage === 1 ? "The caravan watches you go." : "Catch your breath.";
  } else {
    const pick = rewards.itemPick;
    const item = pick && pick.kind !== "salvageAll" ? rewards.items[pick.index] : undefined;
    line = item
      ? `${pick?.kind === "equip" ? "Equipped" : "Taken"}: ${item.name}`
      : "All items salvaged";
    const spoil = rewards.spoilsPick !== null ? rewards.spoils[rewards.spoilsPick] : undefined;
    sub = spoil
      ? `Spoils: ${spoilsLabel(spoil, act.essence.name)}`
      : rewards.spoils.length
        ? ""
        : "No spoils this stage";
    const boon = rewards.boonPick != null ? rewards.boonOffer?.[rewards.boonPick] : undefined;
    const boonName = boon && GAME_DATA.boons?.find((b) => b.id === boon.id)?.name;
    if (boonName) sub += `${sub ? " · " : ""}Boon: ${boonName}`;
    if (rewards.salvagedDust > 0)
      sub += `${sub ? " · " : ""}+${rewards.salvagedDust} Dust from salvage`;
  }
  return (
    <div className="done-card panel-card" data-testid="done-card">
      <Icon name="fire" size={40} color="var(--accent)" />
      <strong className="title-font">{line}</strong>
      <span className="sub">{sub}</span>
    </div>
  );
}

/**
 * Between two stages (Intermission mock): the rewards of the last fight (item pick, then
 * spoils), Life and the Ember Flask, what comes next, and NEXT STAGE.
 */
export function IntermissionView(props: {
  state: GameState;
  run: RunState;
  game: GameApi;
  onCharacter: () => void;
  onTree: () => void;
  onPlan: () => void;
  onMenu: () => void;
}) {
  const { state, run, game } = props;
  const act = getAct(GAME_DATA, run.actId);
  const rewards = run.rewards;
  const [focus, setFocus] = useState<EquipmentSlot | undefined>(undefined);
  const step = !rewards
    ? "ready"
    : rewards.itemPick === null
      ? "items"
      : rewards.spoils.length > 0 && rewards.spoilsPick === null
        ? "spoils"
        : rewards.boonOffer?.length && rewards.boonPick == null
          ? "shrine"
          : "done";
  const done = step === "ready" || step === "done";
  const nextStage = run.phase === "rewards" ? run.stage + 1 : run.stage;
  const boss = run.encounter?.boss === true && run.phase === "rewards";
  const title =
    step === "spoils"
      ? "SPOILS"
      : step === "shrine"
        ? "EMBER SHRINE"
        : step === "ready"
          ? "READY"
          : "VICTORY";
  const subtitle =
    step === "items"
      ? rewards && rewards.items.length > 3
        ? `${rewards.thief === "caught" ? "Ember Thief caught" : "Boss Hoard"} · choose ${(rewards.picks ?? 1) - (rewards.taken?.length ?? 0)} of ${rewards.items.length}`
        : rewards?.thief === "escaped"
          ? "The thief got away · choose 1 of 3 items"
          : "Choose 1 of 3 items"
      : step === "spoils"
        ? `${rewards?.rank === "boss" ? "Boss defeated" : rewards?.rank === "elite" ? "Elite defeated" : `Stage ${run.stage}`} · choose 1 of 3 spoils`
        : step === "shrine"
          ? "Steal 1 of 3 sparks"
          : boss
            ? `${act.name} cleared`
            : `Ready for Stage ${nextStage}`;
  const anyBlocked =
    step === "items" &&
    (rewards?.items ?? []).some((it) => takeBlockReason(state, GAME_DATA, it) !== undefined);
  const gains: Record<string, number> = rewards
    ? {
        gold: rewards.gold,
        dust: rewards.dust + rewards.salvagedDust,
        reforge: rewards.reforgeStones,
        shards: rewards.ascensionShards,
      }
    : {};

  return (
    <section className="screen intermission" aria-label="Intermission">
      <RunHeader
        act={act}
        stage={run.stage}
        sub={rewards ? `Stage ${run.stage} cleared` : `Stage ${run.stage} next`}
        cleared={!!rewards}
        attributePoints={state.hero.unspentAttributePoints}
        skillPoints={state.hero.unspentSkillPoints}
        onCharacter={props.onCharacter}
        onTree={props.onTree}
        onMenu={props.onMenu}
      />
      <div className="intermission-body">
        <aside className="intermission-left">
          <HeroCard state={state} run={run} game={game} />
          <UpNext run={run} />
          <PlanCard state={state} run={run} onPlan={props.onPlan} />
        </aside>
        <main className="intermission-center">
          <h2 className="screen-title title-font">{title}</h2>
          <p className="screen-sub">{subtitle}</p>
          {rewards && step !== "ready" && (
            <p className="auto-rewards sub" data-testid="auto-rewards">
              +{fmt(rewards.xp)} XP · +{fmt(rewards.gold)} Gold · +{fmt(rewards.dust)} Dust
              {rewards.reforgeStones > 0 ? ` · +${rewards.reforgeStones} Reforge Stones` : ""}
              {rewards.ascensionShards > 0
                ? ` · +${rewards.ascensionShards} Ascension Shard${rewards.ascensionShards > 1 ? "s" : ""}`
                : ""}
            </p>
          )}
          {rewards && step !== "ready" && rewards.runes.length > 0 && (
            <RuneDrops key={run.encounter?.seed ?? run.stage} runes={rewards.runes} />
          )}
          {step === "items" && (
            <ItemCards
              key={run.encounter?.seed ?? run.stage}
              state={state}
              run={run}
              game={game}
              onFocus={setFocus}
            />
          )}
          {step === "spoils" && <SpoilsCards run={run} game={game} />}
          {step === "shrine" && <ShrineCards state={state} run={run} game={game} />}
          {done && <DoneCard run={run} />}
          {step === "items" && (
            <div className="inventory-line">
              <button
                type="button"
                className="btn"
                title="Unpicked items become Salvage Dust"
                onClick={() => game.dispatch({ type: "salvageAll" })}
              >
                {rewards?.taken?.length ? "Salvage the Rest" : "Salvage All"} · +
                {(rewards?.items ?? [])
                  .filter((_, i) => !rewards?.taken?.some((t) => t.index === i))
                  .reduce((n, it) => n + salvageValue(it), 0)}{" "}
                Dust
              </button>
            </div>
          )}
        </main>
        <EquippedPanel
          state={state}
          focus={
            focus ??
            (step === "items" && rewards?.items[0]
              ? targetSlot(rewards.items[0], GAME_DATA, state.hero.equipment)
              : undefined)
          }
          onFocus={setFocus}
          inventoryFull={anyBlocked}
          onInventory={props.onCharacter}
        />
      </div>
      <footer className="intermission-footer bar-bottom">
        <div className="wallet-row" aria-label="Wallet">
          {walletEntries(state).map((w) => (
            <div key={w.key} className="wallet-entry">
              <span className="mono">
                {fmt(w.value)}
                {(gains[w.key] ?? 0) > 0 && (
                  <span className="gain"> +{fmt(gains[w.key] ?? 0)}</span>
                )}
              </span>
              <span className="sub">{w.name}</span>
            </div>
          ))}
        </div>
        <div className="grow" />
        <button
          type="button"
          className="btn big primary next-stage"
          disabled={!done || (rewards !== null && !rewardsDone(rewards))}
          onClick={() => game.dispatchAll(nextStageActions(state))}
        >
          {boss ? "RETURN TO CAMP" : nextStage === act.stages ? "FACE THE BOSS" : "NEXT STAGE"}
          <Icon name="strike" size={18} />
        </button>
        {!boss && (
          <button
            type="button"
            className="btn ghost"
            disabled={!done}
            title={
              done
                ? "Back to Camp. Gear and levels stay, this act's Boons burn."
                : "Pick your rewards first"
            }
            onClick={() => game.dispatch({ type: "retreat" })}
          >
            <Icon name="retreat" size={16} />
            Retreat to Camp
          </button>
        )}
      </footer>
    </section>
  );
}
