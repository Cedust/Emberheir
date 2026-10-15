import {
  COMBAT,
  DEFENSE_NOTES,
  type DerivedStats,
  type HeatBehavior,
  speedValue,
} from "@emberheir/sim";
import { Icon } from "../../ui/Icon";
import type { NoteHover } from "../../ui/ItemTooltip";
import { fmt } from "../../ui/items";
import { type Element, LifeBar, Medal, Plaque, Pill, Res, Row, pct } from "./HeroNumbers";

/**
 * The Offense, Defense and Heat tabs of the Character Sheet: the same plaques as the Overview,
 * with every number of that topic.
 */

export interface WeaponNumbers {
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
  critChance: { name: "Crit Chance", kind: "Offense", explain: "Your chance to hit extra hard." },
  critDamage: {
    name: "Crit Damage",
    kind: "Offense",
    explain: "A crit deals this much of a normal hit. It is the same for every hero.",
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

export function OffensePanel(props: { stats: DerivedStats; dps: number; weapon: WeaponNumbers }) {
  const { stats, weapon } = props;
  return (
    <div className="hero-numbers">
      <Plaque className="hero-damage" label="Damage" note={NOTES.dps}>
        <span className="hero-dps">
          <b className="mono">{fmt(props.dps)}</b>
          <span className="hero-unit">per Second</span>
        </span>
        <span className="hero-pills">
          <Pill icon="sword" label={weapon.name}>
            {fmt(weapon.min)}–{fmt(weapon.max)}
          </Pill>
        </span>
      </Plaque>
      <Plaque className="hero-hits" label="Hits">
        <div className="hero-res three">
          <Medal
            icon="cycle"
            label="Speed"
            value={String(speedValue(stats.attackSpeed))}
            note={NOTES.speed}
          />
          <Medal
            icon="target"
            label="Crit Chance"
            value={pct(stats.critChance)}
            note={NOTES.critChance}
          />
          <Medal icon="execute" label="Crit Damage" value="150 %" note={NOTES.critDamage} />
        </div>
      </Plaque>
      <Plaque className="hero-bonus" label="Bonuses">
        <table className="hero-table">
          <tbody>
            <Row icon="strike" label="Physical Damage" value={`+${pct(stats.physicalDamage)}`} />
            <Row icon="meteor" label="Elemental Damage" value={`+${pct(stats.elementalDamage)}`} />
            <Row
              icon="venom"
              label="Ailment Effect"
              value={`+${pct(stats.ailmentEffect)}`}
              note={NOTES.ailmentEffect}
            />
            <Row
              icon="rune"
              label="Trigger Chance"
              value={`+${pct(stats.triggerChance)}`}
              note={NOTES.triggerChance}
            />
          </tbody>
        </table>
      </Plaque>
    </div>
  );
}

export function DefensePanel(props: {
  stats: DerivedStats;
  penalty: number;
  resNote: NoteHover;
  draught: NoteHover | undefined;
}) {
  const { stats } = props;
  const res: Record<Element, number> = {
    fire: stats.fireResistance,
    cold: stats.coldResistance,
    lightning: stats.lightningResistance,
    void: stats.voidResistance,
  };
  return (
    <div className="hero-numbers">
      <Plaque className="hero-life" label="Life">
        <LifeBar life={stats.maxLife} barrier={stats.barrier} />
      </Plaque>
      <Plaque className="hero-defense" label="Defense">
        <div className="hero-def-grid">
          <table className="hero-table">
            <tbody>
              <Row icon="armor" label="Armor" value={fmt(stats.armor)} note={DEFENSE_NOTES.armor} />
              <Row
                icon="shell"
                label="Barrier"
                value={fmt(stats.barrier)}
                note={DEFENSE_NOTES.barrier}
              />
            </tbody>
          </table>
          <table className="hero-table">
            <tbody>
              <Row
                icon="boots"
                label="Evasion"
                value={pct(stats.evasion)}
                note={DEFENSE_NOTES.evasion}
              />
              <Row
                icon="shield"
                label="Block"
                value={pct(stats.blockChance)}
                note={DEFENSE_NOTES.block}
              />
            </tbody>
          </table>
        </div>
      </Plaque>
      <Plaque
        className="hero-resist"
        label="Resistances"
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
      <Plaque className="hero-endure" label="Endurance">
        <div className="hero-def-grid">
          <table className="hero-table">
            <tbody>
              <Row
                icon="stone"
                label="Tenacity"
                value={pct(stats.tenacity)}
                note={NOTES.tenacity}
              />
              <Row
                icon="drop"
                label="Lifesteal"
                value={pct(stats.lifesteal)}
                note={NOTES.lifesteal}
              />
            </tbody>
          </table>
          <table className="hero-table">
            <tbody>
              <Row
                icon="flask"
                label="Draught"
                value={props.draught?.name ?? "None"}
                note={props.draught}
              />
            </tbody>
          </table>
        </div>
      </Plaque>
    </div>
  );
}

export function HeatPanel(props: {
  stats: DerivedStats;
  weapon: WeaponNumbers;
  perSecond: number;
}) {
  const { stats, weapon } = props;
  const behavior = BEHAVIOR[weapon.heatBehavior];
  const start = Math.max(0, Math.min(1, stats.startingHeat / COMBAT.maxHeat));
  // Seconds from the fight's start until the bar is full and the first skill fires.
  const fullIn = props.perSecond > 0 ? (COMBAT.maxHeat * (1 - start)) / props.perSecond : undefined;
  return (
    <div className="hero-numbers">
      <Plaque className="hero-heat" label="Heat" note={NOTES.heatPerSecond}>
        <span className="hero-dps">
          <b className="mono">{props.perSecond.toFixed(1)}</b>
          <span className="hero-unit">per Second</span>
        </span>
        <span className="hero-pills">
          <Pill icon="flame" label={behavior.name} note={behavior} />
        </span>
        <span className="heat-gauge" aria-hidden="true">
          <span className="heat-gauge-fill" style={{ width: `${start * 100}%` }} />
          <span className="heat-gauge-text">
            <span>
              Starts at <b className="mono">{fmt(stats.startingHeat)}</b>
            </span>
            {fullIn !== undefined && (
              <span>
                <Icon name="flame" size={16} /> Full in{" "}
                <b className="mono">{fullIn.toFixed(1)} s</b>
              </span>
            )}
          </span>
        </span>
      </Plaque>
      <Plaque className="hero-heat-src" label="Sources">
        <table className="hero-table">
          <tbody>
            {weapon.heatBehavior !== "warming" && (
              <Row icon="strike" label="Heat per Hit" value={fmt(weapon.heatPerHit)} />
            )}
            {weapon.heatBehavior === "cooling" && (
              <Row
                icon="shield"
                label="Heat from Hits Taken"
                value={pct(stats.heatFromHitsTaken)}
              />
            )}
            <Row icon="flame" label="Heat Gain" value={`+${pct(stats.heatGain)}`} />
            <Row icon="fire" label="Starting Heat" value={fmt(stats.startingHeat)} />
          </tbody>
        </table>
      </Plaque>
    </div>
  );
}
