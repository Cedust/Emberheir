import type { FighterSnapshot } from "@emberheir/sim";
import { Icon, type IconName } from "../../ui/Icon";
import { fmt } from "../../ui/items";

const AILMENT_NAMES: Record<string, string> = {
  burn: "Burn",
  chill: "Chill",
  shock: "Shock",
  bleed: "Bleed",
  poison: "Poison",
  corruption: "Corruption",
};

export interface PlaqueInfo {
  readonly name: string;
  readonly sub: string;
  readonly icon: IconName;
  readonly tag?: "ELITE" | "BOSS";
  readonly mods?: readonly string[];
}

/** Hero or enemy plaque: name, level, Life with Barrier, Heat, status chips. Symmetric. */
export function Plaque(props: { fighter: FighterSnapshot; info: PlaqueInfo; mirrored?: boolean }) {
  const { fighter: f, info } = props;
  const lifePct = Math.max(0, Math.min(100, (f.life / f.maxLife) * 100));
  const barrierPct = Math.min(100 - lifePct, (f.barrier / f.maxLife) * 100);
  const next = f.rotation[f.nextSlot];
  const threshold = next && props.mirrored !== true ? next.threshold : null;
  const heatPct = (f.heat / f.maxHeat) * 100;
  const tagClass = info.tag === "BOSS" ? "boss" : info.tag === "ELITE" ? "elite" : "";
  return (
    <section
      className={`plaque panel-card ${props.mirrored ? "mirrored" : ""} ${tagClass}`}
      aria-label={`${info.name} plaque`}
    >
      <div className="plaque-head">
        <div className="plaque-portrait">
          <Icon name={info.icon} size={24} color="#f3e6c8" />
        </div>
        <div className="plaque-names">
          <span className="plaque-name title-font">{info.name}</span>
          <span className="sub">{info.sub}</span>
        </div>
        <span className="level-tag title-font">Lv {f.level}</span>
        {info.tag && <span className={`rank-tag title-font ${tagClass}`}>{info.tag}</span>}
      </div>
      <div
        className="bar-life"
        role="meter"
        aria-label="Life"
        aria-valuemin={0}
        aria-valuemax={f.maxLife}
        aria-valuenow={Math.round(f.life)}
      >
        <div className="fill" style={{ width: `${lifePct}%` }} />
        {barrierPct > 0 && (
          <div
            className="barrier"
            style={
              props.mirrored
                ? { right: `${lifePct}%`, width: `${barrierPct}%` }
                : { left: `${lifePct}%`, width: `${barrierPct}%` }
            }
          />
        )}
        <span className="bar-label">
          {fmt(f.life)} / {fmt(f.maxLife)}
          {f.barrier > 0 ? ` · +${fmt(f.barrier)} Barrier` : ""}
        </span>
      </div>
      <div
        className={`bar-heat ${f.telegraph ? "charging" : ""}`}
        role="meter"
        aria-label="Heat"
        aria-valuemin={0}
        aria-valuemax={f.maxHeat}
        aria-valuenow={Math.round(f.heat)}
      >
        <div className="fill" style={{ width: `${heatPct}%` }} />
        {threshold !== null && (
          <div className="threshold" style={{ left: `${(threshold / f.maxHeat) * 100}%` }} />
        )}
        <span className="bar-label">HEAT {Math.round(f.heat)}</span>
      </div>
      <div className="status-row">
        {(info.mods ?? []).map((m) => (
          <span key={m} className="mod-chip">
            {m}
          </span>
        ))}
        {f.ailments.map((a) => (
          <span
            key={a.type}
            className={`status-chip ailment-${a.type}`}
            title={AILMENT_NAMES[a.type]}
          >
            <span className="swatch" />
            <b>{AILMENT_NAMES[a.type]}</b>
            <span className="mono sub">
              {a.stacks && a.stacks > 1 ? `×${a.stacks} ` : ""}
              {a.remaining.toFixed(1)}s
            </span>
          </span>
        ))}
        {f.stunned > 0 && (
          <span className="status-chip stun" title="Stunned">
            <span className="swatch" />
            <b>Stunned</b>
            <span className="mono sub">{f.stunned.toFixed(1)}s</span>
          </span>
        )}
        {f.curses.map((c) => (
          <span key={c.name} className="status-chip curse" title={c.name}>
            <span className="swatch" />
            <b>{c.name}</b>
            <span className="mono sub">{c.remaining.toFixed(1)}s</span>
          </span>
        ))}
        {f.buffs.map((b) => (
          <span key={b.name} className="status-chip buff" title={b.name}>
            <span className="swatch" />
            <b>{b.name}</b>
            <span className="mono sub">
              {b.stacks > 1 ? `×${b.stacks} ` : ""}
              {b.remaining.toFixed(1)}s
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
