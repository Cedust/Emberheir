import type { FighterSnapshot } from "@emberheir/sim";
import { Icon, type IconName } from "../../../ui/Icon";
import { fmt } from "../../../ui/items";
import { skillIcon, skillTint } from "../skills";
import { BAR_H, ENEMY_LIFE, ENEMY_TOP, ENEMY_W, ORB_R, hudLayout } from "./layout";

/**
 * The DOM half of the Diablo-style battle HUD: everything you read or hover (numbers, slots,
 * statuses, rhythm). The PixiJS half (HudScene) paints the orbs, the bar body and the liquid.
 */

/** Seconds of future shown on a rhythm track. */
const RHYTHM_WINDOW = 4;

const AILMENT_ICON: Record<string, IconName> = {
  burn: "fire",
  chill: "snow",
  shock: "bolt",
  bleed: "drop",
  poison: "venom",
  corruption: "void",
};

const AILMENT_NAME: Record<string, string> = {
  burn: "Burn",
  chill: "Chill",
  shock: "Shock",
  bleed: "Bleed",
  poison: "Poison",
  corruption: "Corruption",
};

function buffIcon(stat: string): IconName {
  const s = stat.toLowerCase();
  if (s.includes("bleed")) return "drop";
  if (s.includes("poison")) return "venom";
  if (s.includes("burn") || s.includes("fire")) return "fire";
  if (s.includes("chill") || s.includes("cold")) return "snow";
  if (s.includes("shock") || s.includes("lightning")) return "bolt";
  if (s.includes("armor") || s.includes("block") || s.includes("resist")) return "shield";
  if (s.includes("speed")) return "flurry";
  if (s.includes("crit")) return "execute";
  if (s.includes("heat")) return "flame";
  if (s.includes("evasion")) return "skirmisher";
  return "strike";
}

/** Default Attack icon per weapon (the Heir) or by range (enemies). */
export const WEAPON_ICON: Record<string, IconName> = {
  sword: "sword",
  wand: "wand",
  axe: "axe",
  dagger: "dagger",
  bow: "bow",
  crossbow: "crossbow",
  mace: "hammer",
  staff: "wand",
};

type Status = {
  key: string;
  icon: IconName;
  name: string;
  kind: "buff" | "curse" | "stun" | `ailment-${string}`;
  stacks?: number;
  remaining: number;
};

function statusesOf(f: FighterSnapshot): Status[] {
  const out: Status[] = [];
  if (f.stunned > 0)
    out.push({ key: "stun", icon: "stun", name: "Stunned", kind: "stun", remaining: f.stunned });
  for (const a of f.ailments)
    out.push({
      key: a.type,
      icon: AILMENT_ICON[a.type] ?? "warning",
      name: AILMENT_NAME[a.type] ?? a.type,
      kind: `ailment-${a.type}`,
      ...(a.stacks && a.stacks > 1 ? { stacks: a.stacks } : {}),
      remaining: a.remaining,
    });
  for (const c of f.curses)
    out.push({
      key: `c-${c.name}`,
      icon: c.armor ? "hammer" : "curse",
      name: c.name,
      kind: "curse",
      remaining: c.remaining,
    });
  for (const b of f.buffs)
    out.push({
      key: `b-${b.name}`,
      icon: buffIcon(b.stat),
      name: b.name,
      kind: "buff",
      ...(b.stacks > 1 ? { stacks: b.stacks } : {}),
      remaining: b.remaining,
    });
  return out;
}

/** Buffs, curses, ailments and stun as ARPG status icons with stacks and seconds left. */
export function StatusIcons(props: {
  fighter: FighterSnapshot;
  className?: string;
  style?: React.CSSProperties;
}) {
  const list = statusesOf(props.fighter);
  return (
    <div className={`hud-status ${props.className ?? ""}`} style={props.style}>
      {list.map((s) => (
        <span
          key={s.key}
          className={`hud-status-icon ${s.kind}${s.remaining < 1.5 ? " fading" : ""}`}
          title={s.name}
        >
          <Icon name={s.icon} size={18} color="#fff6e4" />
          {s.stacks && <b className="mono">{s.stacks}</b>}
          <i className="mono">
            {s.remaining < 10 ? s.remaining.toFixed(1) : Math.ceil(s.remaining)}
          </i>
        </span>
      ))}
    </div>
  );
}

/** Is the next swing a Rotation skill (Heat reached its Trigger Threshold)? */
function nextIsSkill(f: FighterSnapshot): boolean {
  const next = f.rotation[f.nextSlot];
  return next !== undefined && f.heat >= next.threshold;
}

/**
 * The attack rhythm: future swings slide toward the "now" mark on the left. Stun and a Heavy
 * Attack wind-up hold the swings (the band shows how long); an announced Heavy Attack sits on
 * the track where it will start.
 */
export function Rhythm(props: {
  fighter: FighterSnapshot;
  width: number;
  attackIcon: IconName;
  enemy?: boolean;
}) {
  const f = props.fighter;
  const W = props.width;
  const px = (t: number) => (Math.min(t, RHYTHM_WINDOW) / RHYTHM_WINDOW) * W;
  const baseRate = Math.max(0.05, f.attackRate || f.stats.attackSpeed);
  // Just after a swing the "now" mark flares and fades out over a third of a second.
  const sinceSwing = f.attackRate > 0 ? f.attackProgress / f.attackRate : 1;
  const flare = Math.max(0, 1 - sinceSwing / 0.35);

  const hold = f.stunned > 0 ? f.stunned : (f.telegraph?.remaining ?? 0);
  const heavyAt = f.nextHeavy ? f.nextHeavy.in : null;
  const beats: number[] = [];
  for (let k = 1; beats.length < 12; k++) {
    let t = hold + (k - f.attackProgress) / baseRate;
    if (heavyAt !== null && t > heavyAt) t += f.nextHeavy?.windup ?? 0;
    if (t > RHYTHM_WINDOW) break;
    beats.push(t);
  }
  const skillNext = nextIsSkill(f);
  const next = f.rotation[f.nextSlot];
  const firstIcon: IconName = skillNext && next ? skillIcon(next.skillId) : props.attackIcon;

  return (
    <div
      className={`rhythm${f.stunned > 0 ? " stunned" : ""}${f.telegraph ? " winding" : ""}${props.enemy ? " enemy" : ""}`}
      style={{ width: W }}
      aria-hidden="true"
    >
      <div className="rhythm-groove" />
      {f.stunned > 0 && (
        <div className="rhythm-hold stun" style={{ width: px(f.stunned) }}>
          <Icon name="stun" size={12} color="#e8e2d6" />
        </div>
      )}
      {f.telegraph && (
        <div className="rhythm-hold heavy" style={{ width: px(f.telegraph.remaining) }}>
          <span>{f.telegraph.skill}</span>
        </div>
      )}
      {heavyAt !== null && f.nextHeavy && heavyAt < RHYTHM_WINDOW && (
        <div
          className="rhythm-heavy"
          style={{
            left: px(heavyAt),
            width: Math.max(10, px(heavyAt + f.nextHeavy.windup) - px(heavyAt)),
          }}
          title={`Heavy Attack: ${f.nextHeavy.skill}`}
        >
          <Icon name="warning" size={12} color="#ffd9bf" />
        </div>
      )}
      {heavyAt !== null && f.nextHeavy && heavyAt >= RHYTHM_WINDOW && (
        <div className="rhythm-heavy later" title={`Heavy Attack: ${f.nextHeavy.skill}`}>
          <Icon name="warning" size={11} color="#ffd9bf" />
          {Math.ceil(heavyAt)}s
        </div>
      )}
      {beats.map((t, i) => (
        <span
          key={i}
          className={`rhythm-beat${i === 0 ? " first" : ""}${i === 0 && skillNext ? " skill" : ""}`}
          style={{ left: px(t) }}
        >
          {i === 0 && <Icon name={firstIcon} size={12} color="#fff6e4" />}
        </span>
      ))}
      <span
        className="rhythm-now"
        style={{
          boxShadow: `0 0 ${8 + 16 * flare}px ${2 + 6 * flare}px rgb(255 210 122 / ${0.5 + 0.5 * flare})`,
          transform: `scaleY(${1 + 0.7 * flare})`,
        }}
      />
    </div>
  );
}

/** A slot with the swing ring: the action that fires when the ring closes. */
function swingStyle(f: FighterSnapshot, on: boolean): React.CSSProperties | undefined {
  if (!on) return undefined;
  return { "--swing": `${Math.round(f.attackProgress * 360)}deg` } as React.CSSProperties;
}

export interface HeroBarProps {
  hero: FighterSnapshot;
  heroTitle: string;
  weaponIcon: IconName;
  flaskCharges: number;
  flaskMax: number;
  flash: { slot: number; n: number } | null;
  stageW: number;
  stageH: number;
  boons: React.ReactNode;
  right: React.ReactNode;
}

/** The bottom bar: orb readouts, flasks, the skill bar with the Default Attack, statuses, Boons. */
export function HeroBar(props: HeroBarProps) {
  const { hero } = props;
  const L = hudLayout(props.stageW, props.stageH);
  const stunned = hero.stunned > 0;
  const skillNext = nextIsSkill(hero);
  const lifePct = Math.round((hero.life / hero.maxLife) * 100);
  const sideLeft = L.lifeOrb.x + ORB_R + 30;
  const sideRight = props.stageW - (L.heatOrb.x - ORB_R - 30);
  const nextSlot = hero.rotation[hero.nextSlot];
  return (
    <div className="hud-hero" style={{ "--bar-h": `${BAR_H}px` } as React.CSSProperties}>
      <div
        className="orb-readout life"
        style={{ left: L.lifeOrb.x - ORB_R, top: L.lifeOrb.y - ORB_R }}
        role="meter"
        aria-label="Life"
        aria-valuemin={0}
        aria-valuemax={hero.maxLife}
        aria-valuenow={Math.round(hero.life)}
        title={`${props.heroTitle} · Life ${lifePct} %`}
      >
        <span className="orb-num title-font">{fmt(hero.life)}</span>
        <span className="orb-max mono">/ {fmt(hero.maxLife)}</span>
        {hero.barrier > 0 && <span className="orb-shield mono">+{fmt(hero.barrier)}</span>}
        <span className="orb-level title-font">{hero.level}</span>
      </div>
      <div
        className={`orb-readout heat${skillNext ? " ready" : ""}`}
        style={{ left: L.heatOrb.x - ORB_R, top: L.heatOrb.y - ORB_R }}
        role="meter"
        aria-label="Heat"
        aria-valuemin={0}
        aria-valuemax={hero.maxHeat}
        aria-valuenow={Math.round(hero.heat)}
        title={nextSlot ? `Heat · ${nextSlot.name} at ${nextSlot.threshold}` : "Heat"}
      >
        <span className="orb-num title-font">{Math.floor(hero.heat)}</span>
        {nextSlot && <span className="orb-max mono">/ {nextSlot.threshold}</span>}
      </div>

      <StatusIcons fighter={hero} className="hero" style={{ left: sideLeft }} />
      <div className="hud-boons-wrap" style={{ right: sideRight }}>
        {props.boons}
      </div>

      <div className="hud-flasks" style={{ left: sideLeft }} title="Ember Flask: between stages">
        {Array.from({ length: props.flaskMax }, (_, i) => (
          <span key={i} className={`hud-flask ${i < props.flaskCharges ? "full" : ""}`}>
            <span className="liquid" />
          </span>
        ))}
        <span className="hud-flask-count mono">
          {props.flaskCharges}/{props.flaskMax}
        </span>
      </div>

      <div className="hud-center">
        <Rhythm fighter={hero} width={420} attackIcon={props.weaponIcon} />
        <div className="skillbar" aria-label="Battle Plan">
          <div className="skill-slot-wrap" title={`${hero.defaultAttack} · Default Attack`}>
            <div
              className={`skill-slot attack${!skillNext ? " next swing" : ""}${stunned ? " stunned" : ""}`}
              style={swingStyle(hero, !skillNext)}
              data-testid="attack-slot"
            >
              <Icon name={props.weaponIcon} size={30} color="#fff6e4" />
              {stunned && <span className="stun-mark mono">{hero.stunned.toFixed(1)}</span>}
            </div>
            <span className={`skill-caption${!skillNext ? " next" : ""}`}>
              {hero.defaultAttack}
            </span>
          </div>
          {hero.rotation.length > 0 && <span className="skillbar-divider" aria-hidden="true" />}
          {hero.rotation.map((slot, i) => {
            const next = i === hero.nextSlot;
            const ready = next && skillNext;
            const fill = next ? Math.min(100, (hero.heat / slot.threshold) * 100) : 0;
            return (
              <div
                key={slot.skillId}
                className="skill-slot-wrap"
                title={`${slot.name} · ${slot.heatCost} Heat`}
              >
                <div
                  className={`skill-slot ${next ? "next" : ""}${ready ? " ready swing" : ""}${stunned && ready ? " stunned" : ""} ${props.flash?.slot === i ? `fired-${props.flash.n % 2}` : ""}`}
                  style={{ background: skillTint(slot.skillId), ...swingStyle(hero, ready) }}
                  data-testid="skill-slot"
                >
                  <div className="heat-fill" style={{ height: `${fill}%` }} />
                  <Icon name={skillIcon(slot.skillId)} size={30} color="#fff6e4" />
                  <span className="pos mono">{i + 1}</span>
                  <span className="corner mono">
                    {next ? `${Math.floor(hero.heat)}/${slot.threshold}` : slot.heatCost}
                  </span>
                </div>
                <span className={`skill-caption ${next ? "next" : ""}`}>{slot.name}</span>
              </div>
            );
          })}
          {hero.reactions.length > 0 && <span className="skillbar-divider" aria-hidden="true" />}
          {hero.reactions.map((slot, i) => (
            <div
              key={`r-${slot.skillId}`}
              className="skill-slot-wrap reaction"
              title={`Reaction: ${slot.name} · ${slot.heatCost} Heat`}
            >
              <div
                className={`skill-slot reaction ${slot.cooldownLeft > 0 ? "cooling" : ""}${slot.pending ? " pending" : ""} ${props.flash?.slot === 10 + i ? `fired-${props.flash.n % 2}` : ""}`}
                style={{ background: skillTint(slot.skillId) }}
                data-testid="reaction-slot"
              >
                <Icon name={skillIcon(slot.skillId)} size={24} color="#fff6e4" />
                <span className="pos mono">R{i + 1}</span>
                {slot.cooldownLeft > 0 && (
                  <span className="cooldown mono">{Math.ceil(slot.cooldownLeft)}</span>
                )}
              </div>
              <span className="skill-caption">{slot.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hud-right" style={{ right: sideLeft }}>
        {props.right}
      </div>
    </div>
  );
}

export interface EnemyFrameProps {
  enemy: FighterSnapshot;
  name: string;
  sub: string;
  icon: IconName;
  tag?: "ELITE" | "BOSS";
  mods: readonly string[];
  attackIcon: IconName;
  thiefLeft: number | null;
}

/** The enemy at the top center: name, liquid Life (Pixi), Heat, attack rhythm with Heavy Attacks. */
export function EnemyFrame(props: EnemyFrameProps) {
  const e = props.enemy;
  const tagClass = props.tag === "BOSS" ? "boss" : props.tag === "ELITE" ? "elite" : "";
  return (
    <section
      className={`hud-enemy ${tagClass}${e.telegraph ? " charging" : ""}`}
      style={{ top: ENEMY_TOP, width: ENEMY_W, marginLeft: -ENEMY_W / 2 }}
      aria-label={`${props.name} plaque`}
    >
      <div className="hud-enemy-head" title={props.sub}>
        <Icon name={props.icon} size={20} color="#f3e6c8" />
        {props.tag && <span className={`rank-tag title-font ${tagClass}`}>{props.tag}</span>}
        <span className="hud-enemy-name title-font">{props.name}</span>
        <span className="hud-enemy-kind">{props.sub.split(" · ")[0]}</span>
        <span className="hud-enemy-level title-font">Lv {e.level}</span>
      </div>
      <div
        className="hud-enemy-life"
        style={{ left: ENEMY_LIFE.x, top: ENEMY_LIFE.y, width: ENEMY_LIFE.w, height: ENEMY_LIFE.h }}
        role="meter"
        aria-label="Life"
        aria-valuemin={0}
        aria-valuemax={e.maxLife}
        aria-valuenow={Math.round(e.life)}
      >
        <span className="mono">
          {fmt(e.life)} / {fmt(e.maxLife)}
          {e.barrier > 0 ? ` · +${fmt(e.barrier)}` : ""}
        </span>
      </div>
      <div
        className={`hud-enemy-heat${e.telegraph ? " charging" : ""}`}
        role="meter"
        aria-label="Heat"
        aria-valuemin={0}
        aria-valuemax={e.maxHeat}
        aria-valuenow={Math.round(e.heat)}
      >
        <div className="fill" style={{ width: `${(e.heat / e.maxHeat) * 100}%` }} />
      </div>
      <div className="hud-enemy-rhythm">
        <Rhythm fighter={e} width={440} attackIcon={props.attackIcon} enemy />
        <div className="hud-enemy-skills">
          {e.rotation.map((slot, i) => (
            <div
              key={slot.skillId}
              className={`enemy-slot ${i === e.nextSlot ? "next" : ""}`}
              title={`${slot.name} · ${slot.heatCost} Heat`}
              style={{ background: skillTint(slot.skillId) }}
            >
              <Icon name={skillIcon(slot.skillId)} size={18} color="#fff6e4" />
            </div>
          ))}
        </div>
      </div>
      <div className="hud-enemy-below">
        {props.mods.map((m) => (
          <span key={m} className="mod-chip">
            {m}
          </span>
        ))}
        {props.thiefLeft !== null && (
          <span
            className={`thief-timer${props.thiefLeft <= 5 ? " hurry" : ""}`}
            role="timer"
            data-testid="thief-timer"
          >
            <Icon name="retreat" size={16} color="#ffd84a" />
            <span>Flees in {props.thiefLeft}s</span>
          </span>
        )}
        <StatusIcons fighter={e} className="enemy" />
      </div>
    </section>
  );
}
