import { type FighterSnapshot, STAT_NAMES, isPercentStat } from "@emberheir/sim";

const HEAT_BEHAVIOR_LABEL = {
  cooling: "Cooling",
  steady: "Steady",
  warming: "Warming",
  smoldering: "Smoldering",
} as const;

function Bar(props: {
  kind: "life" | "heat";
  value: number;
  max: number;
  label: string;
  marker?: number | undefined;
}) {
  const pct = props.max > 0 ? Math.max(0, Math.min(100, (props.value / props.max) * 100)) : 0;
  return (
    <div
      className={`bar bar-${props.kind}`}
      role="meter"
      aria-label={props.label}
      aria-valuenow={Math.round(props.value)}
      aria-valuemin={0}
      aria-valuemax={props.max}
    >
      <div className="bar-fill" style={{ width: `${pct}%` }} />
      {props.marker !== undefined && (
        <div
          className="bar-marker"
          style={{ left: `${(props.marker / props.max) * 100}%` }}
          title="Trigger Threshold of the next skill"
        />
      )}
      <span className="bar-text">
        {props.label} {Math.floor(props.value)} / {props.max}
      </span>
    </div>
  );
}

export function FighterPanel({
  fighter,
  tags = [],
}: {
  fighter: FighterSnapshot;
  /** Elite modifiers or "Boss", shown on the plaque. */
  tags?: readonly string[];
}) {
  const next = fighter.rotation[fighter.nextSlot];
  return (
    <section className={`fighter fighter-${fighter.side}`} aria-label={fighter.name}>
      <header>
        <h2>{fighter.name}</h2>
        <span className="level">Lv {fighter.level}</span>
      </header>
      {tags.length > 0 && (
        <ul className="fighter-tags" aria-label="Modifiers">
          {tags.map((t) => (
            <li key={t} className={t === "Boss" ? "tag boss" : "tag elite"}>
              {t}
            </li>
          ))}
        </ul>
      )}
      {fighter.telegraph && (
        <p className="telegraph" role="alert" data-testid="telegraph">
          Winding up {fighter.telegraph.skill}! {fighter.telegraph.remaining.toFixed(1)}s
        </p>
      )}
      <p className="weapon">
        {fighter.weapon} · {fighter.defaultAttack} · {HEAT_BEHAVIOR_LABEL[fighter.heatBehavior]}
      </p>
      <Bar kind="life" label="Life" value={fighter.life} max={fighter.maxLife} />
      {fighter.barrier > 0 && (
        <p className="barrier" data-testid="barrier">
          Barrier {Math.round(fighter.barrier)}
        </p>
      )}
      <Bar
        kind="heat"
        label="Heat"
        value={fighter.heat}
        max={fighter.maxHeat}
        marker={next?.threshold}
      />

      <ol className="rotation" aria-label="Rotation">
        {fighter.rotation.map((slot, i) => (
          <li key={i} className={i === fighter.nextSlot ? "slot next" : "slot"}>
            <span className="slot-name">{slot.name}</span>
            <span className="slot-cost">
              {slot.threshold > slot.heatCost
                ? `${slot.heatCost} @ ${slot.threshold}`
                : slot.heatCost}
            </span>
          </li>
        ))}
      </ol>

      <ul className="ailments" aria-label="Ailments">
        {fighter.ailments.map((a) => (
          <li key={a.type} className={`chip tone-${a.type}`}>
            {a.type[0]?.toUpperCase()}
            {a.type.slice(1)} {a.remaining.toFixed(1)}s
          </li>
        ))}
        {fighter.buffs.map((b) => (
          <li key={b.name} className="chip buff">
            {b.name}
            {b.stacks > 1 ? ` ×${b.stacks}` : ""} (
            {isPercentStat(b.stat)
              ? `+${Math.round(b.amount * b.stacks * 100)} %`
              : `+${b.amount * b.stacks}`}{" "}
            {STAT_NAMES[b.stat]}) {b.remaining.toFixed(1)}s
          </li>
        ))}
      </ul>

      <dl className="stats">
        <dt>Attack Speed</dt>
        <dd>{fighter.stats.attackSpeed.toFixed(2)}/s</dd>
        <dt>Crit Chance</dt>
        <dd>{(fighter.stats.critChance * 100).toFixed(1)} %</dd>
        <dt>Armor</dt>
        <dd>{fighter.stats.armor}</dd>
        <dt>Evasion</dt>
        <dd>{(fighter.stats.evasion * 100).toFixed(1)} %</dd>
        <dt>Resistance</dt>
        <dd>{(fighter.stats.resistance * 100).toFixed(1)} %</dd>
        <dt>Heat Gain</dt>
        <dd>+{(fighter.stats.heatGain * 100).toFixed(0)} %</dd>
        <dt>Physical Damage</dt>
        <dd>+{(fighter.stats.physicalDamage * 100).toFixed(0)} %</dd>
        <dt>Elemental Damage</dt>
        <dd>+{(fighter.stats.elementalDamage * 100).toFixed(0)} %</dd>
        <dt>Block</dt>
        <dd>
          {(fighter.stats.blockChance * 100).toFixed(0)} % / {fighter.stats.blockValue}
        </dd>
        <dt>Lifesteal</dt>
        <dd>{(fighter.stats.lifesteal * 100).toFixed(1)} %</dd>
      </dl>
    </section>
  );
}
