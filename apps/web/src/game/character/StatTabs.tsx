import {
  COMBAT,
  DEFENSE_NOTES,
  type DerivedStats,
  type HeatBehavior,
  type TriggerSpec,
  describeTrigger,
  speedValue,
  triggerChance,
} from "@emberheir/sim";
import { GameIcon, type GameIconId, weaponIconUrl } from "../../ui/gameIcons";
import { Icon, type IconName } from "../../ui/Icon";
import { EmptyState } from "../../ui/kit/Marker";
import { playUiSound } from "../../ui/sound";
import type { PanelId } from "./pins";
import { type NoteHover, useNoteHover } from "../../ui/ItemTooltip";
import { fmt } from "../../ui/items";
import { type Element, Vitals, Medal, Plaque, Pill, Res, Row, pct } from "./HeroNumbers";

/**
 * The Offense, Defense and Heat tabs of the Character Sheet: the same plaques as the Overview,
 * with every number of that topic.
 */

export interface WeaponNumbers {
  readonly id: string;
  readonly name: string;
  readonly min: number;
  readonly max: number;
  readonly heatBehavior: HeatBehavior;
  readonly heatPerHit: number;
}

const NOTES = {
  dps: {
    name: "Damage per Second",
    kind: "Offense",
    explain:
      "What you deal each second on average: weapon, Attack Speed, crits and your Battle Plan together.",
  },
  speed: {
    name: "Speed",
    kind: "Offense",
    explain: "How often you attack. A Sword starts at 100; higher is faster.",
  },
  critChance: {
    name: "Crit Chance",
    kind: "Offense",
    explain: "Your chance to hit extra hard: a crit deals 150 % of a normal hit.",
  },
  ailmentEffect: {
    name: "Ailment Effect",
    kind: "Offense",
    explain: "Makes your Burn, Chill, Shock, Corruption, Bleed and Poison stronger.",
  },
  triggerChance: {
    name: "Trigger Chance",
    kind: "Offense",
    explain: "Raises the chance of every trigger on your items and skills.",
  },
  tenacity: {
    name: "Tenacity",
    kind: "Defense",
    explain: `Ailments and stuns on you end sooner, by at most ${pct(COMBAT.maxTenacity)}.`,
  },
  lifesteal: {
    name: "Lifesteal",
    kind: "Defense",
    explain: "Your hits heal you by a share of their damage. Ailments do not.",
  },
  penetration: {
    name: "Penetration",
    kind: "Offense",
    explain: "Your hits ignore this much of the enemy's Armor or Resistance.",
  },
  thorns: {
    name: "Thorns",
    kind: "Defense",
    explain: "Every hit you take deals this much damage back to the attacker.",
  },
  flask: {
    name: "Ember Flask",
    kind: "Defense",
    explain: "How many sips the Ember Flask holds for a trip. Each sip heals you.",
  },
  heatPerSecond: {
    name: "Heat per Second",
    kind: "Heat",
    explain: "How fast your Heat bar fills on average. When it is full, your skills fire.",
  },
} satisfies Record<string, NoteHover>;

const BEHAVIOR: Record<HeatBehavior, NoteHover> = {
  cooling: {
    name: "Cooling",
    kind: "Heat · melee",
    explain: "Your hits fill Heat, and it cools down all the time. Keep swinging.",
  },
  steady: {
    name: "Steady",
    kind: "Heat · ranged",
    explain: "Your hits fill Heat. It never cools down.",
  },
  warming: {
    name: "Warming",
    kind: "Heat · caster",
    explain: "Heat fills by itself every second, however fast you attack.",
  },
  smoldering: {
    name: "Smoldering",
    kind: "Heat · Heat Form",
    explain: "Heat comes mostly from the hits you take. It never cools down.",
  },
};

const AILMENTS: readonly {
  readonly name: string;
  readonly verb: string;
  readonly stat:
    | "burnChance"
    | "chillChance"
    | "shockChance"
    | "corruptionChance"
    | "bleedChance"
    | "poisonChance";
  readonly icon: GameIconId;
  readonly tone: string;
}[] = [
  { name: "Burn", verb: "Burn the enemy", stat: "burnChance", icon: "burn", tone: "fire" },
  { name: "Chill", verb: "Chill the enemy", stat: "chillChance", icon: "chill", tone: "cold" },
  { name: "Shock", verb: "Shock the enemy", stat: "shockChance", icon: "shock", tone: "lightning" },
  {
    name: "Corruption",
    verb: "Corrupt the enemy",
    stat: "corruptionChance",
    icon: "corruption",
    tone: "void",
  },
  {
    name: "Bleed",
    verb: "make the enemy Bleed",
    stat: "bleedChance",
    icon: "bleed",
    tone: "bleed",
  },
  {
    name: "Poison",
    verb: "Poison the enemy",
    stat: "poisonChance",
    icon: "poison",
    tone: "poison",
  },
];

/** Damage and Penetration per damage kind: two rows, two columns. */
function BonusTable(props: { stats: DerivedStats }) {
  const { stats } = props;
  const pen = useNoteHover(NOTES.penetration);
  const rows = [
    {
      painted: "physical" as const,
      label: "Physical",
      damage: stats.physicalDamage,
      pen: stats.physicalPenetration,
    },
    {
      painted: "elemental" as const,
      label: "Elemental",
      damage: stats.elementalDamage,
      pen: stats.elementalPenetration,
    },
  ];
  return (
    <table className="hero-table hero-matrix">
      <thead>
        <tr>
          <td />
          <td />
          <th scope="col">Damage</th>
          <th scope="col" tabIndex={0} {...pen}>
            Penetration
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td className="hero-table-icon">
              <GameIcon id={r.painted} size={20} />
            </td>
            <th scope="row">{r.label}</th>
            <td className="mono">+{pct(r.damage)}</td>
            <td className="mono">{pct(r.pen)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Which panels a page shows: all on its Stats page, the pinned ones on the Overview. */
type Only = { readonly only?: readonly PanelId[] | undefined };
const shows = (only: Only["only"]) => (id: PanelId) => !only || only.includes(id);

/** The hero's weapon, painted big on an ember plaque, with its damage below. */
function WeaponMedallion(props: { weapon: WeaponNumbers }) {
  const { weapon } = props;
  const url = weaponIconUrl(weapon.id);
  return (
    <span className="hero-weapon">
      <span className="hero-weapon-plaque">
        {url ? (
          <img src={url} width={92} height={92} alt="" draggable={false} />
        ) : (
          <Icon name="sword" size={44} />
        )}
      </span>
      <span className="hero-weapon-name">{weapon.name}</span>
      <b className="mono hero-weapon-damage">
        {fmt(weapon.min)}–{fmt(weapon.max)}
      </b>
    </span>
  );
}

/** A big "per Second" number (Damage, Heat); its tooltip says what goes into it. */
function PerSecond(props: { value: string; note: NoteHover }) {
  const hover = useNoteHover(props.note);
  return (
    <span className="hero-dps" tabIndex={0} {...hover}>
      <b className="mono">{props.value}</b>
      <span className="hero-unit">per Second</span>
    </span>
  );
}

export function OffensePanel(
  props: { stats: DerivedStats; dps: number; weapon: WeaponNumbers } & Only,
) {
  const { stats, weapon } = props;
  const show = shows(props.only);
  if (!(["damage", "bonuses", "ailments"] as const).some(show)) return null;
  return (
    <div className="hero-numbers">
      {show("damage") && (
        <Plaque className="hero-damage" label="Damage" pin="damage">
          <span className="hero-damage-row">
            <WeaponMedallion weapon={weapon} />
            <span className="hero-damage-numbers">
              <PerSecond value={fmt(props.dps)} note={NOTES.dps} />
              <span className="hero-pills">
                <Pill icon="cycle" painted="speed" label="Speed" note={NOTES.speed}>
                  {speedValue(stats.attackSpeed)}
                </Pill>
                <Pill icon="target" painted="crit" label="Crit Chance" note={NOTES.critChance}>
                  {pct(stats.critChance)}
                </Pill>
              </span>
            </span>
          </span>
        </Plaque>
      )}
      {show("bonuses") && (
        <Plaque className="hero-bonus" label="Bonuses" pin="bonuses">
          <BonusTable stats={stats} />
        </Plaque>
      )}
      {show("ailments") && (
        <Plaque
          className="hero-ailments"
          label="Ailments"
          pin="ailments"
          aside={
            <Pill
              icon="venom"
              painted="ailment-effect"
              label="Ailment Effect"
              note={NOTES.ailmentEffect}
            >
              +{pct(stats.ailmentEffect)}
            </Pill>
          }
        >
          <div className="hero-res three">
            {AILMENTS.map((a) => (
              <Medal
                key={a.name}
                icon="target"
                painted={a.icon}
                label={a.name}
                value={pct(stats[a.stat])}
                tone={a.tone}
                note={{
                  name: `${a.name} Chance`,
                  kind: "Offense",
                  explain: `Extra chance to ${a.verb} with every hit.`,
                }}
              />
            ))}
          </div>
        </Plaque>
      )}
    </div>
  );
}

export function DefensePanel(
  props: {
    stats: DerivedStats;
    penalty: number;
    resNote: NoteHover;
    flaskCharges: number;
  } & Only,
) {
  const { stats } = props;
  const show = shows(props.only);
  if (!(["vitals", "avoidance", "resistances", "endurance"] as const).some(show)) return null;
  const res: Record<Element, number> = {
    fire: stats.fireResistance,
    cold: stats.coldResistance,
    lightning: stats.lightningResistance,
    void: stats.voidResistance,
  };
  return (
    <div className="hero-numbers">
      {show("vitals") && (
        <Plaque className="hero-vitals" label="Defense" pin="vitals">
          <Vitals life={stats.maxLife} barrier={stats.barrier} armor={stats.armor} />
        </Plaque>
      )}
      {show("avoidance") && (
        <Plaque className="hero-avoid" label="Avoidance" pin="avoidance">
          <div className="hero-def-grid">
            <table className="hero-table">
              <tbody>
                <Row
                  icon="boots"
                  painted="evasion"
                  label="Evasion"
                  value={pct(stats.evasion)}
                  note={DEFENSE_NOTES.evasion}
                />
              </tbody>
            </table>
            <table className="hero-table">
              <tbody>
                <Row
                  icon="shield"
                  painted="block"
                  label="Block"
                  value={pct(stats.blockChance)}
                  note={DEFENSE_NOTES.block}
                />
              </tbody>
            </table>
          </div>
        </Plaque>
      )}
      {show("resistances") && (
        <Plaque
          className="hero-resist"
          label="Resistances"
          pin="resistances"
          aside={
            props.penalty > 0 && (
              <span className="hero-penalty">
                Ember Penalty <b className="mono">−{pct(props.penalty)}</b>
              </span>
            )
          }
        >
          <div className="hero-res">
            {(Object.keys(res) as Element[]).map((el) => (
              <Res key={el} element={el} value={res[el]} note={props.resNote} />
            ))}
          </div>
        </Plaque>
      )}
      {show("endurance") && (
        <Plaque className="hero-endure" label="Endurance" pin="endurance">
          <div className="hero-def-grid">
            <table className="hero-table">
              <tbody>
                <Row
                  icon="stone"
                  painted="tenacity"
                  label="Tenacity"
                  value={pct(stats.tenacity)}
                  note={NOTES.tenacity}
                />
                <Row
                  icon="drop"
                  painted="lifesteal"
                  label="Lifesteal"
                  value={pct(stats.lifesteal)}
                  note={NOTES.lifesteal}
                />
              </tbody>
            </table>
            <table className="hero-table">
              <tbody>
                <Row
                  icon="thornback"
                  painted="thorns"
                  label="Thorns"
                  value={fmt(stats.thorns)}
                  note={NOTES.thorns}
                />
                <Row
                  icon="flask"
                  painted="flask"
                  label="Flask Charges"
                  value={String(props.flaskCharges)}
                  note={NOTES.flask}
                />
              </tbody>
            </table>
          </div>
        </Plaque>
      )}
    </div>
  );
}

/** A trigger from the worn gear, with the item it sits on. */
export interface GearTrigger {
  readonly spec: TriggerSpec;
  readonly item: string;
}

/** A Legendary Power of a worn item. */
export interface GearPower {
  readonly name: string;
  readonly text: string;
  readonly item: string;
}

/**
 * The Triggers tab: every trigger the worn gear gives, with its chance after Trigger Chance, and
 * the Legendary Powers.
 */
export function TriggersPanel(props: {
  stats: DerivedStats;
  triggers: readonly GearTrigger[];
  powers: readonly GearPower[];
}) {
  const { stats } = props;
  return (
    <div className="hero-numbers hero-effects">
      <Plaque
        className="hero-triggers"
        label="Triggers"
        aside={
          <Pill icon="rune" painted="trigger" label="Trigger Chance" note={NOTES.triggerChance}>
            +{pct(stats.triggerChance)}
          </Pill>
        }
      >
        {props.triggers.length > 0 ? (
          <ul className="hero-effect-list">
            {props.triggers.map((t, i) => (
              <li key={i}>
                <span className="hero-effect-head">
                  <b>{t.spec.name}</b>
                  <span className="hero-effect-item">{t.item}</span>
                </span>
                <span className="hero-effect-text">
                  {describeTrigger({
                    ...t.spec,
                    chance: triggerChance(t.spec.chance ?? 1, stats.triggerChance),
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="rune" />
        )}
      </Plaque>
      {props.powers.length > 0 && (
        <Plaque className="hero-powers" label="Legendary Powers">
          <ul className="hero-effect-list">
            {props.powers.map((p, i) => (
              <li key={i}>
                <span className="hero-effect-head">
                  <b className="hero-power-name">{p.name}</b>
                  <span className="hero-effect-item">{p.item}</span>
                </span>
                <span className="hero-effect-text">{p.text}</span>
              </li>
            ))}
          </ul>
        </Plaque>
      )}
    </div>
  );
}

export function HeatPanel(
  props: {
    stats: DerivedStats;
    weapon: WeaponNumbers;
    perSecond: number;
  } & Only,
) {
  const { stats, weapon } = props;
  const show = shows(props.only);
  if (!show("heat") && !show("heatSources")) return null;
  const behavior = BEHAVIOR[weapon.heatBehavior];
  const start = Math.max(0, Math.min(1, stats.startingHeat / COMBAT.maxHeat));
  return (
    <div className="hero-numbers">
      {show("heat") && (
        <Plaque className="hero-heat" label="Heat" pin="heat">
          <span className="hero-damage-row">
            <PerSecond value={props.perSecond.toFixed(1)} note={NOTES.heatPerSecond} />
            <span className="hero-pills hero-pills-stack">
              <Pill icon="flame" label={behavior.name} note={behavior} />
            </span>
          </span>
          <span className="heat-gauge" aria-hidden="true">
            <span className="heat-gauge-fill" style={{ width: `${start * 100}%` }} />
            <span className="heat-gauge-text">
              <span>
                Starts at <b className="mono">{fmt(stats.startingHeat)}</b>
              </span>
            </span>
          </span>
        </Plaque>
      )}
      {show("heatSources") && (
        <Plaque className="hero-heat-src" label="Sources" pin="heatSources">
          <table className="hero-table">
            <tbody>
              {weapon.heatBehavior !== "warming" && (
                <Row
                  icon="strike"
                  painted="heat-per-hit"
                  label="Heat per Hit"
                  value={fmt(weapon.heatPerHit)}
                />
              )}
              {weapon.heatBehavior === "cooling" && (
                <Row
                  icon="shield"
                  painted="heat-from-hits"
                  label="Heat from Hits Taken"
                  value={pct(stats.heatFromHitsTaken)}
                />
              )}
              <Row
                icon="flame"
                painted="heat-gain"
                label="Heat Gain"
                value={`+${pct(stats.heatGain)}`}
              />
            </tbody>
          </table>
        </Plaque>
      )}
    </div>
  );
}

export type StatPage = "Offense" | "Defense" | "Heat" | "Triggers";

const PAGES: readonly { readonly id: StatPage; readonly icon: IconName }[] = [
  { id: "Offense", icon: "sword" },
  { id: "Defense", icon: "shield" },
  { id: "Heat", icon: "flame" },
  { id: "Triggers", icon: "rune" },
];

/** The Stats tab's pages: a brass switch above the plaques. */
export function StatPages(props: { active: StatPage; onChange: (page: StatPage) => void }) {
  return (
    <div className="stat-pages" role="tablist" aria-label="Stats pages">
      {PAGES.map((p) => (
        <button
          key={p.id}
          type="button"
          role="tab"
          aria-selected={p.id === props.active}
          className={`stat-page${p.id === props.active ? " on" : ""}`}
          onClick={() => {
            if (p.id !== props.active) playUiSound("tab");
            props.onChange(p.id);
          }}
        >
          <Icon name={p.icon} size={14} />
          {p.id}
        </button>
      ))}
    </div>
  );
}
