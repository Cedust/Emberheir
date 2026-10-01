import type { FighterSnapshot } from "@emberheir/sim";

const HEAT_BEHAVIOR_LABEL = { cooling: "Cooling", steady: "Steady", warming: "Warming" } as const;

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

export function FighterPanel({ fighter }: { fighter: FighterSnapshot }) {
  const next = fighter.rotation[fighter.nextSlot];
  return (
    <section className={`fighter fighter-${fighter.side}`} aria-label={fighter.name}>
      <header>
        <h2>{fighter.name}</h2>
        <span className="level">Lv {fighter.level}</span>
      </header>
      <p className="weapon">
        {fighter.weapon} · {fighter.defaultAttack} · {HEAT_BEHAVIOR_LABEL[fighter.heatBehavior]}
      </p>
      <Bar kind="life" label="Life" value={fighter.life} max={fighter.maxLife} />
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
      </dl>
    </section>
  );
}
