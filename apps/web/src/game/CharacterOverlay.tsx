import { GAME_DATA } from "@emberheir/content";
import {
  heroClassOf,
  ASHBORN,
  ATTRIBUTES,
  ATTRIBUTE_RULES,
  type Attribute,
  type Attributes,
  type EquipmentSlot,
  type GameState,
  type Item,
  PROGRESSION,
  deriveStats,
  equipBlockReason,
  estimateDps,
  heatPerSecond,
  boonEffects,
  heroBoons,
  heroSetup,
  heroTitle,
  unequipBlockReason,
  bossLevel,
  levelCap,
  xpToNextLevel,
  DEFENSE_NOTES,
  emberPenalty,
  emberPenaltyLine,
  describeItem,
  flaskCapacity,
  itemModifiers,
  speedValue,
} from "@emberheir/sim";
import type { NoteHover } from "../ui/ItemTooltip";
import { heroWeaponTip } from "../ui/weaponTip";
import { useState } from "react";
import { HeirEmblem } from "./ClassEmblem";
import {
  type GridContext,
  ItemGrid,
  ItemTile,
  RingSwitch,
  rarityClass,
  slotLabel,
} from "../ui/items";
import { Button, HoldButton } from "../ui/kit/Button";
import { Wallet } from "../ui/kit/Currency";
import { EmptyState } from "../ui/kit/Marker";
import { useStageSize } from "../ui/Stage";
import { Medallion, type TabItem, Tabs, Window, WindowHeader, WindowLayer } from "../ui/kit/Window";
import { HeirFace } from "./camp/CampFigures";
import { aimedSlot, preferredSlotFor, resetRingSlot, useRingSlot } from "../ui/ringSlot";
import { itemDrops } from "./itemDrops";
import { EQUIP_BLOCK_TEXT, UNEQUIP_BLOCK_TEXT } from "./labels";
import type { GameApi } from "./useGame";
import { HeroDoll, type HeroSlotProps } from "./character/HeroDoll";
import { PinContext, usePins } from "./character/pins";
import {
  DefensePanel,
  type GearPower,
  type GearTrigger,
  HeatPanel,
  OffensePanel,
  type StatPage,
  StatPages,
  TriggersPanel,
  type WeaponNumbers,
} from "./character/StatTabs";
import { AshbornPanel } from "./AshbornPanel";
import { PointChip } from "../ui/kit/Points";
import { AttributeStones, NO_POINTS } from "./AttributeStones";

type Tab = "Overview" | "Attributes" | "Stats" | "Ashborn";

/** Stage width the window frame, the attributes (420) and the bag (464) take from the hero. */
const HERO_ROOM = 960;

/**
 * Character (Character mock): paperdoll, attributes with pending points (Confirm / Undo),
 * stats in tabs, the inventory grid and the item detail with compare. During a fight it is
 * view only.
 */
export function CharacterOverlay(props: {
  state: GameState;
  game: GameApi;
  inFight: boolean;
  onClose: () => void;
}) {
  const { state, game, inFight } = props;
  const stageSize = useStageSize();
  const [pending, setPending] = useState<Record<Attribute, number>>(NO_POINTS);
  const [selected, setSelected] = useState<string | null>(null);
  // Open where something waits: free Attribute Points, else the key numbers.
  const [tab, setTab] = useState<Tab>(
    !inFight && state.hero.unspentAttributePoints > 0 ? "Attributes" : "Overview",
  );
  const [page, setPage] = useState<StatPage>("Offense");
  const pins = usePins();
  // Ashborn opens at level 100 (neuausrichtung-v1.md 7.3).
  const ashbornOpen =
    state.hero.level >= ASHBORN.fromLevel && (GAME_DATA.ashbornValues?.length ?? 0) > 0;
  useRingSlot();
  const drops = itemDrops(state, game);
  const spent = ATTRIBUTES.reduce((n, a) => n + pending[a], 0);
  const left = state.hero.unspentAttributePoints - spent;

  // Preview: stats as they would be after Confirm.
  const preview: GameState = {
    ...state,
    hero: {
      ...state.hero,
      attributes: Object.fromEntries(
        ATTRIBUTES.map((a) => [a, state.hero.attributes[a] + pending[a]]),
      ) as unknown as Attributes,
    },
  };
  const { setup, gear } = heroSetup(preview, GAME_DATA);
  const stats = deriveStats(setup);
  const dps = estimateDps(setup, stats);

  const equippedEntry = Object.entries(state.hero.equipment).find(([, it]) => it?.id === selected);
  const equippedSlot = equippedEntry?.[0] as EquipmentSlot | undefined;
  const invItem = state.inventory.find((p) => p.item.id === selected)?.item;
  const sel: Item | undefined = equippedEntry?.[1] ?? invItem;

  // Points are permanent (attribute-v1.md): Confirm is held, not clicked.
  const confirm = () => {
    game.dispatch({ type: "allocateAttributes", points: pending });
    setPending(NO_POINTS);
  };
  const boonAttributes = boonEffects(heroBoons(state, GAME_DATA)).attributes;

  const cap = levelCap(state.legacy.prestige);
  const next = xpToNextLevel(state.hero.level, cap);
  const boss = bossLevel(state.legacy.prestige);
  const max = PROGRESSION.maxLevel;
  const xpText = Number.isFinite(next)
    ? `${Math.floor((state.hero.xp / next) * 100)}% to Lv ${state.hero.level + 1} · Cap ${cap}`
    : `Level cap ${cap} reached`;

  const penalty = emberPenalty(state);
  const resNote: NoteHover = { ...DEFENSE_NOTES.resistance, status: emberPenaltyLine(penalty) };
  const weaponNumbers: WeaponNumbers = {
    id: setup.weapon.id,
    name: setup.weapon.name,
    min: setup.weapon.damage.min,
    max: setup.weapon.damage.max,
    heatBehavior: setup.weapon.heatBehavior,
    heatPerHit: setup.weapon.heatPerHit,
    baseSpeed: speedValue(setup.weapon.attacksPerSecond),
    tip: () => heroWeaponTip(state),
  };

  // Triggers and Legendary Powers of the worn items that work right now.
  const worn = Object.entries(state.hero.equipment).flatMap(([slot, item]) =>
    item && !gear.inactive.some((i) => i.slot === slot) ? [item] : [],
  );
  const gearTriggers: GearTrigger[] = worn.flatMap((item) =>
    itemModifiers(item, GAME_DATA.items).triggers.map((spec) => ({ spec, item: item.name })),
  );
  const gearPowers: GearPower[] = worn.flatMap((item) => {
    const power = describeItem(item, GAME_DATA.items).power;
    return power ? [{ ...power, item: item.name }] : [];
  });

  // Right-click: the default action of the Character Sheet (ui-ux-plan-v1.md 3.5).
  const equipNow = (item: Item) => {
    const ring = preferredSlotFor(item);
    game.dispatch({ type: "equip", itemId: item.id, ...(ring ? { slot: ring } : {}) });
    resetRingSlot();
    setSelected(null);
  };
  let footer = null;
  if (sel && invItem) {
    const reason = equipBlockReason(
      state,
      GAME_DATA,
      invItem,
      "inventory",
      preferredSlotFor(invItem),
    );
    footer = (
      <div className="sel-buttons">
        <RingSwitch state={state} item={invItem} />
        <span className="k-grow" />
        <HoldButton
          icon="trash"
          blocked={inFight ? "Between stages only" : null}
          onConfirm={() => {
            game.dispatch({ type: "discard", itemId: invItem.id });
            setSelected(null);
          }}
          tip={{
            name: "Discard",
            kind: "Hold to confirm",
            explain: "Throws the item away for nothing. Thoric salvages it for Ash in the Camp.",
          }}
        >
          Discard
        </HoldButton>
        <Button
          variant="primary"
          blocked={inFight ? "Between stages only" : reason ? EQUIP_BLOCK_TEXT[reason] : null}
          onClick={() => equipNow(invItem)}
        >
          Equip
        </Button>
      </div>
    );
  } else if (sel && equippedSlot) {
    const reason = unequipBlockReason(state, GAME_DATA, equippedSlot);
    const inactive = gear.inactive.find((i) => i.slot === equippedSlot);
    footer = (
      <div className="sel-buttons">
        {inactive && <span className="block warn">Inactive: requirements not met</span>}
        <span className="k-grow" />
        <Button
          blocked={inFight ? "Between stages only" : reason ? UNEQUIP_BLOCK_TEXT[reason] : null}
          onClick={() => game.dispatch({ type: "unequip", slot: equippedSlot })}
        >
          Unequip
        </Button>
      </div>
    );
  }

  // Narrower screens (16:10) shrink the hero, so the attributes keep their room.
  const heroZoom = Math.min(1, (stageSize.w - HERO_ROOM) / 600);

  const tabs: TabItem<Tab>[] = [
    {
      id: "Overview",
      name: "Overview",
      icon: "eye",
    },
    {
      id: "Attributes",
      name: "Attributes",
      icon: "user",
      ...(left > 0 && !inFight ? { marker: left } : {}),
    },
    { id: "Stats", name: "Stats", icon: "target" },
    ...(ashbornOpen
      ? [
          {
            id: "Ashborn" as const,
            name: "Ashborn",
            icon: "fire" as const,
          },
        ]
      : []),
  ];

  const gridContext: GridContext | undefined = inFight
    ? undefined
    : {
        action: (item) =>
          equipBlockReason(state, GAME_DATA, item, "inventory", preferredSlotFor(item)) ===
          undefined
            ? "Equip"
            : undefined,
        run: (item) => {
          if (
            equipBlockReason(state, GAME_DATA, item, "inventory", preferredSlotFor(item)) ===
            undefined
          )
            equipNow(item);
        },
      };
  const slotProps = (slot: EquipmentSlot, it: Item | undefined): HeroSlotProps => ({
    selected: !!it && it.id === selected,
    inactive: gear.inactive.some((i) => i.slot === slot),
    aimed: !!invItem && slot.startsWith("ring") && aimedSlot(state, invItem) === slot,
    drag: inFight ? undefined : drops.slot(slot),
    onSelect: it ? () => setSelected(it.id) : undefined,
    context:
      it && !inFight && unequipBlockReason(state, GAME_DATA, slot) === undefined
        ? {
            action: "Unequip",
            run: () => {
              game.dispatch({ type: "unequip", slot });
              if (selected === it.id) setSelected(null);
            },
          }
        : undefined,
  });

  return (
    <WindowLayer>
      <Window
        label="Character"
        role="dialog"
        className="character"
        header={
          <WindowHeader
            title="Character"
            sub={`${heroTitle(state, GAME_DATA)} · Level ${state.hero.level}`}
            medallion={
              <Medallion>
                <HeirFace />
              </Medallion>
            }
            tabs={<Tabs label="Character pages" items={tabs} active={tab} onChange={setTab} />}
            right={
              inFight ? (
                <span className="view-only title-font">FIGHT PAUSED · VIEW ONLY</span>
              ) : null
            }
            onClose={props.onClose}
          />
        }
      >
        <div className="character-columns">
          <section className="hero-column" aria-label="Equipment" style={{ zoom: heroZoom }}>
            <div className="hero-level">
              <span
                className="hero-level-badge title-font"
                aria-label={`Level ${state.hero.level}`}
              >
                {state.hero.level}
              </span>
              <div className="hero-level-bars">
                <div className="hero-level-line">
                  <HeirEmblem
                    classId={state.hero.classId}
                    mastery={state.legacy.branches[0]}
                    size={26}
                  />
                  <span className="title-font">{heroTitle(state, GAME_DATA)}</span>
                  <span className="k-grow" />
                  <span className="sub">{xpText}</span>
                </div>
                <div className="xp-bar" title={xpText}>
                  <div
                    className="fill"
                    style={{
                      width: `${Number.isFinite(next) ? Math.min(100, (state.hero.xp / next) * 100) : 100}%`,
                    }}
                  />
                </div>
                {/* Level 1-100 (level-v2.md): the run's cap is a notch, the harvest boss a tick. */}
                <div
                  className="level-track"
                  role="img"
                  aria-label={`Level ${state.hero.level} of ${max}, cap ${cap}, harvest boss ${boss}`}
                  title={`Level ${state.hero.level} of ${max} · Cap ${cap} this run · Harvest boss Lv ${boss}`}
                >
                  <div className="fill" style={{ width: `${(state.hero.level / max) * 100}%` }} />
                  <i className="boss-tick" style={{ left: `${(boss / max) * 100}%` }} />
                  <i className="cap-notch" style={{ left: `${(cap / max) * 100}%` }} />
                </div>
              </div>
            </div>
            <HeroDoll state={state} slot={slotProps} />
          </section>

          <PinContext.Provider value={pins}>
            <section className="sheet-column" aria-label={tab}>
              {tab === "Attributes" && (
                <>
                  <div className="section-row">
                    <span className="title-font section-title">Attributes</span>
                    <PointChip id="attribute" value={left} testId="attribute-points" glow />
                  </div>
                  <AttributeStones
                    perkBoard
                    mainAttribute={heroClassOf(state, GAME_DATA).mainAttribute}
                    actions={
                      !inFight &&
                      state.hero.unspentAttributePoints > 0 && (
                        <div className="attr-buttons">
                          <Button
                            blocked={spent === 0 ? "Nothing to undo" : null}
                            onClick={() => setPending(NO_POINTS)}
                          >
                            Undo
                          </Button>
                          <HoldButton
                            primary
                            blocked={spent === 0 ? "Add a point first" : null}
                            onConfirm={confirm}
                            tip={{
                              name: "Confirm",
                              kind: "Hold to confirm",
                              explain:
                                "Attribute Points are for good. Old Nan can reset them for Acorns.",
                            }}
                          >
                            Confirm
                          </HoldButton>
                        </div>
                      )
                    }
                    base={state.hero.attributes}
                    delta={pending}
                    boon={boonAttributes}
                    gear={gear.attributes}
                    {...(inFight || state.hero.unspentAttributePoints === 0
                      ? {}
                      : {
                          canAdd: (a: Attribute) =>
                            left > 0 && state.hero.attributes[a] + pending[a] < ATTRIBUTE_RULES.max,
                          onAdd: (a: Attribute) => setPending((p) => ({ ...p, [a]: p[a] + 1 })),
                        })}
                  />
                </>
              )}
              {tab === "Overview" && (
                <div className="hero-numbers hero-overview">
                  {pins.pinned.length === 0 ? (
                    <EmptyState icon="star" />
                  ) : (
                    <>
                      <OffensePanel
                        stats={stats}
                        dps={dps}
                        weapon={weaponNumbers}
                        only={pins.pinned}
                      />
                      <DefensePanel
                        stats={stats}
                        penalty={penalty}
                        resNote={resNote}
                        flaskCharges={flaskCapacity(state, GAME_DATA)}
                        only={pins.pinned}
                      />
                      <HeatPanel
                        stats={stats}
                        weapon={weaponNumbers}
                        perSecond={heatPerSecond(setup, stats)}
                        only={pins.pinned}
                      />
                    </>
                  )}
                </div>
              )}
              {tab === "Ashborn" && <AshbornPanel state={state} game={game} inFight={inFight} />}
              {tab === "Stats" && (
                <>
                  <StatPages active={page} onChange={setPage} />
                  {page === "Offense" && (
                    <OffensePanel stats={stats} dps={dps} weapon={weaponNumbers} />
                  )}
                  {page === "Defense" && (
                    <DefensePanel
                      stats={stats}
                      penalty={penalty}
                      resNote={resNote}
                      flaskCharges={flaskCapacity(state, GAME_DATA)}
                    />
                  )}
                  {page === "Heat" && (
                    <HeatPanel
                      stats={stats}
                      weapon={weaponNumbers}
                      perSecond={heatPerSecond(setup, stats)}
                    />
                  )}
                  {page === "Triggers" && (
                    <TriggersPanel stats={stats} triggers={gearTriggers} powers={gearPowers} />
                  )}
                </>
              )}
            </section>
          </PinContext.Provider>

          <section className="inv-column" aria-label="Inventory">
            <div className="section-row">
              <span className="title-font section-title">Inventory</span>
              <span className="mono sub">{state.inventory.length} items</span>
            </div>
            <ItemGrid
              placed={state.inventory}
              size={{ w: PROGRESSION.inventoryWidth, h: PROGRESSION.inventoryHeight }}
              cell={44}
              selected={selected}
              onSelect={(id) => {
                setSelected(id);
              }}
              label="Inventory grid"
              drop={inFight ? undefined : drops.grid("inventory")}
              context={gridContext}
            />
            {sel ? (
              <div className="sel-bar" data-testid="selected-item">
                <div className="sel-head">
                  <ItemTile item={sel} label={slotLabel(sel)} size={56} equipped={!!equippedSlot} />
                  <div className="sel-name">
                    <span className={`title-font rarity-text ${rarityClass(sel)}`}>{sel.name}</span>
                    <span className="sub">
                      {equippedSlot ? "Equipped" : "In your bag"} · {slotLabel(sel)}
                    </span>
                  </div>
                </div>
                {footer}
              </div>
            ) : (
              <EmptyState icon="inventory">
                {inFight ? "Hover an item to see it." : "Right-click an item to equip it."}
              </EmptyState>
            )}
            <div className="k-grow" />
            <Wallet state={state} />
          </section>
        </div>
      </Window>
    </WindowLayer>
  );
}
