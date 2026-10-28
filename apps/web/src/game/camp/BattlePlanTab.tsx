import { GAME_DATA } from "@emberheir/content";
import {
  AILMENT_SOURCE,
  BATTLE_PLAN_LADDER,
  type BattlePlanState,
  type WeaponDefinition,
  type SkillDefinition,
  CAPSTONES,
  type GameState,
  REACTION_CONDITIONS,
  REACTION_COOLDOWN,
  SLOT_CONDITIONS,
  SLOT_MODIFIERS,
  type SlotModifier,
  battlePlanUnlocks,
  damageShare,
  deriveStats,
  estimateRotation,
  heatPerSecond,
  heroSetup,
  knownSkills,
  modifierAllowed,
  reactionConditionAllowed,
  triggerThreshold,
  unlockPrestige,
  capstoneChangeAcorns,
} from "@emberheir/sim";
import { type DragEvent, useState } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { type NoteHover, useNoteHover } from "../../ui/ItemTooltip";
import { WEAPON_ICON } from "../battle/hud/BattleHud";
import { AttackIcon, SkillIcon } from "../battle/SkillIcon";
import { skillIcon, skillTint } from "../battle/skills";
import type { GameApi } from "../useGame";
import { Price } from "../../ui/kit/Currency";
import { SkillMeta, skillText } from "../../ui/SkillMeta";

/** Prestige that opens each Rotation / Reaction Slot (from the Battle Plan ladder). */
const unlocksOf = (upgrade: "rotationSlot" | "reactionSlot", max: number) =>
  Array.from({ length: max }, (_, i) => unlockPrestige(upgrade, i + 1)).filter(
    (p): p is number => p !== undefined,
  );
const ROTATION_UNLOCK = unlocksOf("rotationSlot", 4);
const REACTION_UNLOCK = unlocksOf("reactionSlot", 2);

const MOD_ICON: Record<SlotModifier, IconName> = {
  thrifty: "drop",
  empowered: "strike",
  reverb: "cycle",
  overcharge: "fire",
};

const CONDITION_ICON: Record<string, IconName> = {
  "enemy-bleed": "rend",
  "enemy-poison": "venom",
  "enemy-burn": "fire",
  "enemy-chill": "snow",
  "enemy-shock": "bolt",
  "enemy-corruption": "void",
  "enemy-50": "execute",
  "enemy-30": "execute",
  "life-50": "warning",
  "life-30": "warning",
  "fight-start": "strike",
  "enemy-windup": "slam",
  ailmented: "curse",
  "enemy-heals": "flask",
  "barrier-breaks": "shield",
  "enemy-stacks": "toxic",
};

/** What the library on the right fills: a slot's skill, one Modifier socket or its condition. */
type Part = "skill" | "mod" | "cond";
interface Target {
  readonly row: "rotation" | "reaction" | "opening";
  readonly index: number;
  readonly part: Part;
  /** Modifier socket. */
  readonly socket: number;
}

const SKILL_DRAG = "application/x-emberheir-skill";

/** Damage share of one slot in the last fight ("Plan-Feedback ohne Text"). */
export function ShareBar(props: { share: number; label?: string }) {
  const pct = Math.round(props.share * 100);
  return (
    <span className="share-bar" title={`${props.label ?? "Damage"} last fight: ${pct} %`}>
      <span className="share-track">
        <span className="share-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="mono small">{pct}%</span>
    </span>
  );
}

function Flames(props: { wait: number }) {
  if (props.wait < 0.3) {
    return (
      <span className="chain-plus" title="Back to back">
        +
      </span>
    );
  }
  const n = props.wait < 2.5 ? 1 : props.wait < 5 ? 2 : 3;
  return (
    <span
      className="chain-flames"
      title={n === 1 ? "Short wait" : n === 2 ? "Medium wait" : "Long wait"}
    >
      {Array.from({ length: n }, (_, i) => (
        <Icon key={i} name="flame" size={14} />
      ))}
    </span>
  );
}

/**
 * The Battle Plan (ui-ux-plan-v1.md 4.4): slots look like the fight's skill bar. Skills come
 * from the library by drag or click, Modifiers sit as sockets under a slot, the Heat a slot
 * fires at is a slider on a Heat bar. No dropdowns.
 */
export function BattlePlanTab(props: { state: GameState; game: GameApi }) {
  const { state, game } = props;
  const [target, setTarget] = useState<Target>({
    row: "rotation",
    index: 0,
    part: "skill",
    socket: 0,
  });
  const { setup } = heroSetup(state, GAME_DATA);
  const stats = deriveStats(setup);
  const known = knownSkills(state, GAME_DATA, setup.weapon);
  const rate = heatPerSecond(setup, stats);
  const slots = setup.rotation.map((r) => ({
    name: r.skill.name,
    id: r.skill.id,
    heatCost: r.skill.heatCost,
    threshold: triggerThreshold(r.skill.heatCost, r.threshold),
  }));
  const chain = estimateRotation(slots, rate, stats.startingHeat);
  const prestige = state.legacy.prestige;
  const unlocks = battlePlanUnlocks(prestige);
  const plan = state.hero.plan;
  const report = state.run?.rewards?.report;
  const setPlan = (patch: Partial<BattlePlanState>) =>
    game.dispatch({ type: "setBattlePlan", plan: { ...plan, ...patch } });
  const at = <T,>(list: readonly T[], i: number, value: T, empty: T): T[] => {
    const next = Array.from({ length: Math.max(list.length, i + 1) }, (_, j) => list[j] ?? empty);
    next[i] = value;
    return next;
  };

  const rotationSkill = (i: number) => {
    const id = state.hero.rotation[i] ?? null;
    return id === null ? known.find((k) => k.startSkill) : known.find((k) => k.skill.id === id);
  };
  const skillOf = (id: string | null | undefined) => known.find((k) => k.skill.id === id);
  const echoSlot = target.row === "rotation" ? target.index : 0;

  /** Puts a skill into a slot (rotation, reaction or opening move); null empties it. */
  const placeSkill = (row: Target["row"], i: number, id: string | null) => {
    if (row === "rotation") {
      const k = id ? skillOf(id) : undefined;
      if (!k) return;
      game.dispatch({ type: "setRotationSkill", slot: i, skillId: k.startSkill ? null : id });
    } else if (row === "reaction") {
      const r = plan.reactions[i] ?? null;
      setPlan({
        reactions: at(
          plan.reactions,
          i,
          id ? { skillId: id, conditionId: r?.conditionId ?? "life-50" } : null,
          null,
        ),
      });
    } else {
      setPlan({ openingMove: id });
    }
  };
  const mods = (row: Target["row"], i: number) =>
    (row === "rotation" ? plan.modifiers[i] : plan.reactionModifiers[i]) ?? [];
  const placeMod = (row: Target["row"], i: number, socket: number, id: SlotModifier | null) => {
    const next = [...mods(row, i)];
    if (id) next[socket] = id;
    else next.splice(socket, 1);
    const clean = next.filter(Boolean);
    if (row === "rotation") setPlan({ modifiers: at(plan.modifiers, i, clean, []) });
    else setPlan({ reactionModifiers: at(plan.reactionModifiers, i, clean, []) });
  };
  const pick = (t: Partial<Target> & Pick<Target, "row" | "index">) =>
    setTarget({ part: "skill", socket: 0, ...t });
  const on = (row: Target["row"], index: number, part: Part, socket = 0) =>
    target.row === row &&
    target.index === index &&
    target.part === part &&
    target.socket === socket;

  const dropSkill = (row: Target["row"], i: number) => ({
    onDragOver: (e: DragEvent) => {
      if (e.dataTransfer.types.includes(SKILL_DRAG)) e.preventDefault();
    },
    onDrop: (e: DragEvent) => {
      const id = e.dataTransfer.getData(SKILL_DRAG);
      if (!id) return;
      e.preventDefault();
      placeSkill(row, i, id);
      pick({ row, index: i });
    },
  });

  const sockets = (row: Target["row"], i: number) =>
    unlocks.modifiers > 0 && (
      <div className="plan-sockets" role="group" aria-label="Modifiers">
        {Array.from({ length: unlocks.modifiers }, (_, m) => {
          const id = mods(row, i)[m];
          const def = SLOT_MODIFIERS.find((d) => d.id === id);
          return (
            <Chip
              key={m}
              className="plan-socket"
              icon={def ? MOD_ICON[def.id] : undefined}
              label={def?.name ?? `Modifier ${m + 1}`}
              filled={!!def}
              on={on(row, i, "mod", m)}
              note={
                def
                  ? { name: def.name, kind: "Modifier", explain: def.text }
                  : { name: "Modifier", kind: "Empty socket", explain: "" }
              }
              onClick={() => pick({ row, index: i, part: "mod", socket: m })}
            />
          );
        })}
      </div>
    );

  return (
    <div className="plan-layout">
      <main className="plan-main">
        <section aria-label="Rotation">
          <span className="title-font section-title">Rotation</span>
          <div className="plan-slots">
            {ROTATION_UNLOCK.map((p, i) => {
              const k = i < state.progress.rotationSlots ? rotationSkill(i) : undefined;
              if (!k) return <LockedSlot key={i} prestige={p} />;
              const cost = k.skill.heatCost;
              const fires = plan.thresholds[i] ?? cost;
              return (
                <div
                  key={i}
                  className={`plan-col panel-card${target.row === "rotation" && target.index === i ? " on" : ""}`}
                  data-testid={`rotation-slot-${i}`}
                >
                  <PlanSlot
                    label={`Rotation Slot ${i + 1}`}
                    pos={String(i + 1)}
                    skillId={k.skill.id}
                    name={k.skill.name}
                    corner={String(cost)}
                    on={on("rotation", i, "skill")}
                    onClick={() => pick({ row: "rotation", index: i })}
                    drop={dropSkill("rotation", i)}
                  />
                  {report && <ShareBar share={damageShare(report, k.skill.name)} />}
                  {unlocks.thresholds && (
                    <HeatSlider
                      cost={cost}
                      value={fires}
                      name={k.skill.name}
                      onChange={(v) =>
                        setPlan({
                          thresholds: at(plan.thresholds, i, v === cost ? null : v, null),
                        })
                      }
                    />
                  )}
                  {sockets("rotation", i)}
                  {unlocks.conditions && (
                    <ConditionChip
                      id={plan.conditions[i] ?? null}
                      list={SLOT_CONDITIONS}
                      empty="Always"
                      kind="Only if"
                      on={on("rotation", i, "cond")}
                      onClick={() => pick({ row: "rotation", index: i, part: "cond" })}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section aria-label="Reactions">
          <span className="title-font section-title">Reactions</span>
          <div className="plan-slots reactions">
            {REACTION_UNLOCK.map((p, i) => {
              if (i >= unlocks.reactionSlots) return <LockedSlot key={p} prestige={p} small />;
              const r = plan.reactions[i] ?? null;
              const k = skillOf(r?.skillId);
              const fired = report?.reactions.find((x) => x.skill === k?.skill.name)?.casts;
              return (
                <div
                  key={p}
                  className={`plan-col panel-card${target.row === "reaction" && target.index === i ? " on" : ""}`}
                  data-testid={`reaction-slot-${i}`}
                >
                  <PlanSlot
                    label={`Reaction Slot ${i + 1}`}
                    pos={`R${i + 1}`}
                    reaction
                    skillId={k?.skill.id}
                    name={k?.skill.name ?? "Empty"}
                    corner={fired !== undefined ? `×${fired}` : undefined}
                    tip={`${REACTION_COOLDOWN} s cooldown`}
                    on={on("reaction", i, "skill")}
                    onClick={() => pick({ row: "reaction", index: i })}
                    drop={dropSkill("reaction", i)}
                  />
                  {r && (
                    <ConditionChip
                      id={r.conditionId}
                      list={REACTION_CONDITIONS}
                      empty=""
                      kind="When"
                      on={on("reaction", i, "cond")}
                      onClick={() => pick({ row: "reaction", index: i, part: "cond" })}
                    />
                  )}
                  {sockets("reaction", i)}
                </div>
              );
            })}
            {unlocks.openingMove && (
              <div
                className={`plan-col panel-card${target.row === "opening" ? " on" : ""}`}
                data-testid="opening-move"
              >
                <PlanSlot
                  label="Opening Move"
                  pos="◆"
                  reaction
                  skillId={skillOf(plan.openingMove)?.skill.id}
                  name={skillOf(plan.openingMove)?.skill.name ?? "Empty"}
                  tip="Opening Move · free at fight start"
                  on={on("opening", 0, "skill")}
                  onClick={() => pick({ row: "opening", index: 0 })}
                  drop={dropSkill("opening", 0)}
                />
              </div>
            )}
          </div>
        </section>

        <section className="chain" aria-label="One rotation">
          <div className="chain-row">
            <span className="skill-slot attack" title={setup.weapon.defaultAttack}>
              <AttackIcon
                weaponId={setup.weapon.id}
                fallback={WEAPON_ICON[setup.weapon.id] ?? "strike"}
                size={26}
              />
            </span>
            {report && (
              <ShareBar
                share={damageShare(report, setup.weapon.defaultAttack)}
                label={setup.weapon.defaultAttack}
              />
            )}
            <span className="skillbar-divider" aria-hidden="true" />
            {chain.map((step, i) => {
              const s = slots[step.slot];
              if (!s) return null;
              return (
                <span key={i} className="chain-step">
                  <Flames wait={step.wait} />
                  <span
                    className="skill-chip"
                    title={s.name}
                    style={{ background: skillTint(s.id) }}
                  >
                    <SkillIcon skillId={s.id} size={22} />
                  </span>
                </span>
              );
            })}
            {chain.length > 0 ? (
              <span className="chain-cycle" title="Starts over">
                <Icon name="cycle" size={20} />
              </span>
            ) : (
              <Icon name="warning" size={22} />
            )}
            <span className="grow" />
            {report && (
              <span className="chain-report" title={`${AILMENT_SOURCE} last fight`}>
                <Icon name="toxic" size={18} />
                <ShareBar share={damageShare(report, AILMENT_SOURCE)} label={AILMENT_SOURCE} />
              </span>
            )}
            <span className="mono sub" title="Heat per second">
              {rate.toFixed(1)}/s
            </span>
          </div>
        </section>
      </main>

      <aside className="plan-side">
        <Library
          target={target}
          known={known}
          weapon={setup.weapon}
          slotSkill={
            target.row === "rotation"
              ? rotationSkill(target.index)?.skill.id
              : target.row === "reaction"
                ? plan.reactions[target.index]?.skillId
                : (plan.openingMove ?? undefined)
          }
          mods={mods(target.row, target.index)}
          cond={
            target.row === "rotation"
              ? (plan.conditions[target.index] ?? null)
              : (plan.reactions[target.index]?.conditionId ?? null)
          }
          unlocks={unlocks}
          onSkill={(id) => placeSkill(target.row, target.index, id)}
          onMod={(id) => placeMod(target.row, target.index, target.socket, id)}
          onCond={(id) => {
            if (target.row === "rotation") {
              setPlan({ conditions: at(plan.conditions, target.index, id, null) });
            } else {
              const r = plan.reactions[target.index];
              if (r && id) {
                setPlan({
                  reactions: at(plan.reactions, target.index, { ...r, conditionId: id }, null),
                });
              }
            }
          }}
        />
        {unlocks.capstone ? (
          <Capstones
            state={state}
            echoSlot={echoSlot}
            onPick={(capstone) => setPlan({ capstone })}
          />
        ) : (
          <section className="panel-card ladder" aria-label="Battle Plan upgrades">
            <span className="title-font section-title">Upgrades</span>
            <ol>
              {BATTLE_PLAN_LADDER.map((u, i) => (
                <li key={u.name} className={i < prestige ? "done" : i === prestige ? "next" : ""}>
                  <span className="mono">P{i + 1}</span> {u.name}
                </li>
              ))}
            </ol>
          </section>
        )}
      </aside>
    </div>
  );
}

/** A slot like the fight's skill bar: tinted square, icon, position, Heat cost in the corner. */
function PlanSlot(props: {
  label: string;
  pos: string;
  skillId: string | undefined;
  name: string;
  corner?: string | undefined;
  reaction?: boolean;
  tip?: string;
  on: boolean;
  onClick: () => void;
  drop: { onDragOver: (e: DragEvent) => void; onDrop: (e: DragEvent) => void };
}) {
  const [over, setOver] = useState(false);
  return (
    <button
      type="button"
      className={`plan-slot-btn${props.on ? " on" : ""}${over ? " over" : ""}`}
      aria-label={props.label}
      aria-pressed={props.on}
      title={props.tip}
      onClick={props.onClick}
      onDragOver={(e) => {
        props.drop.onDragOver(e);
        if (e.defaultPrevented) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        props.drop.onDrop(e);
      }}
    >
      <span
        className={`skill-slot${props.reaction ? " reaction" : ""}${props.skillId ? "" : " empty"}`}
        style={props.skillId ? { background: skillTint(props.skillId) } : undefined}
      >
        {props.skillId && <SkillIcon skillId={props.skillId} size={props.reaction ? 26 : 32} />}
        <span className="pos mono">{props.pos}</span>
        {props.corner && <span className="corner mono">{props.corner}</span>}
      </span>
      <span className="skill-caption">{props.name}</span>
    </button>
  );
}

function LockedSlot(props: { prestige: number; small?: boolean }) {
  return (
    <div
      className={`plan-col panel-card locked${props.small ? " small" : ""}`}
      title={`Prestige ${props.prestige}`}
    >
      <span className="skill-slot empty">
        <Icon name="lock" size={22} />
      </span>
      <span className="sub small">Prestige {props.prestige}</span>
    </div>
  );
}

/** "Fires at Heat": a Heat bar with a slider; it can never go below the skill's cost. */
function HeatSlider(props: {
  cost: number;
  value: number;
  name: string;
  onChange: (v: number) => void;
}) {
  const hover = useNoteHover({
    name: "Fires at Heat",
    kind: props.name,
    explain: "",
    status: `${props.value} Heat`,
  });
  return (
    <label className="heat-slider" {...hover}>
      <span className="heat-track">
        <span className="heat-cost" style={{ width: `${props.cost}%` }} />
        <span className="heat-fill" style={{ width: `${props.value}%` }} />
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={props.value}
        aria-label="Fires at Heat"
        onChange={(e) => props.onChange(Math.max(props.cost, Number(e.target.value)))}
      />
      <span className="mono heat-value">{props.value}</span>
    </label>
  );
}

/** A small round socket or pill under a slot, with its tooltip. */
function Chip(props: {
  className: string;
  icon: IconName | undefined;
  label: string;
  filled: boolean;
  on: boolean;
  note: NoteHover;
  onClick: () => void;
}) {
  const hover = useNoteHover(props.note);
  return (
    <button
      type="button"
      className={`${props.className}${props.filled ? " filled" : ""}${props.on ? " on" : ""}`}
      aria-label={props.label}
      aria-pressed={props.on}
      onClick={props.onClick}
      {...hover}
    >
      {props.icon ? <Icon name={props.icon} size={18} /> : <span aria-hidden="true">+</span>}
    </button>
  );
}

function ConditionChip(props: {
  id: string | null;
  list: readonly { readonly id: string; readonly name: string }[];
  empty: string;
  kind: string;
  on: boolean;
  onClick: () => void;
}) {
  const name = props.list.find((c) => c.id === props.id)?.name ?? props.empty;
  const hover = useNoteHover({ name, kind: props.kind, explain: "" });
  return (
    <button
      type="button"
      className={`plan-cond${props.id ? " filled" : ""}${props.on ? " on" : ""}`}
      aria-label={`${props.kind}: ${name}`}
      aria-pressed={props.on}
      onClick={props.onClick}
      {...hover}
    >
      <Icon name={props.id ? (CONDITION_ICON[props.id] ?? "eye") : "check"} size={16} />
      <span>{name}</span>
    </button>
  );
}

type Known = ReturnType<typeof knownSkills>;

/** The library: whatever fits the chosen part of the chosen slot. */
function Library(props: {
  target: Target;
  known: Known;
  weapon: WeaponDefinition;
  slotSkill: string | null | undefined;
  mods: readonly SlotModifier[];
  cond: string | null;
  unlocks: ReturnType<typeof battlePlanUnlocks>;
  onSkill: (id: string | null) => void;
  onMod: (id: SlotModifier | null) => void;
  onCond: (id: string | null) => void;
}) {
  const { target, unlocks } = props;
  const title =
    target.part === "skill"
      ? "Skills"
      : target.part === "mod"
        ? "Modifiers"
        : target.row === "rotation"
          ? "Only if"
          : "When";
  const tiles: {
    id: string | null;
    name: string;
    text: string;
    icon: IconName;
    tint?: string;
    /** A skill: drawn with its painted icon, its Heat cost and kind under the name. */
    skill?: string;
    def?: SkillDefinition;
    on: boolean;
    blocked?: boolean;
    drag?: string;
  }[] =
    target.part === "skill"
      ? [
          ...props.known.map((k) => ({
            id: k.skill.id,
            name: `${k.skill.name} · Lv ${k.level}`,
            text: skillText(k.skill, props.weapon),
            icon: skillIcon(k.skill.id),
            tint: skillTint(k.skill.id),
            skill: k.skill.id,
            def: k.skill,
            on: props.slotSkill === k.skill.id,
            drag: k.skill.id,
          })),
          ...(target.row !== "rotation" && props.slotSkill
            ? [{ id: null, name: "Empty", text: "", icon: "close" as IconName, on: false }]
            : []),
        ]
      : target.part === "mod"
        ? [
            ...SLOT_MODIFIERS.map((m) => ({
              id: m.id,
              name: m.name,
              text: m.text,
              icon: MOD_ICON[m.id],
              on: props.mods[target.socket] === m.id,
              blocked:
                !modifierAllowed(m.id, unlocks) ||
                (props.mods.includes(m.id) && props.mods[target.socket] !== m.id),
            })),
            ...(props.mods[target.socket]
              ? [{ id: null, name: "Empty", text: "", icon: "close" as IconName, on: false }]
              : []),
          ]
        : target.row === "rotation"
          ? [
              { id: null, name: "Always", text: "", icon: "check" as IconName, on: !props.cond },
              ...SLOT_CONDITIONS.map((c) => ({
                id: c.id,
                name: c.name,
                text: "",
                icon: CONDITION_ICON[c.id] ?? ("eye" as IconName),
                on: props.cond === c.id,
              })),
            ]
          : REACTION_CONDITIONS.map((c) => ({
              id: c.id,
              name: c.name,
              text: "",
              icon: CONDITION_ICON[c.id] ?? ("eye" as IconName),
              on: props.cond === c.id,
              blocked: !reactionConditionAllowed(c.id, unlocks) && props.cond !== c.id,
            }));

  return (
    <section className="panel-card plan-library" aria-label={title}>
      <span className="title-font section-title">{title}</span>
      <ul className="library-tiles">
        {tiles.map((t) => (
          <li key={t.id ?? "none"}>
            <button
              type="button"
              className={`library-tile${t.on ? " on" : ""}`}
              aria-pressed={t.on}
              disabled={t.blocked}
              draggable={!!t.drag}
              onDragStart={(e) => {
                if (!t.drag) return;
                e.dataTransfer.setData(SKILL_DRAG, t.drag);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => {
                if (target.part === "skill") props.onSkill(t.id);
                else if (target.part === "mod") props.onMod(t.id as SlotModifier | null);
                else props.onCond(t.id);
              }}
            >
              <span
                className={`skill-chip${t.tint ? "" : " plain"}`}
                style={t.tint ? { background: t.tint } : undefined}
              >
                {t.skill ? (
                  <SkillIcon skillId={t.skill} size={20} />
                ) : (
                  <Icon name={t.icon} size={20} {...(t.tint ? { color: "#fff6e4" } : {})} />
                )}
              </span>
              <span className="known-text">
                <span className="title-font">{t.name}</span>
                {t.def && <SkillMeta skill={t.def} weaponType={props.weapon.damageType} />}
                {t.text && <span className="sub small">{t.text}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Capstones(props: {
  state: GameState;
  echoSlot: number;
  onPick: (c: { id: (typeof CAPSTONES)[number]["id"]; slot: number }) => void;
}) {
  const plan = props.state.hero.plan;
  const cost = plan.capstone ? capstoneChangeAcorns(props.state.legacy.prestige) : 0;
  return (
    <section className="panel-card capstones" aria-label="Capstone">
      <div className="section-row">
        <span className="title-font section-title">Capstone</span>
        {cost > 0 && <Price id="acorns" amount={cost} />}
      </div>
      <ul>
        {CAPSTONES.map((c) => {
          const on = plan.capstone?.id === c.id;
          const slot = c.id === "echo" ? props.echoSlot : (plan.capstone?.slot ?? 0);
          const blocked = !on && plan.capstone !== null && props.state.wallet.acorns < cost;
          return (
            <li key={c.id}>
              <CapstoneTile
                name={
                  c.id === "echo" && on
                    ? `${c.name} · Slot ${(plan.capstone?.slot ?? 0) + 1}`
                    : c.name
                }
                text={c.text}
                on={on}
                disabled={blocked || (on && c.id !== "echo")}
                onClick={() => props.onPick({ id: c.id, slot })}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CapstoneTile(props: {
  name: string;
  text: string;
  on: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const hover = useNoteHover({ name: props.name, kind: "Capstone", explain: props.text });
  return (
    <button
      type="button"
      className={`capstone ${props.on ? "on" : ""}`}
      aria-pressed={props.on}
      disabled={props.disabled}
      onClick={props.onClick}
      {...hover}
    >
      <span className="title-font">{props.name}</span>
    </button>
  );
}
