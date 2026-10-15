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
import { Icon, type IconName } from "../../ui/Icon";
import { EmptyState } from "../../ui/kit/Marker";
import { type NoteHover, useNoteHover } from "../../ui/ItemTooltip";
import { fmt } from "../../ui/items";
import { type Element, Vitals, Medal, Plaque, Pill, Res, Row, pct } from "./HeroNumbers";

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
  readonly icon: IconName;
  readonly tone: string;
}[] = [
  { name: "Burn", verb: "Burn the enemy", stat: "burnChance", icon: "fire", tone: "fire" },
  { name: "Chill", verb: "Chill the enemy", stat: "chillChance", icon: "snow", tone: "cold" },
  { name: "Shock", verb: "Shock the enemy", stat: "shockChance", icon: "bolt", tone: "lightning" },
  {
    name: "Corruption",
    verb: "Corrupt the enemy",
    stat: "corruptionChance",
    icon: "void",
    tone: "void",
  },
  { name: "Bleed", verb: "make the enemy Bleed", stat: "bleedChance", icon: "drop", tone: "bleed" },
  { name: "Poison", verb: "Poison the enemy", stat: "poisonChance", icon: "venom", tone: "poison" },
];

/** Damage and Penetration per damage kind: two rows, two columns. */
function BonusTable(props: { stats: DerivedStats }) {
  const { stats } = props;
  const pen = useNoteHover(NOTES.penetration);
  const rows = [
    {
      icon: "strike" as const,
      label: "Physical",
      damage: stats.physicalDamage,
      pen: stats.physicalPenetration,
    },
    {
      icon: "meteor" as const,
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
              <Icon name={r.icon} size={16} />
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
        <BonusTable stats={stats} />
      </Plaque>
      <Plaque
        className="hero-ailments"
        label="Ailments"
        aside={
          <Pill icon="venom" label="Ailment Effect" note={NOTES.ailmentEffect}>
            +{pct(stats.ailmentEffect)}
          </Pill>
        }
      >
        <div className="hero-res three">
          {AILMENTS.map((a) => (
            <Medal
              key={a.name}
              icon={a.icon}
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
    </div>
  );
}

export function DefensePanel(props: {
  stats: DerivedStats;
  penalty: number;
  resNote: NoteHover;
  flaskCharges: number;
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
      <Plaque className="hero-vitals" label="Defense">
        <Vitals life={stats.maxLife} barrier={stats.barrier} armor={stats.armor} />
      </Plaque>
      <Plaque className="hero-avoid" label="Avoidance">
        <div className="hero-def-grid">
          <table className="hero-table">
            <tbody>
              <Row
                icon="boots"
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
              <Row icon="thornback" label="Thorns" value={fmt(stats.thorns)} note={NOTES.thorns} />
              <Row
                icon="flask"
                label="Flask Charges"
                value={String(props.flaskCharges)}
                note={NOTES.flask}
              />
            </tbody>
          </table>
        </div>
      </Plaque>
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
          <Pill icon="rune" label="Trigger Chance" note={NOTES.triggerChance}>
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
          </tbody>
        </table>
      </Plaque>
    </div>
  );
}
