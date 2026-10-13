import {
  type ActData,
  applyAction,
  armorReduction,
  ATTRIBUTE_RULES,
  ATTRIBUTES,
  type Attributes,
  BOON_GRADES,
  type BoonPick,
  type CombatantSetup,
  type DamageType,
  deriveStats,
  draughtsOpen,
  type EnemyDefinition,
  equipBlockReason,
  Fight,
  type GameData,
  type GameState,
  heroBoons,
  heroSetup,
  type Item,
  masteryPointsLeft,
  openBranches,
  targetSlot,
} from "@emberheir/sim";
import { type BuildPlan, masteryOrder } from "./builds";

/** The autopilot's choices outside the Skill Tree: gear, Boons, Draughts, attributes, Mastery. */

/** Attribute points per level for each weapon. */
const ATTRIBUTE_PLAN: Record<string, (keyof Attributes)[]> = {
  sword: ["strength", "agility", "vitality"],
  "fire-wand": ["intelligence", "wisdom", "vitality"],
  axe: ["strength", "vitality", "wisdom"],
  dagger: ["dexterity", "agility", "vitality"],
  mace: ["strength", "vitality", "agility"],
  staff: ["intelligence", "wisdom", "vitality"],
  bow: ["dexterity", "agility", "vitality"],
  crossbow: ["strength", "dexterity", "vitality"],
};

/** Seconds the autopilot spends hitting a training dummy to judge a piece of gear. */
const DUMMY_SECONDS = 30;

/**
 * Damage per second of the hero against a training dummy that never hits back: the build's own
 * rotation, ailments and triggers all count, so Ailment Duration matters to a Warlock just as
 * Crit matters to a Marksman.
 */
function dummyDps(setup: CombatantSetup): number {
  const dummy: CombatantSetup = {
    name: "Training Dummy",
    level: setup.level,
    attributes: { strength: 0, dexterity: 0, agility: 0, intelligence: 0, wisdom: 0, vitality: 0 },
    weapon: { ...setup.weapon, attacksPerSecond: 0, triggers: [], ailmentChances: [] },
    rotation: [],
    baseLife: 1e9,
  };
  const fight = new Fight({ ...setup, lifeFraction: 1 }, dummy, 1);
  fight.advance(DUMMY_SECONDS);
  const enemy = fight.snapshot().enemy;
  return Math.max(1, (enemy.maxLife - enemy.life) / DUMMY_SECONDS);
}

/** Share of the incoming damage by type: Physical and the four elements, summing to 1. */
export type DamageProfile = Readonly<Record<DamageType, number>>;

const EVEN_PROFILE: DamageProfile = {
  physical: 0.5,
  fire: 0.125,
  cold: 0.125,
  lightning: 0.125,
  void: 0.125,
};

/** Damage types an enemy deals: its weapon, its skills and its telegraphs, one vote each. */
function enemyProfile(enemy: EnemyDefinition): Record<DamageType, number> {
  const votes: Record<DamageType, number> = {
    physical: 0,
    fire: 0,
    cold: 0,
    lightning: 0,
    void: 0,
  };
  // The Default Attack lands most of the damage over a fight.
  votes[enemy.weapon.damageType] += 4;
  const skills = [...enemy.skills, ...(enemy.telegraphs ?? []).map((t) => t.skill)];
  for (const skill of skills) {
    for (const hit of skill.hits) {
      votes[hit.kind === "spell" ? hit.damageType : (hit.damageType ?? enemy.weapon.damageType)]++;
    }
  }
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(votes) as DamageType[]) votes[key] /= total;
  return votes;
}

/**
 * What an act throws at the hero: half its enemies, half its boss. Like a player reading the
 * Scout's report, the autopilot gears and brews for it.
 */
export function actProfile(act: ActData): DamageProfile {
  const out: Record<DamageType, number> = { physical: 0, fire: 0, cold: 0, lightning: 0, void: 0 };
  const boss = enemyProfile(act.boss);
  for (const enemy of act.enemies) {
    const p = enemyProfile(enemy);
    for (const key of Object.keys(out) as DamageType[]) {
      out[key] += (0.5 * p[key]) / act.enemies.length;
    }
  }
  for (const key of Object.keys(out) as DamageType[]) out[key] += 0.5 * boss[key];
  return out;
}

const PROFILES = new Map<string, DamageProfile>();

/** The damage mix of the act the hero is in (an even mix in the Camp and the finale). */
function runProfile(state: GameState, data: GameData): DamageProfile {
  const actId = state.run?.actId;
  const act = actId ? data.acts.find((a) => a.id === actId) : undefined;
  if (!act) return EVEN_PROFILE;
  let profile = PROFILES.get(act.id);
  if (!profile) {
    profile = actProfile(act);
    PROFILES.set(act.id, profile);
  }
  return profile;
}

/**
 * How good the hero is with this gear: measured damage per second times effective Life against
 * the coming act's damage mix (an even Physical/magic mix when unknown). Like a player, the
 * autopilot builds up what its build lives on and fills its weakest spot.
 */
function gearValue(
  state: GameState,
  data: GameData,
  profile: DamageProfile = runProfile(state, data),
): number {
  const setup = heroSetup(state, data).setup;
  const st = deriveStats(setup);
  const dps = dummyDps(setup);
  const physTaken =
    (1 - armorReduction(st.armor, setup.level)) * (1 - st.blockReduction * st.blockChance);
  const magic =
    profile.fire * (1 - st.fireResistance) +
    profile.cold * (1 - st.coldResistance) +
    profile.lightning * (1 - st.lightningResistance) +
    profile.void * (1 - st.voidResistance);
  // Tenacity shortens the ailments that ramp up on the hero (Corruption, Poison stacks).
  const taken =
    (profile.physical * physTaken + magic) * (1 - 0.6 * st.evasion) * (1 - 0.3 * st.tenacity);
  // Lifesteal heals back part of the damage dealt over a fight of about 20 s.
  const effectiveLife = (st.maxLife + st.barrier) / taken + st.lifesteal * dps * 20;
  return Math.log(dps) + Math.log(effectiveLife);
}

/**
 * The Draught for the coming trip: the one that adds the most effective Life against the act's
 * damage mix (balance-grundlagen-v1.md F).
 */
export function brewDraught(state: GameState, data: GameData, act: ActData | undefined): GameState {
  if (!draughtsOpen(state, data) || !act) return state;
  const profile = actProfile(act);
  const tryWith = (id: string | undefined): number =>
    gearValue(
      {
        ...state,
        draught: id ?? null,
        // heroSetup reads the brewed Draught from the run; a stand-in run is enough here.
        run: id ? ({ draught: id, lifeFraction: 1 } as unknown as GameState["run"]) : null,
      } as GameState,
      data,
      profile,
    );
  let best: string | null = null;
  let bestValue = tryWith(undefined);
  for (const d of data.draughts ?? []) {
    const value = tryWith(d.id);
    if (value > bestValue + 1e-9) {
      best = d.id;
      bestValue = value;
    }
  }
  return state.draught === best
    ? state
    : applyAction(state, data, { type: "chooseDraught", draughtId: best });
}

/** Value gained by wearing `item` in its slot instead of what is there now. */
function upgradeGain(state: GameState, data: GameData, item: Item): number {
  const slot = targetSlot(item, data, state.hero.equipment);
  if (!slot) return 0;
  const tried: GameState = {
    ...state,
    hero: { ...state.hero, equipment: { ...state.hero.equipment, [slot]: item } },
  };
  return gearValue(tried, data) - gearValue(state, data);
}

/** Boon choice: a family that fits the weapon (or Hearth) first, then rank-ups, then the grade. */
export function bestBoon(state: GameState, data: GameData, offer: readonly BoonPick[]): number {
  const damageType = heroSetup(state, data).setup.weapon.damageType;
  const owned = new Set(heroBoons(state, data).map((b) => b.def.id));
  const value = (pick: BoonPick) => {
    const def = data.boons?.find((b) => b.id === pick.id);
    const family = data.boonFamilies?.find((f) => f.id === def?.family);
    const fits =
      !family || family.damageTypes.length === 0 || family.damageTypes.includes(damageType);
    return (fits ? 10 : 0) + (owned.has(pick.id) ? 3 : 0) + BOON_GRADES.indexOf(pick.grade);
  };
  let best = 0;
  offer.forEach((pick, i) => {
    if (value(pick) > value(offer[best] ?? pick)) best = i;
  });
  return best;
}

export function autopilotRewards(state: GameState, data: GameData): GameState {
  let s = state;
  const rewards = s.run?.rewards;
  if (!rewards) return s;
  // Boss Hoard: up to `picks` cards, the best upgrade each time.
  while (s.run?.rewards && !s.run.rewards.itemPick) {
    const taken = new Set((s.run.rewards.taken ?? []).map((t) => t.index));
    let best = -1;
    let bestGain = 0;
    rewards.items.forEach((item, i) => {
      if (taken.has(i) || equipBlockReason(s, data, item, "pick")) return;
      const gain = upgradeGain(s, data, item);
      if (gain > bestGain + 1e-6) {
        best = i;
        bestGain = gain;
      }
    });
    s =
      best >= 0
        ? applyAction(s, data, { type: "pickItem", index: best, mode: "equip" })
        : applyAction(s, data, { type: "salvageAll" });
  }
  // Old items are never needed again by the autopilot: Thoric salvages them in the Camp, so on
  // the road they wait in the inventory (thrown away only to make room).
  for (const placed of s.inventory.slice(0, Math.max(0, s.inventory.length - 4))) {
    s = applyAction(s, data, { type: "discard", itemId: placed.item.id });
  }
  const offer = s.run?.rewards?.boonOffer;
  if (offer?.length)
    s = applyAction(s, data, { type: "pickBoon", index: bestBoon(s, data, offer) });
  return applyAction(s, data, { type: "continue" });
}

/**
 * Spends each point where it helps this hero most (same measure as for gear: damage on the
 * training dummy times effective Life), so a caster facing Corruption raises Vitality like a
 * player would. Ties go to the weapon's plan.
 */
export function spendPoints(state: GameState, data: GameData, weaponId: string): GameState {
  const plan = [...(ATTRIBUTE_PLAN[weaponId] ?? []), ...ATTRIBUTES];
  const order = plan.filter((a, i) => plan.indexOf(a) === i);
  let s = state;
  while (s.hero.unspentAttributePoints > 0) {
    let best: GameState | null = null;
    let bestValue = -Infinity;
    for (const attribute of order) {
      if (s.hero.attributes[attribute] >= ATTRIBUTE_RULES.max) continue;
      const next = applyAction(s, data, { type: "allocateAttributes", points: { [attribute]: 1 } });
      const value = gearValue(next, data);
      if (value > bestValue + 1e-6) {
        best = next;
        bestValue = value;
      }
    }
    if (!best) break;
    s = best;
  }
  return s;
}

/** Kaelen: learns Weapon Mastery along the plan and wears the strongest Echo. */
export function spendMastery(state: GameState, data: GameData): GameState {
  let s = state;
  const order = masteryOrder(data, s.hero.weaponId);
  for (let guard = 0; guard < 64 && masteryPointsLeft(s, data) > 0; guard++) {
    let learned = false;
    const counts = new Map<string, number>();
    for (const id of order) {
      const want = (counts.get(id) ?? 0) + 1;
      counts.set(id, want);
      const tree = data.weaponMastery[s.hero.weaponId];
      if (!tree) break;
      const node = tree.nodes.find((n) => n.id === id);
      const have = node?.group
        ? s.hero.mastery.choices[node.group] === id
          ? 1
          : 0
        : (s.hero.mastery.learned[id] ?? 0);
      if (have >= want) continue;
      try {
        s = applyAction(s, data, { type: "learnMastery", nodeId: id });
        learned = true;
        break;
      } catch {
        // Not yet (Rank, Keystone ring): try the next step.
      }
    }
    if (!learned) break;
  }
  const echoes = Object.entries(s.legacy.echoes).sort((a, b) => b[1].stage - a[1].stage);
  const best = echoes[0]?.[0];
  if (best && s.hero.mastery.echo !== best) {
    s = applyAction(s, data, { type: "setEcho", echoId: best });
  }
  return s;
}

/**
 * Prestiges with the first new branch the weapon's tree plan prefers; once all of them are owned,
 * deepens them in plan order. All items stay.
 */
export function autopilotPrestige(
  state: GameState,
  data: GameData,
  build: BuildPlan | undefined,
): GameState {
  const open = openBranches(state, data).map((b) => b.id);
  const plan = build?.branches ?? [];
  const preferred =
    plan.find((b) => open.includes(b) && !state.legacy.branches.includes(b)) ??
    plan.find((b) => open.includes(b)) ??
    open[0];
  const s = applyAction(state, data, {
    type: "prestige",
    ...(preferred ? { branchId: preferred } : {}),
  });
  return applyAction(s, data, { type: "dismissNotice" });
}
