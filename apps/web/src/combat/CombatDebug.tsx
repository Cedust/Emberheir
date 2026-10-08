import {
  ACT1,
  ACT1_ENEMIES,
  ACT2,
  ACT2_ENEMIES,
  HERO_SKILLS,
  HERO_WEAPONS,
  START_SKILLS,
  SWORD,
  createHeroSetup,
  resolveHeroGear,
  rollGear,
} from "@emberheir/content";
import {
  type Equipment,
  Fight,
  type FightSnapshot,
  type Rarity,
  Rng,
  type SkillDefinition,
  createEnemySetup,
} from "@emberheir/sim";
import { useEffect, useMemo, useRef, useState } from "react";
import { GearPanel } from "../items/GearPanel";
import { CombatLog } from "./CombatLog";
import { FighterPanel } from "./FighterPanel";
import { type LogLine, formatEvent, formatTime } from "./format";

/** Every enemy of the playable acts, bosses included. */
const ENEMIES = [...ACT1_ENEMIES, ACT1.boss, ...ACT2_ENEMIES, ACT2.boss];

interface SlotConfig {
  skillId: string;
  /** Empty string = Trigger Threshold equals the Heat Cost. */
  threshold: string;
}

/** Second slot suggestion per weapon, so both PoC builds start with a sensible Battle Plan. */
const SECOND_SKILL: Record<string, string> = { sword: "flurry", "fire-wand": "chain-lightning" };

const defaultSlots = (weaponId: string): SlotConfig[] => [
  { skillId: START_SKILLS[weaponId]?.id ?? "", threshold: "" },
  { skillId: SECOND_SKILL[weaponId] ?? "", threshold: "" },
];

const SPEEDS = [1, 2, 4, 8] as const;

const GEAR_OPTIONS: readonly { value: Rarity | "mixed" | "none"; label: string }[] = [
  { value: "none", label: "None" },
  { value: "normal", label: "Normal" },
  { value: "magic", label: "Magic" },
  { value: "rare", label: "Rare" },
  { value: "epic", label: "Epic" },
  { value: "mixed", label: "Mixed" },
];
type GearOption = (typeof GEAR_OPTIONS)[number]["value"];

const findSkill = (id: string): SkillDefinition | undefined => HERO_SKILLS.find((s) => s.id === id);

export function CombatDebug() {
  const [weaponId, setWeaponId] = useState(HERO_WEAPONS[0]?.id ?? "");
  const [slots, setSlots] = useState<SlotConfig[]>(() => defaultSlots(weaponId));
  const [enemyId, setEnemyId] = useState(ENEMIES[0]?.id ?? "");
  const [level, setLevel] = useState(1);
  const [seed, setSeed] = useState(1);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);
  const [gearRarity, setGearRarity] = useState<GearOption>("rare");
  const [itemLevel, setItemLevel] = useState(3);
  const [gearSeed, setGearSeed] = useState(1);

  // Same gear seed + options = same items, so a fight can be replayed with identical gear.
  const equipment: Equipment = useMemo(
    () =>
      gearRarity === "none"
        ? {}
        : rollGear({ weaponBaseId: weaponId, rarity: gearRarity, itemLevel }, new Rng(gearSeed)),
    [weaponId, gearRarity, itemLevel, gearSeed],
  );
  const weapon = HERO_WEAPONS.find((w) => w.id === weaponId);
  const resolvedGear = useMemo(
    () => resolveHeroGear({ equipment, weapon: weapon ?? SWORD }),
    [equipment, weapon],
  );

  const fightRef = useRef<Fight | null>(null);
  const [snapshot, setSnapshot] = useState<FightSnapshot | null>(null);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);

  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  /** Pulls new events and the current state out of the fight. */
  const sync = (fight: Fight, from: number) => {
    const names = { hero: fight.snapshot().hero.name, enemy: fight.snapshot().enemy.name };
    const fresh = fight.events.slice(from).map((e) => formatEvent(e, names));
    if (fresh.length) setLines((prev) => [...prev, ...fresh]);
    setSnapshot(fight.snapshot());
    if (fight.over) setRunning(false);
  };

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const fight = fightRef.current;
      if (!fight) return;
      // Cap the frame step so a background tab does not jump through half the fight.
      const dt = Math.min(0.25, (now - last) / 1000) * speedRef.current;
      last = now;
      const before = fight.events.length;
      fight.advance(dt);
      sync(fight, before);
      if (!fight.over) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const start = () => {
    const enemy = ENEMIES.find((e) => e.id === enemyId);
    if (!weapon || !enemy) return;
    const chosen = slots.flatMap((slot) => {
      const skill = findSkill(slot.skillId);
      return skill
        ? [{ skill, threshold: slot.threshold === "" ? undefined : Number(slot.threshold) }]
        : [];
    });
    const hero = createHeroSetup({
      weapon: weapon ?? SWORD,
      equipment,
      level,
      skills: chosen.map((c) => c.skill),
      thresholds: chosen.map((c) => c.threshold),
    });
    const fight = new Fight(hero, createEnemySetup(enemy, level), seed);
    fightRef.current = fight;
    setLines([]);
    setSnapshot(fight.snapshot());
    setRunning(true);
  };

  const skip = () => {
    const fight = fightRef.current;
    if (!fight) return;
    const before = fight.events.length;
    fight.runToEnd();
    sync(fight, before);
  };

  const changeWeapon = (id: string) => {
    setWeaponId(id);
    setSlots(defaultSlots(id));
  };

  const updateSlot = (index: number, patch: Partial<SlotConfig>) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const result = snapshot?.over
    ? snapshot.winner === "hero"
      ? "Victory"
      : snapshot.winner === "enemy"
        ? "Defeat"
        : "Draw"
    : null;

  return (
    <div className="combat-debug">
      <form
        className="controls"
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
      >
        <label>
          Weapon
          <select value={weaponId} onChange={(e) => changeWeapon(e.target.value)}>
            {HERO_WEAPONS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        {slots.map((slot, i) => (
          <fieldset key={i} className="slot-config">
            <legend>Slot {i + 1}</legend>
            <select
              aria-label={`Slot ${i + 1} skill`}
              value={slot.skillId}
              onChange={(e) => updateSlot(i, { skillId: e.target.value })}
            >
              <option value="">(empty)</option>
              {HERO_SKILLS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.heatCost})
                </option>
              ))}
            </select>
            <input
              aria-label={`Slot ${i + 1} Trigger Threshold`}
              type="number"
              min={0}
              max={100}
              placeholder="= cost"
              value={slot.threshold}
              onChange={(e) => updateSlot(i, { threshold: e.target.value })}
            />
          </fieldset>
        ))}
        <label>
          Enemy
          <select value={enemyId} onChange={(e) => setEnemyId(e.target.value)}>
            {ENEMIES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Level
          <input
            type="number"
            min={1}
            max={10}
            value={level}
            onChange={(e) => setLevel(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <label>
          Seed
          <input
            type="number"
            min={0}
            value={seed}
            onChange={(e) => setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          />
        </label>
        <label>
          Speed
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value) as (typeof SPEEDS)[number])}
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
        <div className="buttons">
          <button type="submit" className="primary">
            Start fight
          </button>
          <button type="button" onClick={skip} disabled={!running}>
            Skip to end
          </button>
        </div>
      </form>

      <section className="gear panel" aria-label="Gear">
        <div className="gear-controls">
          <h2>Gear</h2>
          <label>
            Rarity
            <select
              value={gearRarity}
              onChange={(e) => setGearRarity(e.target.value as GearOption)}
            >
              {GEAR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Item Level
            <input
              type="number"
              min={1}
              max={100}
              value={itemLevel}
              onChange={(e) =>
                setItemLevel(Math.min(100, Math.max(1, Math.floor(Number(e.target.value) || 1))))
              }
            />
          </label>
          <label>
            Gear seed
            <input
              type="number"
              min={0}
              value={gearSeed}
              onChange={(e) => setGearSeed(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            />
          </label>
          <button type="button" onClick={() => setGearSeed((s) => s + 1)}>
            Roll gear
          </button>
        </div>
        <GearPanel equipment={equipment} resolved={resolvedGear} />
      </section>

      {snapshot && (
        <div className="arena">
          <FighterPanel fighter={snapshot.hero} />
          <div className="vs">
            <span className="clock">{formatTime(snapshot.time)}</span>
            {result && (
              <strong
                className={`result result-${result.toLowerCase()}`}
                data-testid="fight-result"
              >
                {result}
              </strong>
            )}
          </div>
          <FighterPanel fighter={snapshot.enemy} />
        </div>
      )}

      <CombatLog lines={lines} />
    </div>
  );
}
